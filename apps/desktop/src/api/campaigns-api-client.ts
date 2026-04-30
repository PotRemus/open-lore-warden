import type { Campaign, CreateCampaign, UpdateCampaign, CampaignLoadResult } from '@open-lore-warden/domain'
import { getSidecarBaseUrl } from '@/stores/settings.store'

/** Retourne toutes les campagnes. */
export async function fetchCampaigns(): Promise<Campaign[]> {
  const res = await fetch(`${getSidecarBaseUrl()}/campaigns`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/** Retourne une campagne par son id. */
export async function fetchCampaign(id: string): Promise<Campaign> {
  const res = await fetch(`${getSidecarBaseUrl()}/campaigns/${id}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/** Crée une nouvelle campagne. */
export async function createCampaign(dto: CreateCampaign): Promise<Campaign> {
  const res = await fetch(`${getSidecarBaseUrl()}/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/** Met à jour une campagne (scène courante, etc.). */
export async function updateCampaign(id: string, dto: UpdateCampaign): Promise<Campaign> {
  const res = await fetch(`${getSidecarBaseUrl()}/campaigns/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/** Supprime une campagne. */
export async function deleteCampaign(id: string): Promise<void> {
  const res = await fetch(`${getSidecarBaseUrl()}/campaigns/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

/**
 * Charge le contexte complet d'une session :
 * campagne + scène courante + personnages actifs + 10 derniers tours.
 */
export async function loadCampaign(id: string): Promise<CampaignLoadResult> {
  const res = await fetch(`${getSidecarBaseUrl()}/campaigns/${id}/load`, { method: 'POST' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
