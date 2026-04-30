import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { generateImage } from '@open-lore-warden/llm-provider'
import type { EntityImageGenJob, ImageEntityType, CampaignImportResult, ImportLocation as Location, ImportNpcProfile as NpcProfile } from '@open-lore-warden/domain'
import { config } from '@/config/index'
import { serializeCampaignWrite } from '@/services/campaign-file-lock.service'

// ---------------------------------------------------------------------------
// Store en mémoire
// ---------------------------------------------------------------------------

const jobs = new Map<string, EntityImageGenJob>()

export function createEntityImageGenJob(importJobId: string, itemId: string): EntityImageGenJob {
  const job: EntityImageGenJob = {
    id: randomUUID(),
    importJobId,
    itemId,
    entityType: null,
    status: 'pending',
    startedAt: new Date().toISOString(),
  }
  jobs.set(job.id, job)
  return job
}

export function getEntityImageGenJob(id: string): EntityImageGenJob | undefined {
  return jobs.get(id)
}

function updateJob(id: string, updates: Partial<Omit<EntityImageGenJob, 'id'>>): void {
  const existing = jobs.get(id)
  if (existing) jobs.set(id, { ...existing, ...updates })
}

// ---------------------------------------------------------------------------
// Construction des prompts image
// ---------------------------------------------------------------------------

// /**
//  * Construit le contexte d'univers à partir du genre et du thème de la campagne.
//  * Ex : "fantasy médiéval, vengeance et rédemption"
//  */
// function universeContext(result: CampaignImportResult): string {
//   return `${[result.genre, result.theme].filter(Boolean).join(', ')}`
// }

/**
 * Construit le prompt et le negative prompt pour un PNJ en fonction de sa nature.
 * Si `npc.imagePrompt` est renseigné (imports récents), il est utilisé directement.
 * Sinon, fallback sur la construction dynamique par nature (rétrocompatibilité imports existants).
 * `nature` absent est traité comme "human".
 */
function buildNpcPrompt(
  npc: NpcProfile,
): { prompt: string; negativePrompt: string } {
  const prompt = `${npc.imagePrompt}, RPG game character, stylized but not cartoony, detailed armor, game concept art`
  const negativePrompt = 'realistic, photorealistic, ultra‑realistic, portrait, photograph, blurry, low quality, badly drawn hands, extra fingers, distorted face, cartoon, comic, anime'
  return { prompt: prompt, negativePrompt }
}

function buildLocationPrompt(
  location: Location,
): { prompt: string; negativePrompt: string } {
  const negativePrompt = 'realistic, photorealistic, ultra‑realistic, portrait, photograph, blurry, low quality, badly drawn hands, extra fingers, distorted face, cartoon, comic, anime'
  const prompt = `${location.imagePrompt}, RPG game environment, stylized but not cartoony, detailed, game concept art`
  
  return { prompt: prompt, negativePrompt }
}

// ---------------------------------------------------------------------------
// Recherche d'une entité par ID dans le JSON résultat
// ---------------------------------------------------------------------------

type FoundEntity =
  | { type: 'npc'; entity: NpcProfile; scenarioIdx: number; entityIdx: number }
  | { type: 'location'; entity: Location; scenarioIdx: number; entityIdx: number }

/**
 * Recherche un item par son `id` dans tous les scénarios du résultat d'import.
 * Cherche d'abord parmi les NPCs, puis parmi les lieux.
 * Retourne `undefined` si l'item est introuvable.
 */
function findEntityById(result: CampaignImportResult, itemId: string): FoundEntity | undefined {
  for (let si = 0; si < result.scenarios.length; si++) {
    const scenario = result.scenarios[si]

    const npcIdx = scenario.npcs.findIndex((n) => n.id === itemId)
    if (npcIdx !== -1) {
      return { type: 'npc', entity: scenario.npcs[npcIdx], scenarioIdx: si, entityIdx: npcIdx }
    }

    const locIdx = scenario.locations.findIndex((l) => l.id === itemId)
    if (locIdx !== -1) {
      return {
        type: 'location',
        entity: scenario.locations[locIdx],
        scenarioIdx: si,
        entityIdx: locIdx,
      }
    }
  }
  return undefined
}

// ---------------------------------------------------------------------------
// Pipeline asynchrone (génération par entité unique)
// ---------------------------------------------------------------------------

