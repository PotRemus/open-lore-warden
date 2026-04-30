import { pbtaRoll, outcomeLabel } from '@open-lore-warden/rules-engine'
import { characterRepository } from '@/repositories/character.repository'
import type { RulesResolver, ResolverContext, RulesResult } from './types'

/**
 * PbtA (Powered by the Apocalypse) rules resolver.
 *
 * Resolution strategy:
 * - If the intent requires no check: return success: true.
 * - Otherwise: read the stat modifier from the first character's statsJson
 *   using `intent.checkType` as the stat key
 *   (e.g. checkType="cool" → statsJson.stats.cool).
 *   Roll 2d6 + stat and determine the outcome (10+ / 7-9 / 6-).
 *
 * checkType conventions for PbtA:
 *   Any stat key from the game's playbook stats (e.g. "cool", "hard", "hot",
 *   "sharp", "weird", "forceful", "quick", "careful", etc.)
 *
 * Character lookup uses the first character found in the campaign.
 * TODO: pass the active character UUID through the intent for multi-PC support.
 */
export const pbtaResolver: RulesResolver = {
  async resolve(ctx: ResolverContext): Promise<RulesResult> {
    const { intent, campaignId } = ctx

    if (!intent.requiresCheck || !intent.checkType) {
      return { success: true }
    }

    // Look up character
    const characters = characterRepository.findByCampaignId(campaignId)
    const character = characters[0]
    if (!character) return { success: true, check: intent.checkType }

    let stats: Record<string, unknown>
    try {
      stats = JSON.parse(character.statsJson) as Record<string, unknown>
    } catch {
      return { success: false, check: intent.checkType }
    }

    // Look up stat modifier: in nested `stats` object, then top-level
    let statValue = 0
    const statsBlob = stats['stats']
    if (statsBlob && typeof statsBlob === 'object') {
      const v = (statsBlob as Record<string, unknown>)[intent.checkType]
      if (typeof v === 'number') statValue = v
    }
    const topLevel = stats[intent.checkType]
    if (typeof topLevel === 'number') statValue = topLevel

    const result = pbtaRoll(statValue)
    const isSuccess = result.outcome === 'full_success' || result.outcome === 'partial_success'

    return {
      check: intent.checkType,
      roll: result.total,
      success: isSuccess,
      pbtaOutcome: result.outcome,
      pbtaDice: [...result.dice],
      pbtaTotal: result.total,
      stateChanges: {
        statKey: intent.checkType,
        statValue,
        d1: result.dice[0],
        d2: result.dice[1],
        outcomeLabel: outcomeLabel(result.outcome),
      },
    }
  },
}
