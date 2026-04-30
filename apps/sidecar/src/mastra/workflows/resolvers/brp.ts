import { brpCheck, resistanceRoll } from '@open-lore-warden/rules-engine'
import { characterRepository } from '@/repositories/character.repository'
import type { RulesResolver, ResolverContext, RulesResult } from './types'

/**
 * BRP (Basic Role-Playing) rules resolver.
 *
 * Resolution strategy:
 * - If the intent requires no check: return success: true.
 * - If checkType is 'resistance': perform a Resistance Roll.
 *   Active and passive values are parsed from intent.details:
 *     "active:14 passive:12"  → resistanceRoll(14, 12)
 *   Falls back to 10 vs 10 if not specified.
 * - Otherwise: look up the skill value from the first character's statsJson
 *   using checkType as the skill key, then roll d100.
 *
 * checkType conventions for BRP:
 *   Any skill key from the character sheet (e.g. "épée", "archerie", "esquive",
 *   "perception", "persuasion").
 *   Use "resistance" to trigger the Resistance Table.
 *
 * Character lookup uses the first character found in the campaign.
 * TODO: pass the active character UUID through the intent for multi-PC support.
 */
export const brpResolver: RulesResolver = {
  async resolve(ctx: ResolverContext): Promise<RulesResult> {
    const { intent, campaignId } = ctx

    if (!intent.requiresCheck || !intent.checkType) {
      return { success: true }
    }

    // ── Resistance Roll ───────────────────────────────────────────────────────
    if (intent.checkType === 'resistance') {
      const activeMatch = intent.details?.match(/active:(\d+)/)
      const passiveMatch = intent.details?.match(/passive:(\d+)/)
      const active = activeMatch ? parseInt(activeMatch[1]!, 10) : 10
      const passive = passiveMatch ? parseInt(passiveMatch[1]!, 10) : 10
      const result = resistanceRoll(active, passive)
      return {
        check: intent.checkType,
        roll: result.roll,
        success: result.success,
        stateChanges: {
          chance: result.chance,
          activeValue: result.activeValue,
          passiveValue: result.passiveValue,
        },
      }
    }

    // ── Standard skill check ──────────────────────────────────────────────────
    const characters = characterRepository.findByCampaignId(campaignId)
    const character = characters[0]
    if (!character) return { success: true, check: intent.checkType }

    let stats: Record<string, unknown>
    try {
      stats = JSON.parse(character.statsJson) as Record<string, unknown>
    } catch {
      return { success: false, check: intent.checkType }
    }

    // Look up skill value: first in nested `skills` object, then top-level
    let skillValue = 25 // default fallback
    const skillsBlob = stats['skills']
    if (skillsBlob && typeof skillsBlob === 'object') {
      const v = (skillsBlob as Record<string, unknown>)[intent.checkType]
      if (typeof v === 'number') skillValue = v
    }
    const topLevel = stats[intent.checkType]
    if (typeof topLevel === 'number') skillValue = topLevel

    const result = brpCheck(skillValue)
    const isSuccess =
      result.successLevel === 'success' ||
      result.successLevel === 'special' ||
      result.successLevel === 'critical'

    return {
      check: intent.checkType,
      roll: result.roll,
      success: isSuccess,
      successLevel: result.successLevel,
      stateChanges: {
        skillValue,
        criticalThreshold: result.criticalThreshold,
        specialThreshold: result.specialThreshold,
        fumbleThreshold: result.fumbleThreshold,
      },
    }
  },
}
