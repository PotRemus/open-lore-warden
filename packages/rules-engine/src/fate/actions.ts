import { rollFateDice } from './dice'
import type { FateDieResult } from './dice'

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * The four Fate Core actions.
 *
 * - `overcome`         : surmount an obstacle or opposition.
 * - `create_advantage` : create or discover an Aspect with free invocations.
 * - `attack`           : inflict stress or consequences on a target.
 * - `defend`           : oppose an attack or overcome action against you.
 */
export type FateActionType = 'overcome' | 'create_advantage' | 'attack' | 'defend'

/**
 * Fate outcome based on shift count (roll total − opposition).
 *
 * | Shifts | Outcome             |
 * |--------|---------------------|
 * | ≥ 3    | success_with_style  |
 * | 1–2    | success             |
 * | 0      | tie                 |
 * | < 0    | failure             |
 */
export type FateOutcome = 'success_with_style' | 'success' | 'tie' | 'failure'

/** Full result of a Fate Core action roll. */
export interface FateActionResult {
  actionType: FateActionType
  /** Individual Fate die results (always 4). */
  dice: [FateDieResult, FateDieResult, FateDieResult, FateDieResult]
  /** Sum of the 4 dice (-4 to +4). */
  diceTotal: number
  /** Skill or approach rating added to the dice. */
  skillRating: number
  /** diceTotal + skillRating. */
  total: number
  /** Passive or active opposition value rolled against. */
  opposition: number
  /** total − opposition. Positive = success, 0 = tie, negative = failure. */
  shifts: number
  /** Resolved outcome. */
  outcome: FateOutcome
}

// ── Core functions ────────────────────────────────────────────────────────────

/**
 * Resolve shifts into a Fate outcome.
 *
 * @param shifts total − opposition.
 */
export function resolveOutcome(shifts: number): FateOutcome {
  if (shifts >= 3) return 'success_with_style'
  if (shifts >= 1) return 'success'
  if (shifts === 0) return 'tie'
  return 'failure'
}

/**
 * Perform a Fate Core action roll.
 *
 * Rolls 4dF, adds the skill rating, and compares to the opposition.
 * Returns the full breakdown including individual dice and resolved outcome.
 *
 * @param skillRating  Skill or approach rating of the acting character (Fate ladder value).
 * @param opposition   Passive difficulty or opponent's roll total.
 * @param actionType   Type of action being attempted (default: 'overcome').
 */
export function fateAction(
  skillRating: number,
  opposition: number,
  actionType: FateActionType = 'overcome',
): FateActionResult {
  const roll = rollFateDice()
  const total = roll.total + skillRating
  const shifts = total - opposition
  return {
    actionType,
    dice: roll.dice,
    diceTotal: roll.total,
    skillRating,
    total,
    opposition,
    shifts,
    outcome: resolveOutcome(shifts),
  }
}

/**
 * Perform an opposed Fate action (both sides roll).
 *
 * Used when an active character defends against an attacker, or when two
 * characters contest the same action. The `shifts` in the result are
 * relative to the defender's roll (not a passive difficulty).
 *
 * @param attackerSkill  Skill rating of the acting character.
 * @param defenderSkill  Skill rating of the opposing character.
 * @param actionType     Type of action (typically 'attack' or 'overcome').
 */
export function opposedFateAction(
  attackerSkill: number,
  defenderSkill: number,
  actionType: FateActionType = 'attack',
): { attacker: FateActionResult; defenderTotal: number } {
  const defenseRoll = rollFateDice()
  const defenderTotal = defenseRoll.total + defenderSkill
  const attacker = fateAction(attackerSkill, defenderTotal, actionType)
  return { attacker, defenderTotal }
}
