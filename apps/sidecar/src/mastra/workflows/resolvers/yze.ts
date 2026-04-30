import { yzeRoll, applyTrauma } from '@open-lore-warden/rules-engine'
import { characterRepository } from '@/repositories/character.repository'
import type { RulesResolver, ResolverContext, RulesResult } from './types'

/**
 * Year Zero Engine rules resolver.
 *
 * Resolution strategy:
 * - If the intent requires no check: return success: true.
 * - Otherwise: build a dice pool from the first character's statsJson:
 *     base  = statsJson.attributes[checkType] (attribute dice)
 *     skill = parsed from intent.details via "skill:KEY" pattern
 *     gear  = parsed from intent.details via "gear:KEY" pattern
 *   Roll the pool; successes > 0 = success.
 *
 * checkType conventions for YZE:
 *   Any attribute key from the game's sheet (e.g. "strength", "agility",
 *   "wits", "empathy" for Year Zero Engine core).
 *
 * intent.details parsing:
 *   - "skill:ranged"   → reads statsJson.skills.ranged as skill pool
 *   - "gear:rifle"     → reads statsJson.gear.rifle as gear pool
 *   Both are optional; missing keys default to 0 dice.
 *
 * Character lookup uses the first character found in the campaign.
 * TODO: pass the active character UUID through the intent for multi-PC support.
 */
export const yzeResolver: RulesResolver = {
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

    const getNestedValue = (blob: unknown, key: string): number => {
      if (!blob || typeof blob !== 'object') return 0
      const v = (blob as Record<string, unknown>)[key]
      return typeof v === 'number' ? v : 0
    }

    // Parse optional skill and gear keys from details
    const skillKeyMatch = intent.details?.match(/skill:(\S+)/)
    const gearKeyMatch = intent.details?.match(/gear:(\S+)/)
    const skillKey = skillKeyMatch?.[1]
    const gearKey = gearKeyMatch?.[1]

    const pool = {
      base: getNestedValue(stats['attributes'], intent.checkType),
      skill: skillKey ? getNestedValue(stats['skills'], skillKey) : 0,
      gear: gearKey ? getNestedValue(stats['gear'], gearKey) : 0,
    }

    const result = yzeRoll(pool)
    const isSuccess = result.successes > 0

    // Auto-apply trauma if this were a push (not applicable for initial roll)
    // Trauma is applied by yze-roll tool on explicit push; resolver only does initial roll.
    let traumaApplied = 0
    if (result.pushed && result.baseTragedy > 0) {
      const traumaResult = applyTrauma(stats, result.baseTragedy)
      traumaApplied = traumaResult.traumaGained
      const updated = { ...stats, stress: traumaResult.stressAfter }
      characterRepository.update(character.id, { statsJson: JSON.stringify(updated) })
    }

    return {
      check: intent.checkType,
      roll: result.successes,
      success: isSuccess,
      yzeSuccesses: result.successes,
      yzePushed: result.pushed,
      yzeTrauma: traumaApplied,
      stateChanges: {
        pool,
        baseDice: result.baseDice,
        skillDice: result.skillDice,
        gearDice: result.gearDice,
        skillKey: skillKey ?? null,
        gearKey: gearKey ?? null,
      },
    }
  },
}
