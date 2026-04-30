import { cocCheck, sanityCheck } from '@open-lore-warden/rules-engine'
import { characterRepository } from '@/repositories/character.repository'
import type { RulesResolver, ResolverContext, RulesResult } from './types'

/**
 * Call of Cthulhu 7e rules resolver.
 *
 * Resolution strategy:
 * - If checkType is 'san_check' or 'sanity': perform a Sanity check.
 *   The SAN loss notation is taken from intent.details (e.g. "0/1d6").
 *   Falls back to "0/1d4" if not specified.
 * - Otherwise: look up the skill value from the first character's statsJson
 *   using checkType as the skill key, then roll percentile.
 *
 * Character lookup uses the first character found in the campaign.
 * TODO: pass the active character UUID through the intent for multi-PC support.
 */
export const cocResolver: RulesResolver = {
  async resolve(ctx: ResolverContext): Promise<RulesResult> {
    const { intent, campaignId } = ctx

    if (!intent.requiresCheck || !intent.checkType) {
      return { success: true }
    }

    // ── Sanity check ──────────────────────────────────────────────────────────
    const isSanCheck =
      intent.checkType === 'san_check' ||
      intent.checkType === 'sanity' ||
      intent.checkType.startsWith('san')

    if (isSanCheck) {
      // Extract SAN loss notation from details, e.g. "0/1d6" or "1/1d8"
      const notationMatch = intent.details?.match(/\d+d?\d*\/\d+d?\d*/)?.[0]
      const notation = notationMatch ?? '0/1d4'

      // Resolve against the first active character in the campaign
      const characters = characterRepository.findByCampaignId(campaignId)
      const character = characters[0]
      if (!character) return { success: true, check: intent.checkType }

      let stats: Record<string, unknown>
      try {
        stats = JSON.parse(character.statsJson) as Record<string, unknown>
      } catch {
        return { success: false, check: intent.checkType }
      }

      const currentSanity = typeof stats['sanity'] === 'number' ? (stats['sanity'] as number) : 50
      const result = sanityCheck(currentSanity, notation)

      return {
        check: intent.checkType,
        roll: result.rollValue,
        success: result.isSuccess,
        successLevel: result.successLevel,
        sanityLost: result.sanityLost,
        isTemporarilyInsane: result.isTemporarilyInsane,
        stateChanges: {
          sanityLost: result.sanityLost,
          newSanity: result.newSanity,
          isPermanentlyInsane: result.isPermanentlyInsane,
        },
      }
    }

    // ── Regular skill check ───────────────────────────────────────────────────
    const characters = characterRepository.findByCampaignId(campaignId)
    const character = characters[0]
    if (!character) return { success: true, check: intent.checkType }

    let stats: Record<string, unknown>
    try {
      stats = JSON.parse(character.statsJson) as Record<string, unknown>
    } catch {
      return { success: false, check: intent.checkType }
    }

    // Look up skill: first in nested `skills` object, then top-level
    let skillValue = 25 // default fallback
    const skillsBlob = stats['skills']
    if (skillsBlob && typeof skillsBlob === 'object') {
      const v = (skillsBlob as Record<string, unknown>)[intent.checkType]
      if (typeof v === 'number') skillValue = v
    }
    const topLevel = stats[intent.checkType]
    if (typeof topLevel === 'number') skillValue = topLevel

    const result = cocCheck(skillValue)

    return {
      check: intent.checkType,
      roll: result.rollValue,
      success: result.isSuccess,
      successLevel: result.successLevel,
      stateChanges: {
        skillValue,
        isSpecialSuccess: result.isSpecialSuccess,
      },
    }
  },
}
