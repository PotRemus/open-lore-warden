import { fateAction, ladderRating } from '@open-lore-warden/rules-engine'
import { characterRepository } from '@/repositories/character.repository'
import type { RulesResolver, ResolverContext, RulesResult } from './types'

/**
 * Fate Core rules resolver.
 *
 * Resolution strategy:
 * - If the intent requires no check: return success: true.
 * - Otherwise: read the skill rating from the first character's statsJson
 *   using `intent.checkType` as the skill key, determine opposition from
 *   `intent.details` (defaults to 0 = Average), and roll 4dF + skill.
 *
 * checkType conventions for Fate:
 *   'overcome'         → Overcome action
 *   'create_advantage' → Create Advantage
 *   'attack'           → Attack
 *   'defend'           → Defend
 *   Any other value    → treated as Overcome with that key as the skill name
 *
 * Character lookup uses the first character found in the campaign.
 * TODO: pass the active character UUID through the intent for multi-PC support.
 */
export const fateResolver: RulesResolver = {
  async resolve(ctx: ResolverContext): Promise<RulesResult> {
    const { intent, campaignId } = ctx

    if (!intent.requiresCheck || !intent.checkType) {
      return { success: true }
    }

    // Determine Fate action type from checkType
    const FATE_ACTIONS = new Set(['overcome', 'create_advantage', 'attack', 'defend'])
    const actionType = FATE_ACTIONS.has(intent.checkType)
      ? (intent.checkType as 'overcome' | 'create_advantage' | 'attack' | 'defend')
      : 'overcome'

    // The skill key: use checkType if it's not a known action type, otherwise
    // look for an explicit skillKey in details (e.g. "skillKey:combat")
    let skillKey = FATE_ACTIONS.has(intent.checkType) ? '' : intent.checkType
    const skillKeyMatch = intent.details?.match(/skillKey:(\S+)/)
    if (skillKeyMatch) skillKey = skillKeyMatch[1]!

    // Parse opposition from details: "opposition:3" or default 0 (Average)
    const oppositionMatch = intent.details?.match(/opposition:(-?\d+)/)
    const opposition = oppositionMatch ? parseInt(oppositionMatch[1]!, 10) : 0

    // Look up character
    const characters = characterRepository.findByCampaignId(campaignId)
    const character = characters[0]

    let skillRating = 0 // default: Médiocre (0)
    if (character && skillKey) {
      try {
        const stats = JSON.parse(character.statsJson) as Record<string, unknown>
        const skillsBlob = stats['skills']
        if (skillsBlob && typeof skillsBlob === 'object') {
          const v = (skillsBlob as Record<string, unknown>)[skillKey]
          if (typeof v === 'number') skillRating = v
        }
        const topLevel = stats[skillKey]
        if (typeof topLevel === 'number') skillRating = topLevel
      } catch {
        // statsJson parse error — proceed with default rating
      }
    }

    const result = fateAction(skillRating, opposition, actionType)
    const isSuccess = result.outcome === 'success' || result.outcome === 'success_with_style'

    return {
      check: intent.checkType,
      roll: result.total,
      success: isSuccess,
      shifts: result.shifts,
      outcome: result.outcome,
      fateDice: [...result.dice],
      stateChanges: {
        skillRating,
        skillKey: skillKey || null,
        diceTotal: result.diceTotal,
        totalLabel: ladderRating(result.total),
        oppositionLabel: ladderRating(opposition),
        actionType,
      },
    }
  },
}
