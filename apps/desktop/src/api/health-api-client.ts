import type { HealthResponse } from '@open-lore-warden/shared'
import { getSidecarBaseUrl } from '@/stores/settings.store'

export interface SidecarStatus {
  connected: boolean
  url: string
  version: string | null
  error: string | null
}

/** Vérifie la disponibilité du sidecar. Ne lève jamais d'exception. */
export async function fetchHealth(): Promise<SidecarStatus> {
  const baseUrl = getSidecarBaseUrl()
  try {
    const res = await fetch(`${baseUrl}/system/health`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data: HealthResponse = await res.json()
    return { connected: true, url: baseUrl, version: data.version, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { connected: false, url: baseUrl, version: null, error: message }
  }
}

/**
 * Interroge le sidecar en boucle jusqu'à obtenir une réponse, ou jusqu'au timeout.
 * @param timeoutMs  Délai maximum total en ms (défaut : 15 000)
 * @param intervalMs Intervalle entre deux tentatives en ms (défaut : 500)
 */
export async function pollUntilReady(
  timeoutMs = 15000,
  intervalMs = 500,
): Promise<SidecarStatus> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const status = await fetchHealth()
    if (status.connected) return status
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  const baseUrl = getSidecarBaseUrl()
  return { connected: false, url: baseUrl, version: null, error: 'Timeout après 15s' }
}
