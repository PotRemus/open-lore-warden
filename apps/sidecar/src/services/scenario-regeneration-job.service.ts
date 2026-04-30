import { randomUUID } from 'node:crypto'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { CampaignImportResult, ScenarioRegenerationJob } from '@open-lore-warden/domain'
import { config } from '@/config/index'
import type { CampaignStructure } from '@/services/scenario-classifier.service'
import { serializeCampaignWrite } from '@/services/campaign-file-lock.service'
import { generateScenario } from '@/services/scenario-enricher.service'
import type { PageSection } from '@/services/pdf-extractor.service'

type ClassifiedPagesArtifact = {
  rawPages: PageSection[]
}

type ClassifiedStructureArtifact = {
  structure: CampaignStructure
}

type CreateRegenerationJobResult =
  | { ok: true; job: ScenarioRegenerationJob }
  | { ok: false; existingJob: ScenarioRegenerationJob }

const jobs = new Map<string, ScenarioRegenerationJob>()
const activeJobByImportId = new Map<string, string>()

function isRunning(status: ScenarioRegenerationJob['status']): boolean {
  return status !== 'done' && status !== 'error'
}

function updateJob(id: string, updates: Partial<Omit<ScenarioRegenerationJob, 'id'>>): void {
  const existing = jobs.get(id)
  if (existing) jobs.set(id, { ...existing, ...updates })
}

function readImportResult(importId: string): CampaignImportResult | null {
  const campaignPath = join(config.DATA_DIR, 'scenario-imports', importId, 'campaign.json')

  try {
    const raw = readFileSync(campaignPath, 'utf-8')
    return JSON.parse(raw) as CampaignImportResult
  } catch {
    return null
  }
}

function resolveClassifiedArtifactPaths(
  importId: string,
): { pagesPath: string; structurePath: string } | null {
  const classifiedDir = join(config.DATA_DIR, 'scenario-imports', importId, 'debug', 'classified')

  let names: string[]
  try {
    names = readdirSync(classifiedDir) as string[]
  } catch {
    return null
  }

  const pageSuffix = '.pages.json'
  const structureSuffix = '.structure.json'

  const pageStems = new Set(
    names
      .filter((name) => name.endsWith(pageSuffix))
      .map((name) => name.slice(0, -pageSuffix.length)),
  )

  const commonStems = names
    .filter((name) => name.endsWith(structureSuffix))
    .map((name) => name.slice(0, -structureSuffix.length))
    .filter((stem) => pageStems.has(stem))
    .sort((a, b) => a.localeCompare(b))

  const stem = commonStems.at(-1)
  if (!stem) return null

  return {
    pagesPath: join(classifiedDir, `${stem}${pageSuffix}`),
    structurePath: join(classifiedDir, `${stem}${structureSuffix}`),
  }
}

function readClassifiedArtifacts(importId: string): { pages: PageSection[]; structure: CampaignStructure } | null {
  const paths = resolveClassifiedArtifactPaths(importId)
  if (!paths) return null

  try {
    const pagesRaw = readFileSync(paths.pagesPath, 'utf-8')
    const structureRaw = readFileSync(paths.structurePath, 'utf-8')

    const pagesData = JSON.parse(pagesRaw) as ClassifiedPagesArtifact
    const structureData = JSON.parse(structureRaw) as ClassifiedStructureArtifact

    if (!Array.isArray(pagesData.rawPages)) return null
    if (!structureData.structure || !Array.isArray(structureData.structure.scenarios)) return null

    return {
      pages: pagesData.rawPages,
      structure: structureData.structure,
    }
  } catch {
    return null
  }
}

export function createScenarioRegenerationJob(
  importId: string,
  scenarioId: string,
): CreateRegenerationJobResult {
  const activeJobId = activeJobByImportId.get(importId)

  if (activeJobId) {
    const active = jobs.get(activeJobId)
    if (active && isRunning(active.status)) {
      return { ok: false, existingJob: active }
    }
    activeJobByImportId.delete(importId)
  }

  const job: ScenarioRegenerationJob = {
    id: randomUUID(),
    importId,
    scenarioId,
    status: 'pending',
    progress: { current: 0, total: 3 },
    startedAt: new Date().toISOString(),
  }

  jobs.set(job.id, job)
  activeJobByImportId.set(importId, job.id)

  return { ok: true, job }
}

export function getScenarioRegenerationJob(jobId: string): ScenarioRegenerationJob | undefined {
  return jobs.get(jobId)
}

export async function runScenarioRegenerationPipeline(jobId: string): Promise<void> {
  const job = jobs.get(jobId)
  if (!job) return

  try {
    const resultPath = join(config.DATA_DIR, 'scenario-imports', job.importId, 'campaign.json')

    updateJob(job.id, {
      status: 'loading_artifacts',
      progress: { current: 0, total: 3 },
    })

    const campaign = readImportResult(job.importId)
    if (!campaign) {
      throw new Error(`Import introuvable : ${job.importId}`)
    }

    const scenarioIndex = campaign.scenarios.findIndex((scenario) => scenario.id === job.scenarioId)
    if (scenarioIndex < 0) {
      throw new Error(`Scénario introuvable : ${job.scenarioId}`)
    }

    const artifacts = readClassifiedArtifacts(job.importId)
    if (!artifacts) {
      throw new Error(
        'Artefacts de classification introuvables ou invalides. Impossible de relancer ce scénario.',
      )
    }

    const scenarioStructure = artifacts.structure.scenarios[scenarioIndex]
    if (!scenarioStructure) {
      throw new Error(
        'La structure classifiée ne correspond plus au campaign.json actuel pour ce scénario.',
      )
    }

    updateJob(job.id, {
      status: 'generating_scenario',
      progress: { current: 1, total: 3 },
    })

    const regenerated = await generateScenario(
      scenarioStructure,
      artifacts.pages,
      campaign.gameSystem?.name ?? null,
    )

    const updatedScenario = {
      ...regenerated,
      id: job.scenarioId,
    }

    updateJob(job.id, {
      status: 'writing_campaign',
      progress: { current: 2, total: 3 },
    })

    await serializeCampaignWrite(job.importId, async () => {
      const freshCampaign = readImportResult(job.importId)
      if (!freshCampaign) {
        throw new Error(`Import introuvable : ${job.importId}`)
      }

      const freshScenarioIndex = freshCampaign.scenarios.findIndex(
        (scenario) => scenario.id === job.scenarioId,
      )
      if (freshScenarioIndex < 0) {
        throw new Error(`Scénario introuvable : ${job.scenarioId}`)
      }

      const updatedCampaign: CampaignImportResult = {
        ...freshCampaign,
        scenarios: freshCampaign.scenarios.map((scenario, idx) =>
          idx === freshScenarioIndex ? updatedScenario : scenario,
        ),
      }

      writeFileSync(resultPath, JSON.stringify(updatedCampaign, null, 2), 'utf-8')
    })

    updateJob(job.id, {
      status: 'done',
      progress: { current: 3, total: 3 },
      finishedAt: new Date().toISOString(),
      resultPath,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    updateJob(job.id, {
      status: 'error',
      error: message,
      finishedAt: new Date().toISOString(),
    })
  } finally {
    // const activeJobId = activeJobByImportId.get(job.importId)
    // if (activeJobId === job.id) {
    //   activeJobByImportId.delete(job.importId)
    // }
  }
}