/**
 * Génère l'image d'une entité unique (PNJ ou lieu) identifiée par `itemId` dans
 * le JSON résultat d'un job d'import.
 *
 * - Le type de l'entité (npc / location) est résolu automatiquement.
 * - L'image est écrite dans `{DATA_DIR}/scenario-imports/{importJobId}/images/`.
 * - Le champ `imagePath` de l'entité est mis à jour dans le fichier résultat sur disque.
 */
export async function runEntityImageGenerationPipeline(
  genJobId: string,
  importJobId: string,
  resultPath: string,
  itemId: string,
): Promise<void> {
  // ── Lecture du JSON de résultat ───────────────────────────────────────────
  let result: CampaignImportResult
  try {
    const raw = readFileSync(resultPath, 'utf-8')
    result = JSON.parse(raw) as CampaignImportResult
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    updateJob(genJobId, {
      status: 'error',
      error: `Impossible de lire le fichier résultat : ${message}`,
      finishedAt: new Date().toISOString(),
    })
    return
  }

  // ── Recherche de l'entité ─────────────────────────────────────────────────
  const found = findEntityById(result, itemId)
  if (!found) {
    updateJob(genJobId, {
      status: 'error',
      error: `Aucune entité (PNJ ou lieu) avec l'id "${itemId}" dans le résultat d'import.`,
      finishedAt: new Date().toISOString(),
    })
    return
  }

  const entityType: ImageEntityType = found.type
  updateJob(genJobId, { status: 'generating', entityType })

  // ── Répertoire de sortie ──────────────────────────────────────────────────
  const imagesDir = join(config.DATA_DIR, 'scenario-imports', importJobId, 'images')
  mkdirSync(imagesDir, { recursive: true })

  // ── Génération de l'image ─────────────────────────────────────────────────
  // urlPath est résolu après la génération et réutilisé dans le verrou d'écriture.
  let urlPath: string
  try {
    const { prompt, negativePrompt } =
      found.type === 'npc'
        ? buildNpcPrompt(found.entity as NpcProfile)
        : buildLocationPrompt(found.entity as Location)

    const buffer = await generateImage({ prompt, negative_prompt: negativePrompt })

    const filename = `${found.type}-${itemId}.png`
    const filePath = join(imagesDir, filename)
    writeFileSync(filePath, buffer)

    // Chemin URL servi par GET /scenarios/imports/:importId/images/:filename
    urlPath = `/scenarios/imports/${importJobId}/images/${filename}`
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    updateJob(genJobId, {
      status: 'error',
      error: `Échec de la génération d'image pour ${found.type} "${itemId}" : ${message}`,
      finishedAt: new Date().toISOString(),
    })
    return
  }

  // ── Réécriture du JSON avec l'imagePath mis à jour ────────────────────────
  // Sérialisé par import pour éviter la race condition : plusieurs pipelines
  // peuvent générer en parallèle, mais un seul à la fois lit-modifie-écrit le JSON.
  // On relit le fichier à l'intérieur du verrou pour incorporer les mises à jour
  // des autres pipelines qui ont terminé entretemps.
  // L'image est également propagée à toutes les entités homonymes des autres scénarios
  // (même name pour les lieux, même name + role pour les PNJ).
  try {
    await serializeCampaignWrite(importJobId, async () => {
      const freshRaw = readFileSync(resultPath, 'utf-8')
      const fresh = JSON.parse(freshRaw) as CampaignImportResult

      for (const scenario of fresh.scenarios) {
        if (found.type === 'npc') {
          const ref = found.entity as NpcProfile
          for (const npc of scenario.npcs) {
            if (npc.name === ref.name) npc.imagePath = urlPath
          }
        } else {
          const ref = found.entity as Location
          for (const loc of scenario.locations) {
            if (loc.name === ref.name) loc.imagePath = urlPath
          }
        }
      }

      writeFileSync(resultPath, JSON.stringify(fresh, null, 2), 'utf-8')
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    updateJob(genJobId, {
      status: 'error',
      error: `Impossible de réécrire le fichier résultat : ${message}`,
      finishedAt: new Date().toISOString(),
    })
    return
  }

  updateJob(genJobId, {
    status: 'done',
    finishedAt: new Date().toISOString(),
  })
}
