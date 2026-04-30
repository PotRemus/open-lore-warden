import { z } from 'zod'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { scenarioClassifierAgent } from '@/mastra/agents/scenario-classifier.agent'
import type { PageSection } from '@/services/pdf-extractor.service'

// ---------------------------------------------------------------------------
// Types de blocs structurels — Passe 1
// ---------------------------------------------------------------------------

const STRUCTURE_PAGE_TYPES = [
  'campaign_intro',           // Introduction / description générale de la campagne
  'campaign_gm',              // Instructions MJ globales (toute la campagne)
  'campaign_scenario_summary',// Récapitulatif rapide des scénarios dans une intro MJ (style TdM)
  'scenario_header',          // Titre + synopsis d'un scénario → rupture de scénario
  'scenario_gm',              // Instructions MJ spécifiques au scénario
  'scenario_intro',           // Introduction du scénario
  'scenario_locations',       // Descriptions des lieux
  'scenario_npcs',            // Fiches personnages
  'chapter_header',           // Titre/intro d'un chapitre/scène → rupture de chapitre
  'chapter_content',          // Contenu d'un chapitre
  'chapter_gm',               // Notes MJ intégrées dans un chapitre
  'scenario_conclusion',      // Conclusion / épilogue du scénario
  'credits',                  // Crédits, licence, index (ignoré en Passe 2)
  'audio_tracks',             // Listes de pistes audio / ambiances sonores (ignoré en Passe 2)
  'unknown',
] as const

export type StructurePageType = (typeof STRUCTURE_PAGE_TYPES)[number]

// Un bloc détecté sur une page (une page peut en contenir plusieurs)
const StructureBlockSchema = z.object({
  type: z.enum(STRUCTURE_PAGE_TYPES),
  isNewScenario: z.boolean(),
  isNewChapter: z.boolean(),
  scenarioTitle: z.string().nullable(),
  chapterTitle: z.string().nullable(),
  shortSummary: z.string(),
})

// Sortie de l'agent pour UNE page
const StructurePageOutputSchema = z.object({
  blocks: z.array(StructureBlockSchema).min(1),
  confidence: z.number().min(0).max(1),
})

export type StructureBlock = z.infer<typeof StructureBlockSchema>
export type StructurePageOutput = z.infer<typeof StructurePageOutputSchema>

// Type enrichi utilisé en interne (blocs + métadonnées de page)
export type ClassifiedPage = {
  pageId: string
  page: number
  blocks: StructureBlock[]
  confidence: number
}

// ---------------------------------------------------------------------------
// Types de structure fusionnée (sortie du merge)
// ---------------------------------------------------------------------------

export type ChapterStructure = {
  title: string | null
  sourcePages: number[]
  contentPages: number[]
  gmPages: number[]
}

export type ScenarioStructure = {
  title: string | null
  sourcePages: number[]
  headerPages: number[]
  gmPages: number[]
  introPages: number[]
  locationPages: number[]
  npcPages: number[]
  conclusionPages: number[]
  chapters: ChapterStructure[]
}

export type CampaignStructure = {
  introPages: number[]
  gmPages: number[]
  scenarios: ScenarioStructure[]
}

// ---------------------------------------------------------------------------
// Fenêtre d'historique (nombre de pages précédentes transmises au LLM)
// ---------------------------------------------------------------------------

const CONTEXT_WINDOW = 3

// Un scénario doit avoir STRICTEMENT PLUS de MIN_SCENARIO_PAGES pages pour être valide.
// En dessous ou égal, il est considéré comme un scénario fantôme (aperçu dans une intro MJ).
const MIN_SCENARIO_PAGES = 2

// ---------------------------------------------------------------------------
// Contexte historique transmis au classifier — blocs des N pages précédentes
// ---------------------------------------------------------------------------

type PageHistoryEntry = {
  page: number
  blocks: Array<{
    type: StructurePageType
    scenarioTitle: string | null
    chapterTitle: string | null
    shortSummary: string
  }>
}

// ---------------------------------------------------------------------------
// Construction du prompt
// ---------------------------------------------------------------------------

function renderHistory(history: PageHistoryEntry[]): string {
  if (history.length === 0) return 'Aucune (première page du document)'
  return history
    .map((entry) => {
      const blockLines = entry.blocks
        .map(
          (b) =>
            `  [${b.type}] Scénario : ${b.scenarioTitle ?? '(aucun)'} | Chapitre : ${b.chapterTitle ?? '(aucun)'} — "${b.shortSummary}"`,
        )
        .join('\n')
      return `Page ${entry.page} :\n${blockLines}`
    })
    .join('\n\n')
}

