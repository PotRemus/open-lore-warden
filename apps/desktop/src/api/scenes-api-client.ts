import type { Scene } from '@open-lore-warden/domain'
import { getSidecarBaseUrl } from '@/stores/settings.store'

/**
 * Retourne la scène active d'une campagne avec ses connexions,
 * rencontres, cue audio et localisation.
 */
export async function fetchCurrentScene(campaignId: string): Promise<Scene> {
  const url = new URL(`${getSidecarBaseUrl()}/scenes/current`)
  url.searchParams.set('campaignId', campaignId)
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
