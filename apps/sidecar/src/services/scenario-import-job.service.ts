import { randomUUID } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ImportJob as Job, ImportJobProgress as JobProgress, ImportJobStatus as JobStatus } from '@open-lore-warden/domain'
import { resolveGameSystemName } from '@open-lore-warden/rules-engine'
import { config } from '@/config/index'
import { extractPdfSections } from '@/services/pdf-extractor.service'
import {
  classifyAllStructurePages,
  mergeStructure,
  persistStructureArtifacts,
} from '@/services/scenario-classifier.service'
import {
  generateCampaignHeader,
  generateScenario,
  persistGenerationArtifacts,
} from '@/services/scenario-enricher.service'
import type { CampaignImportResult } from '@/services/scenario-enricher.service'

export type { Job, JobProgress, JobStatus, CampaignImportResult }

// ---------------------------------------------------------------------------
// Store de jobs en mémoire
// ---------------------------------------------------------------------------

const jobs = new Map<string, Job>()

export function createJob(filename: string, gameSystemId: string | null): Job {
  const job: Job = {
    id: randomUUID(),
    status: 'pending',
    filename,
    gameSystemId,
    startedAt: new Date().toISOString(),
  }
  jobs.set(job.id, job)
  return job
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id)
}

function updateJob(id: string, updates: Partial<Omit<Job, 'id'>>): void {
  const existing = jobs.get(id)
  if (existing) jobs.set(id, { ...existing, ...updates })
}

// ---------------------------------------------------------------------------
// Pipeline d'import asynchrone (fire-and-forget)
// ---------------------------------------------------------------------------

export async function runImportPipeline(
  jobId: string,
  tempPath: string,
  stem: string,
  filename: string,
  gameSystemId: string | null,
): Promise<void> {
  const gameSystemName = resolveGameSystemName(gameSystemId)
  const importDir = join(config.DATA_DIR, 'scenario-imports', jobId)

  try {
    // ── Phase 0 : extraction PDF ────────────────────────────────────────────
    updateJob(jobId, { status: 'extracting' })

    const extracted = await extractPdfSections(tempPath, stem, filename, importDir)
    // Le PDF est conservé dans debug/uploads/ — pas de suppression

    if (!extracted.ok) {
      const msg =
        extracted.error.kind === 'not_found'
          ? `Fichier introuvable : ${extracted.error.filePath}`
          : extracted.error.kind === 'invalid_extension'
            ? 'Extension de fichier invalide'
            : `Erreur de parsing PDF : ${extracted.error.cause.message}`
      updateJob(jobId, { status: 'error', error: msg, finishedAt: new Date().toISOString() })
      return
    }

    const { sections, coverImagePath: coverFsPath } = extracted

    // Conversion du chemin filesystem en chemin URL servi par le sidecar.
    // Le fichier cover.png est toujours écrit sous {importDir}/images/cover.png.
    const coverImagePath: string | undefined = coverFsPath
      ? `/scenarios/imports/${jobId}/images/cover.png`
      : undefined

    // ── Phase 1 : classification structure page par page ────────────────────
    updateJob(jobId, {
      status: 'classifying',
      progress: { current: 0, total: sections.length },
    })

    const classified = await classifyAllStructurePages(sections, (current, total) => {
      updateJob(jobId, { progress: { current, total } })
    })

    // ── Phase 2 : fusion en structure campagne ──────────────────────────────
    const campaignStructure = mergeStructure(classified)
    persistStructureArtifacts(stem, sections, classified, campaignStructure, importDir)

    // ── Phase 3 : génération du header de campagne ──────────────────────────
    updateJob(jobId, { status: 'generating_campaign' })
    const campaignHeader = await generateCampaignHeader(sections, campaignStructure, gameSystemName)

    // ── Phase 4 : génération de chaque scénario ─────────────────────────────
    const scenarios = []
    for (let i = 0; i < campaignStructure.scenarios.length; i++) {
      updateJob(jobId, {
        status: 'generating_scenario',
        progress: { current: i + 1, total: campaignStructure.scenarios.length },
      })
      const scenario = await generateScenario(
        campaignStructure.scenarios[i],
        sections,
        gameSystemName,
      )
      scenarios.push(scenario)
    }

    // ── Phase 5 : assemblage et persistance du résultat final ───────────────
    const result: CampaignImportResult = {
      ...campaignHeader,
      importId: jobId,
      sourceFilename: filename,
      generatedAt: new Date().toISOString(),
      coverImagePath,
      scenarios,
    }

    persistGenerationArtifacts(stem, result, importDir)

    mkdirSync(importDir, { recursive: true })
    const resultPath = join(importDir, 'campaign.json')
    writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf-8')

    updateJob(jobId, {
      status: 'done',
      finishedAt: new Date().toISOString(),
      resultPath,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    updateJob(jobId, {
      status: 'error',
      error: message,
      finishedAt: new Date().toISOString(),
    })
  }
}
