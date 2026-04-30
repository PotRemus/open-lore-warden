import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { scenarioEnricherAgent } from '@/mastra/agents/scenario-enricher.agent'
import type { PageSection } from '@/services/pdf-extractor.service'
import type { CampaignStructure, ScenarioStructure } from '@/services/scenario-classifier.service'
import { getPagesText } from '@/services/scenario-classifier.service'
import type {
  ImportLocation as Location,
  ImportNpcProfile as NpcProfile,
  ImportChapter as Chapter,
  ScenarioResult as Scenario,
  CampaignImportResult,
} from '@open-lore-warden/domain'

export type { Location, NpcProfile, Chapter, Scenario, CampaignImportResult }

// ---------------------------------------------------------------------------
// Schémas Zod pour les sorties LLM
// ---------------------------------------------------------------------------

const CampaignHeaderLlmSchema = z.object({
  title: z.string(),
  summary: z.string(),
  description: z.string(),
  gmInstructions: z.string(),
  genre: z.string(),
  theme: z.string(),
  gameSystem: z
    .object({ name: z.string(), edition: z.string().optional() })
    .nullable()
    .optional(),
})

const LocationLlmSchema = z.object({
  name: z.string(),
  description: z.string(),
  imagePrompt: z.string(),
})

const NpcLlmSchema = z.object({
  name: z.string(),
  role: z.string(),
  description: z.string(),
  stats: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  imagePrompt: z.string(),
})

const ChapterLlmSchema = z.object({
  title: z.string(),
  summary: z.string(),
  content: z.string(),
  gmInstructions: z.string(),
  linkedLocationNames: z.array(z.string()).default([]),
  linkedNpcNames: z.array(z.string()).default([]),
})

const ScenarioLlmOutputSchema = z.object({
  title: z.string(),
  summary: z.string(),
  description: z.string(),
  gmInstructions: z.string(),
  locations: z.array(LocationLlmSchema).default([]),
  npcs: z.array(NpcLlmSchema).default([]),
  chapters: z.array(ChapterLlmSchema).default([]),
})

// ---------------------------------------------------------------------------
// Construction des prompts
// ---------------------------------------------------------------------------

function buildCampaignHeaderPrompt(pageText: string, gameSystem: string | null): string {
  return `
Système de jeu : ${gameSystem ?? 'inconnu (déduire du contenu)'}

Tu lis les pages d'introduction d'une campagne de jeu de rôle.
Génère un objet structuré décrivant la campagne globale.
Réécris le contenu proprement — ne copie pas le texte brut tel quel.

Extrais également les deux champs suivants pour guider la génération d'illustrations :
- genre : le type d'univers visuel (ex : "fantasy médiéval", "science-fiction", "horreur lovecraftienne", "steampunk", "western")
- theme : le thème narratif dominant (ex : "vengeance et rédemption", "mystère et corruption", "survie désespérée", "exploration et découverte")

=== TEXTE SOURCE ===
${pageText.slice(0, 15000)}
`.trim()
}

function buildScenarioPrompt(
  scenarioStruct: ScenarioStructure,
  sections: PageSection[],
  gameSystem: string | null,
): string {
  const get = (pages: number[]) => getPagesText(sections, pages)

  const blocks: string[] = [
    `Système de jeu : ${gameSystem ?? 'inconnu (déduire du contenu)'}`,
    '',
    'Tu lis un scénario complet de jeu de rôle.',
    'Génère un objet structuré avec titre, synopsis, description, instructions MJ, lieux, personnages et chapitres.',
    'Réécris chaque champ proprement à partir du source — ne copie pas le texte brut.',
    '',
  ]

  if (scenarioStruct.headerPages.length > 0) {
    blocks.push('=== TITRE ET SYNOPSIS ===')
    blocks.push(get(scenarioStruct.headerPages))
    blocks.push('')
  }
  if (scenarioStruct.gmPages.length > 0) {
    blocks.push('=== INSTRUCTIONS MJ DU SCÉNARIO ===')
    blocks.push(get(scenarioStruct.gmPages))
    blocks.push('')
  }
  if (scenarioStruct.introPages.length > 0) {
    blocks.push('=== INTRODUCTION ===')
    blocks.push(get(scenarioStruct.introPages))
    blocks.push('')
  }
  if (scenarioStruct.locationPages.length > 0) {
    blocks.push('=== LIEUX ===')
    blocks.push(get(scenarioStruct.locationPages))
    blocks.push('')
  }
  if (scenarioStruct.npcPages.length > 0) {
    blocks.push('=== PERSONNAGES ===')
    blocks.push(get(scenarioStruct.npcPages))
    blocks.push('')
  }

  for (const chapter of scenarioStruct.chapters) {
    const chapterTitle = chapter.title ?? 'Chapitre sans titre'
    blocks.push(`=== CHAPITRE : ${chapterTitle} ===`)
    if (chapter.contentPages.length > 0) {
      blocks.push(get(chapter.contentPages))
    }
    if (chapter.gmPages.length > 0) {
      blocks.push('--- Notes MJ ---')
      blocks.push(get(chapter.gmPages))
    }
    blocks.push('')
  }

  if (scenarioStruct.conclusionPages.length > 0) {
    blocks.push('=== CONCLUSION ===')
    blocks.push(get(scenarioStruct.conclusionPages))
    blocks.push('')
  }

  return blocks.join('\n').slice(0, 40000)
}