function buildPrompt(
  current: PageSection,
  history: PageHistoryEntry[],
  next?: PageSection,
): string {
  return `
Historique des pages précédentes (de la plus ancienne à la plus récente) :
${renderHistory(history)}

Contenu de la page actuelle (page ${current.page}) :
${current.content.slice(0, 6000)}

Début de la page suivante (page ${next?.page ?? 'N/A'}) :
${next?.content.slice(0, 500) ?? 'Aucune (dernière page)'}

PAGE ID : ${current.id}
`.trim()
}

// ---------------------------------------------------------------------------
// Application des règles d'intégrité sur un bloc
// ---------------------------------------------------------------------------

function applyIntegrityRules(block: StructureBlock): StructureBlock {
  // campaign_scenario_summary et audio_tracks ne peuvent jamais déclencher de rupture
  if (block.type === 'campaign_scenario_summary' || block.type === 'audio_tracks') {
    return { ...block, isNewScenario: false, isNewChapter: false }
  }
  const isNewScenario = block.type === 'scenario_header' ? true : block.isNewScenario
  // isNewScenario et isNewChapter sont mutuellement exclusifs
  const isNewChapter = isNewScenario
    ? false
    : block.type === 'chapter_header'
      ? true
      : block.isNewChapter
  return { ...block, isNewScenario, isNewChapter }
}

// ---------------------------------------------------------------------------
// Classification d'une page (retourne N blocs)
// ---------------------------------------------------------------------------

export async function classifyPageBlocks(
  current: PageSection,
  history: PageHistoryEntry[],
  next?: PageSection,
): Promise<ClassifiedPage> {
  const prompt = buildPrompt(current, history, next)

  const result = await scenarioClassifierAgent.generate(prompt, {
    structuredOutput: { schema: StructurePageOutputSchema },
  })

  const raw = StructurePageOutputSchema.parse(result.object)

  return {
    pageId: current.id,
    page: current.page,
    blocks: raw.blocks.map(applyIntegrityRules),
    confidence: raw.confidence,
  }
}

export async function classifyAllStructurePages(
  pages: PageSection[],
  onProgress?: (current: number, total: number) => void,
): Promise<ClassifiedPage[]> {
  const results: ClassifiedPage[] = []

  for (let i = 0; i < pages.length; i++) {
    const current = pages[i]
    const next = i < pages.length - 1 ? pages[i + 1] : undefined

    // Historique des CONTEXT_WINDOW pages précédentes (sans le texte brut)
    const history: PageHistoryEntry[] = results
      .slice(Math.max(0, i - CONTEXT_WINDOW), i)
      .map((p) => ({
        page: p.page,
        blocks: p.blocks.map(({ type, scenarioTitle, chapterTitle, shortSummary }) => ({
          type,
          scenarioTitle,
          chapterTitle,
          shortSummary,
        })),
      }))

    const classified = await classifyPageBlocks(current, history, next)
    results.push(classified)
    onProgress?.(i + 1, pages.length)
  }

  return results
}

// ---------------------------------------------------------------------------
// Fusion des blocs classifiés en structure campagne
// ---------------------------------------------------------------------------

function isScenarioBlock(type: StructurePageType): boolean {
  return ([
    'scenario_header', 'scenario_gm', 'scenario_intro',
    'scenario_locations', 'scenario_npcs', 'chapter_header',
    'chapter_content', 'chapter_gm', 'scenario_conclusion',
    // campaign_scenario_summary intentionnellement absent — ne crée jamais de scénario
  ] as StructurePageType[]).includes(type)
}

// Ajoute une page à une liste en évitant les doublons
function addPage(list: number[], page: number): void {
  if (!list.includes(page)) list.push(page)
}

