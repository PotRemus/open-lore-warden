const campaignFileWriteLocks = new Map<string, Promise<void>>()

/**
 * Sérialise les sections "lire → modifier → écrire" du campaign.json
 * pour un import donné.
 */
export function serializeCampaignWrite(importId: string, fn: () => Promise<void>): Promise<void> {
  const previous = campaignFileWriteLocks.get(importId) ?? Promise.resolve()
  const next = previous.then(fn)

  // On conserve une version non rejetée pour ne pas bloquer la queue
  campaignFileWriteLocks.set(importId, next.catch(() => {}))

  return next
}