// ---------------------------------------------------------------------------
// Utilitaire — résolution des noms vers les IDs
// ---------------------------------------------------------------------------

function resolveIds(
  names: string[],
  items: Array<{ id: string; name: string }>,
): string[] {
  const lookup = new Map(items.map((item) => [item.name.toLowerCase().trim(), item.id]))
  return names
    .map((n) => lookup.get(n.toLowerCase().trim()))
    .filter((id): id is string => id !== undefined)
}

// ---------------------------------------------------------------------------
// Génération du header de campagne (Passe 2 — appel 1)
// ---------------------------------------------------------------------------

export async function generateCampaignHeader(
  sections: PageSection[],
  campaignStruct: Pick<CampaignStructure, 'introPages' | 'gmPages'>,
  gameSystem: string | null,
): Promise<Omit<CampaignImportResult, 'importId' | 'sourceFilename' | 'generatedAt' | 'scenarios'>> {
  const allPages = [...campaignStruct.introPages, ...campaignStruct.gmPages]
  const pageText =
    allPages.length > 0
      ? getPagesText(sections, allPages)
      : "(aucune page d'introduction détectée dans le PDF)"

  const prompt = buildCampaignHeaderPrompt(pageText, gameSystem)

  const result = await scenarioEnricherAgent.generate(prompt, {
    structuredOutput: { schema: CampaignHeaderLlmSchema },
  })

  const raw = CampaignHeaderLlmSchema.parse(result.object)

  return {
    title: raw.title,
    summary: raw.summary,
    description: raw.description,
    gmInstructions: raw.gmInstructions,
    genre: raw.genre,
    theme: raw.theme,
    gameSystem: raw.gameSystem ?? null,
  }
}

// ---------------------------------------------------------------------------
// Génération d'un scénario complet (Passe 2 — 1 appel par scénario)
// ---------------------------------------------------------------------------

export async function generateScenario(
  scenarioStruct: ScenarioStructure,
  sections: PageSection[],
  gameSystem: string | null,
): Promise<Scenario> {
  const prompt = buildScenarioPrompt(scenarioStruct, sections, gameSystem)

  const result = await scenarioEnricherAgent.generate(prompt, {
    structuredOutput: { schema: ScenarioLlmOutputSchema },
  })

  const raw = ScenarioLlmOutputSchema.parse(result.object)

  // Assignation des IDs — les lieux et PNJ d'abord (les chapitres les référencent)
  const locations: Location[] = raw.locations.map(({ name, description, imagePrompt }) => ({
    id: randomUUID(),
    name,
    description,
    imagePrompt,
  }))

  const npcs: NpcProfile[] = raw.npcs.map(({ name, role, description, stats, imagePrompt }) => ({
    id: randomUUID(),
    name,
    role,
    description,
    ...(stats ? { stats } : {}),
    imagePrompt,
  }))

  // Résolution des références noms → IDs + association des sourcePages
  const chapters: Chapter[] = raw.chapters.map((ch, i) => {
    const chapterStruct = scenarioStruct.chapters[i]
    return {
      id: randomUUID(),
      title: ch.title,
      summary: ch.summary,
      content: ch.content,
      gmInstructions: ch.gmInstructions,
      sourcePages: chapterStruct?.sourcePages ?? [],
      linkedLocationIds: resolveIds(ch.linkedLocationNames, locations),
      linkedNpcIds: resolveIds(ch.linkedNpcNames, npcs),
    }
  })

  return {
    id: randomUUID(),
    title: raw.title,
    summary: raw.summary,
    description: raw.description,
    gmInstructions: raw.gmInstructions,
    sourcePages: scenarioStruct.sourcePages,
    locations,
    npcs,
    chapters,
  }
}

// ---------------------------------------------------------------------------
// Persistance des artefacts intermédiaires (non bloquant)
// ---------------------------------------------------------------------------

export function persistGenerationArtifacts(stem: string, result: CampaignImportResult, importDir: string): void {
  try {
    const dir = join(importDir, 'debug', 'generated')
    mkdirSync(dir, { recursive: true })

    writeFileSync(
      join(dir, `${stem}.campaign.json`),
      JSON.stringify(result, null, 2),
      'utf-8',
    )
  } catch {
    // Non bloquant
  }
}
