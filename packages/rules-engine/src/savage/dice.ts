import { roll } from '../core/dice'

// ── Types ─────────────────────────────────────────────────────────────────────

/** Savage Worlds die type for Trait rolls (d4 to d12). */
export type SWDieType = 4 | 6 | 8 | 10 | 12

/** Full result of a Savage Worlds Trait roll. */
export interface SWTraitRollResult {
  /** Final Trait die result (including aces). */
  traitDie: number
  /** Final Wild die result (including aces). 0 for Extras (non-Wild Cards). */
  wildDie: number
  /** Higher of traitDie and wildDie (for Wild Cards), or traitDie (for Extras). */
  total: number
  /** Target Number (default 4). */
  targetNumber: number
  /** Flat bonus applied after the dice roll. */
  bonus: number
  /** total + bonus. */
  finalTotal: number
  /** true if finalTotal >= targetNumber. */
  success: boolean
  /**
   * Number of Raises: each full 4 points above the TN = 1 Raise.
   * e.g. finalTotal 8 vs TN 4 = 1 Raise; finalTotal 12 = 2 Raises.
   */
  raises: number
  /** true for Player Characters and named NPCs (uses Wild die). */
  isWildCard: boolean
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Roll a single die with Aces (explosion): if the maximum value is rolled,
 * the die is re-rolled and the results are accumulated.
 *
 * @param sides  Number of sides on the die.
 */
export function rollAce(sides: SWDieType | 6): number {
  const result = roll(sides)
  if (result === sides) return sides + rollAce(sides)
  return result
}

// ── Core function ─────────────────────────────────────────────────────────────

/**
 * Perform a Savage Worlds Trait roll.
 *
 * Wild Cards roll both their Trait die and a d6 Wild die, keeping the higher result.
 * Extras only roll the Trait die.
 * Both die types use Aces (explosion on maximum value).
 *
 * @param dieSides    Number of sides of the Trait die (d4/d6/d8/d10/d12).
 * @param isWildCard  true for Player Characters and named NPCs.
 * @param bonus       Flat modifier to add after the roll (default 0).
 * @param tn          Target Number (default 4).
 */
export function traitRoll(
  dieSides: SWDieType,
  isWildCard: boolean,
  bonus: number = 0,
  tn: number = 4,
): SWTraitRollResult {
  const traitDie = rollAce(dieSides)
  const wildDie = isWildCard ? rollAce(6) : 0
  const total = isWildCard ? Math.max(traitDie, wildDie) : traitDie
  const finalTotal = total + bonus
  const success = finalTotal >= tn
  const raises = success ? Math.floor((finalTotal - tn) / 4) : 0
  return {
    traitDie,
    wildDie,
    total,
    targetNumber: tn,
    bonus,
    finalTotal,
    success,
    raises,
    isWildCard,
  }
}
