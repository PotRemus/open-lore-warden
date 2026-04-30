import type { Character, UpdateCharacter } from '@open-lore-warden/domain'
import { getSidecarBaseUrl } from '@/stores/settings.store'

/** Retourne tous les personnages (joueurs + PNJs) d'une campagne avec leur inventaire. */
export async function fetchCharacters(campaignId: string): Promise<Character[]> {
  const url = new URL(`${getSidecarBaseUrl()}/characters`)
  url.searchParams.set('campaignId', campaignId)
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/** Met à jour un personnage (HP, niveau, stats, statut, etc.). */
export async function updateCharacter(id: string, dto: UpdateCharacter): Promise<Character> {
  const res = await fetch(`${getSidecarBaseUrl()}/characters/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
