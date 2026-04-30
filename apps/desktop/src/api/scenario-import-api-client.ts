import type {
  ImportJob,
  ImportJobStatus,
  ImportJobProgress,
  ImportSummary,
  CampaignImportResult,
  EntityImageGenJob,
  ImageGenStatus,
  ScenarioRegenerationJob,
} from '@open-lore-warden/domain'
import type { PublicGameSystemDescriptor } from '@open-lore-warden/rules-engine'
import { getSidecarBaseUrl } from '@/stores/settings.store'

export type {
  ImportJob,
  ImportJobStatus,
  ImportJobProgress,
  ImportSummary,
  CampaignImportResult,
  EntityImageGenJob,
  ImageGenStatus,
  ScenarioRegenerationJob,
  PublicGameSystemDescriptor,
}

/** Retourne la liste des systèmes de jeu supportés. */
export async function fetchGameSystems(): Promise<PublicGameSystemDescriptor[]> {
  const res = await fetch(`${getSidecarBaseUrl()}/scenarios/game-systems`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data: { systems: PublicGameSystemDescriptor[] } = await res.json()
  return data.systems
}

/**
 * Démarre l'import asynchrone d'un scénario PDF.
 * Retourne immédiatement un `jobId` à utiliser pour suivre la progression.
 */
export async function importScenarioPdf(
  file: File,
  gameSystemId: string,
): Promise<{ jobId: string }> {
  const form = new FormData()
  form.append('file', file, file.name)
  form.append('gameSystemId', gameSystemId)
  const res = await fetch(`${getSidecarBaseUrl()}/scenarios/import-pdf`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}))
    throw new Error(detail?.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

/** Retourne la liste des scénarios importés présents sur le disque. */
export async function fetchImports(): Promise<ImportSummary[]> {
  const res = await fetch(`${getSidecarBaseUrl()}/scenarios/imports`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data: { imports: ImportSummary[] } = await res.json()
  return data.imports
}

/**
 * Retourne le contenu complet d'un import identifié par son importId.
 * Lève une erreur si l'import est introuvable (404).
 */
export async function fetchImportResult(importId: string): Promise<CampaignImportResult> {
  const res = await fetch(`${getSidecarBaseUrl()}/scenarios/imports/${importId}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

/** Retourne l'état courant d'un job d'import. */
export async function fetchImportJob(jobId: string): Promise<ImportJob> {
  const res = await fetch(`${getSidecarBaseUrl()}/scenarios/import-jobs/${jobId}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/**
 * Retourne le JSON de résultat d'un job d'import terminé.
 * Lève une erreur si le job est encore en cours (202) ou a échoué (422).
 */
export async function fetchImportJobResult(jobId: string): Promise<unknown> {
  const res = await fetch(`${getSidecarBaseUrl()}/scenarios/import-jobs/${jobId}/result`)
  if (res.status === 202) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error ?? 'Import en cours')
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

// ── Fonctions génération d'images ─────────────────────────────────────────────

/**
 * Démarre la génération asynchrone de l'image d'une entité unique (PNJ ou lieu)
 * identifiée par `itemId` dans le résultat d'un import.
 * Retourne un `genJobId` à utiliser pour suivre la progression.
 *
 * Lit le campaign.json depuis le disque côté sidecar — fonctionne après redémarrage
 * du serveur et pour les imports chargés depuis l'historique.
 *
 * Lève une erreur avec `httpStatus === 400` si l'itemId est absent ou invalide.
 * Lève une erreur avec `httpStatus === 503` si sd-server n'est pas encore joignable —
 * l'appelant peut alors réessayer après un délai.
 */
export async function startEntityImageGeneration(
  importId: string,
  itemId: string,
): Promise<{ genJobId: string }> {
  const res = await fetch(
    `${getSidecarBaseUrl()}/scenarios/imports/${importId}/generate-image`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId }),
    },
  )
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const err = new Error(body?.error ?? `HTTP ${res.status}`) as Error & { httpStatus: number }
    err.httpStatus = res.status
    throw err
  }
  return res.json()
}

/** Retourne l'état courant d'un job de génération d'image (entité unique). */
export async function fetchEntityImageGenJob(
  importId: string,
  genJobId: string,
): Promise<EntityImageGenJob> {
  const res = await fetch(
    `${getSidecarBaseUrl()}/scenarios/imports/${importId}/generate-image/${genJobId}`,
  )
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/**
 * Démarre un job asynchrone de régénération d'un scénario spécifique.
 * Retourne immédiatement un `jobId` pour suivre la progression.
 */
export async function startScenarioRegeneration(
  importId: string,
  scenarioId: string,
): Promise<{ jobId: string }> {
  const res = await fetch(
    `${getSidecarBaseUrl()}/scenarios/imports/${importId}/regenerate-scenario`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioId }),
    },
  )

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const err = new Error(body?.error ?? `HTTP ${res.status}`) as Error & {
      httpStatus: number
      jobId?: string
    }
    err.httpStatus = res.status
    if (typeof body?.jobId === 'string') err.jobId = body.jobId
    throw err
  }

  return res.json()
}

/** Retourne l'état courant d'un job de régénération de scénario. */
export async function fetchScenarioRegenerationJob(jobId: string): Promise<ScenarioRegenerationJob> {
  const res = await fetch(`${getSidecarBaseUrl()}/scenarios/regenerate-jobs/${jobId}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/**
 * Retourne le JSON de résultat d'un job de régénération terminé.
 * Lève une erreur si le job est encore en cours (202) ou a échoué (422).
 */
export async function fetchScenarioRegenerationJobResult(jobId: string): Promise<CampaignImportResult> {
  const res = await fetch(`${getSidecarBaseUrl()}/scenarios/regenerate-jobs/${jobId}/result`)
  if (res.status === 202) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error ?? 'Régénération en cours')
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}
