import type { Turn, ResolveTurnResult } from '@open-lore-warden/domain'
import { getSidecarBaseUrl } from '@/stores/settings.store'

/** Lance le pipeline complet de résolution d'un tour via le workflow Mastra. */
export async function resolveTurn(dto: {
  campaignId: string
  playerInput: string
}): Promise<ResolveTurnResult> {
  const res = await fetch(`${getSidecarBaseUrl()}/turns/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}))
    throw new Error(detail?.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

/**
 * Retourne les N derniers tours d'une campagne.
 * @param limit Nombre de tours à retourner (défaut : 10, max : 50)
 */
export async function fetchLatestTurns(campaignId: string, limit = 10): Promise<Turn[]> {
  const url = new URL(`${getSidecarBaseUrl()}/turns/latest`)
  url.searchParams.set('campaignId', campaignId)
  url.searchParams.set('limit', String(limit))
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/** Retourne un tour par son id. */
export async function fetchTurn(id: string): Promise<Turn> {
  const res = await fetch(`${getSidecarBaseUrl()}/turns/${id}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/**
 * Génère et persiste un récapitulatif de session à partir des tours récents.
 * @param turnCount Nombre de tours à prendre en compte (défaut : 20, max : 50)
 */
export async function generateSessionSummary(dto: {
  campaignId: string
  turnCount?: number
}): Promise<Record<string, unknown>> {
  const res = await fetch(`${getSidecarBaseUrl()}/turns/session-summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}))
    throw new Error(detail?.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}
