import { roll } from '../core/dice'

// ── D&D 5e ability scores ─────────────────────────────────────────────────────

/**
 * Compute the D&D 5e ability modifier from a raw ability score.
 * Formula: floor((score − 10) / 2)
 *
 * Examples: 10 → +0, 14 → +2, 8 → −1, 20 → +5
 *
 * D&D 5e specific — not applicable to systems that use percentage-based
 * skills (CoC), narrative dice (Fate), or other non-score models.
 */
export const abilityModifier = (score: number): number => Math.floor((score - 10) / 2)

/**
 * Compute the D&D 5e proficiency bonus from character level.
 *
 * | Level  | Bonus |
 * |--------|-------|
 * |  1–4   |  +2   |
 * |  5–8   |  +3   |
 * |  9–12  |  +4   |
 * | 13–16  |  +5   |
 * | 17–20  |  +6   |
 *
 * D&D 5e specific — other systems use different proficiency models.
 */
export const proficiencyBonus = (level: number): number => Math.floor((level - 1) / 4) + 2

// ── Death saving throws ───────────────────────────────────────────────────────

/** Result of a D&D 5e death saving throw. */
export interface DeathSaveResult {
  /** Raw d20 value. */
  naturalRoll: number
  /** true if naturalRoll >= 10. */
  success: boolean
  /**
   * true if naturalRoll === 20.
   * The character regains 1 HP and becomes conscious (counts as 3 successes).
   */
  isStabilizing: boolean
  /**
   * true if naturalRoll === 1.
   * Counts as 2 failures instead of 1.
   */
  isCriticalFail: boolean
}

/**
 * Roll a D&D 5e death saving throw.
 *
 * Rules:
 * - Roll d20 (no modifier).
 * - 10 or higher → success.
 * - Natural 20   → isStabilizing: true (regain 1 HP, counts as 3 successes).
 * - Natural 1    → isCriticalFail: true (counts as 2 failures).
 * - 3 successes  → stable (caller tracks the tally across turns).
 * - 3 failures   → dead  (caller tracks the tally across turns).
 *
 * D&D 5e specific — other systems handle incapacitation differently.
 */
export function deathSavingThrow(): DeathSaveResult {
  const naturalRoll = roll(20)
  return {
    naturalRoll,
    success: naturalRoll >= 10,
    isStabilizing: naturalRoll === 20,
    isCriticalFail: naturalRoll === 1,
  }
}
