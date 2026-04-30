import { skillCheck } from '@open-lore-warden/rules-engine'
import type { RulesResolver, ResolverContext, RulesResult } from './types'

/**
 * D&D 5e rules resolver.
 *
 * For checks that require a roll, performs a d20 skill check (d20 + bonus vs DC).
 * Bonus defaults to 0 until character stat parsing from statsJson is wired up.
 * DC defaults to 12 (medium difficulty) as a placeholder.
 *
 * TODO: parse statsJson to derive abilityModifier + proficiencyBonus for the check type.
 */
export const dnd5eResolver: RulesResolver = {
  async resolve(ctx: ResolverContext): Promise<RulesResult> {
    const { intent } = ctx

    if (!intent.requiresCheck || !intent.checkType) {
      return { success: true }
    }

    const rawMode = (intent.details ?? '').toLowerCase()
    const mode =
      rawMode.includes('avantage') || rawMode.includes('advantage')
        ? 'advantage'
        : rawMode.includes('désavantage') || rawMode.includes('disadvantage')
          ? 'disadvantage'
          : 'normal'

    // TODO: look up actual bonus from character statsJson (abilityModifier + proficiencyBonus)
    const checkResult = skillCheck(0, 12, mode)

    return {
      check: intent.checkType,
      naturalRoll: checkResult.naturalRoll,
      roll: checkResult.total,
      success: checkResult.success,
      isCritical: checkResult.isCritical,
      isFumble: checkResult.isFumble,
      mode: checkResult.mode,
    }
  },
}