export function mergeStructure(classified: ClassifiedPage[]): CampaignStructure {
  const campaign: CampaignStructure = {
    introPages: [],
    gmPages: [],
    scenarios: [],
  }

  for (const classifiedPage of classified) {
    const { page: pageNum, blocks } = classifiedPage

    for (const block of blocks) {
      const { type, isNewScenario, isNewChapter } = block

      // ── Rupture de scénario ──────────────────────────────────────────────
      if (isNewScenario || (campaign.scenarios.length === 0 && isScenarioBlock(type))) {
        campaign.scenarios.push({
          title: block.scenarioTitle,
          sourcePages: [],
          headerPages: [],
          gmPages: [],
          introPages: [],
          locationPages: [],
          npcPages: [],
          conclusionPages: [],
          chapters: [],
        })
      }

      // ── Blocs campagne (avant tout scénario) ─────────────────────────────
      if (campaign.scenarios.length === 0) {
        if (type === 'campaign_gm') {
          addPage(campaign.gmPages, pageNum)
        } else if (type !== 'credits' && type !== 'audio_tracks' && type !== 'unknown') {
          addPage(campaign.introPages, pageNum)
        }
        continue
      }

      const scenario = campaign.scenarios[campaign.scenarios.length - 1]
      addPage(scenario.sourcePages, pageNum)

      // ── Rupture de chapitre ──────────────────────────────────────────────
      if (isNewChapter || (type === 'chapter_content' && scenario.chapters.length === 0)) {
        scenario.chapters.push({
          title: block.chapterTitle,
          sourcePages: [],
          contentPages: [],
          gmPages: [],
        })
      }

      // ── Dispatch par type ────────────────────────────────────────────────
      switch (type) {
        case 'scenario_header':
          addPage(scenario.headerPages, pageNum)
          break
        case 'scenario_gm':
          addPage(scenario.gmPages, pageNum)
          break
        case 'scenario_intro':
          addPage(scenario.introPages, pageNum)
          break
        case 'scenario_locations':
          addPage(scenario.locationPages, pageNum)
          break
        case 'scenario_npcs':
          addPage(scenario.npcPages, pageNum)
          break
        case 'scenario_conclusion':
          addPage(scenario.conclusionPages, pageNum)
          break
        case 'chapter_header':
        case 'chapter_content': {
          const chapter = scenario.chapters.at(-1)
          if (chapter) {
            addPage(chapter.sourcePages, pageNum)
            addPage(chapter.contentPages, pageNum)
          }
          break
        }
        case 'chapter_gm': {
          const chapter = scenario.chapters.at(-1)
          if (chapter) {
            addPage(chapter.sourcePages, pageNum)
            addPage(chapter.gmPages, pageNum)
          }
          break
        }
        case 'campaign_intro':
          addPage(campaign.introPages, pageNum)
          break
        case 'campaign_gm':
        case 'campaign_scenario_summary':
          addPage(campaign.gmPages, pageNum)
          break
        // 'credits', 'audio_tracks', 'unknown' → ignorés
      }
    }
  }

  return filterPhantomScenarios(campaign)
}

// ---------------------------------------------------------------------------
// Filtrage des scénarios fantômes (filet de sécurité post-merge)
// ---------------------------------------------------------------------------

function filterPhantomScenarios(campaign: CampaignStructure): CampaignStructure {
  const validScenarios: ScenarioStructure[] = []
  const phantomPages: number[] = []

  for (const scenario of campaign.scenarios) {
    if (scenario.sourcePages.length > MIN_SCENARIO_PAGES) {
      validScenarios.push(scenario)
    } else {
      // Réabsorber les pages du fantôme dans les pages GM de la campagne
      for (const p of scenario.sourcePages) {
        if (!campaign.gmPages.includes(p) && !phantomPages.includes(p)) {
          phantomPages.push(p)
        }
      }
    }
  }

  const mergedGmPages = [...campaign.gmPages, ...phantomPages].sort((a, b) => a - b)

  return { ...campaign, gmPages: mergedGmPages, scenarios: validScenarios }
}

// ---------------------------------------------------------------------------
// Utilitaire — extraction du texte de pages spécifiques
// ---------------------------------------------------------------------------

export function getPagesText(sections: PageSection[], pageNumbers: number[]): string {
  if (pageNumbers.length === 0) return ''
  return sections
    .filter((s) => pageNumbers.includes(s.page))
    .map((s) => `[Page ${s.page}]\n${s.content}`)
    .join('\n\n')
}

// ---------------------------------------------------------------------------
// Persistance des artefacts intermédiaires (non bloquant)
// ---------------------------------------------------------------------------

export function persistStructureArtifacts(
  stem: string,
  rawPages: PageSection[],
  classified: ClassifiedPage[],
  structure: CampaignStructure,
  importDir: string,
): void {
  try {
    const dir = join(importDir, 'debug', 'classified')
    mkdirSync(dir, { recursive: true })

    writeFileSync(
      join(dir, `${stem}.pages.json`),
      JSON.stringify({ rawPages, classified }, null, 2),
      'utf-8',
    )
    writeFileSync(
      join(dir, `${stem}.structure.json`),
      JSON.stringify({ structure }, null, 2),
      'utf-8',
    )
  } catch {
    // Non bloquant
  }
}
