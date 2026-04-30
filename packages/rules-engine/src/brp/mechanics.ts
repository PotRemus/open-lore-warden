import { rollPercentile } from '../coc/mechanics'

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * BRP (Basic Role-Playing) success level for a percentile roll.
 *
 * Thresholds (skill value S):
 * - Critical  : roll ≤ ⌊S / 5⌋
 * - Special   : roll ≤ ⌊S / 2⌋
 * - Success   : roll ≤ S
 * - Failure   : roll > S (and not a fumble)
 * - Fumble    : roll ≥ 96 when S < 100, or roll = 100 always
 *
 * Note: this differs from CoC 7e's 'extreme/hard/regular' terminology but uses
 * the same underlying d100 roll. BRP and CoC share rollPercentile from coc/mechanics.
 */
export type BRPSuccessLevel = 'critical' | 'special' | 'success' | 'failure' | 'fumble'

/** Full result of a BRP percentile check. */
export interface BRPCheckResult {
  /** Raw d100 value (1–100). */
  roll: number
  /** The skill value tested against. */
  skill: number
  /** Resolved success level. */
  successLevel: BRPSuccessLevel
  /** Threshold for a critical success (⌊skill / 5⌋). */
  criticalThreshold: number
  /** Threshold for a special success (⌊skill / 2⌋). */
  specialThreshold: number
  /** Threshold at which a roll is a fumble (96 if skill < 100, else 100). */
  fumbleThreshold: number
}

// ── Core functions ────────────────────────────────────────────────────────────

/**
 * Determine the BRP success level for a given roll and skill value.
 *
 * @param rollValue  The d100 result (1–100).
 * @param skill      The skill or characteristic value (1–100).
 */
export function brpSuccessLevel(rollValue: number, skill: number): BRPSuccessLevel {
  const critical = Math.max(1, Math.floor(skill / 5))
  const special = Math.max(1, Math.floor(skill / 2))
  const fumble = skill >= 100 ? 100 : 96

  if (rollValue >= fumble) return 'fumble'
  if (rollValue <= critical) return 'critical'
  if (rollValue <= special) return 'special'
  if (rollValue <= skill) return 'success'
  return 'failure'
}

/**
 * Perform a full BRP percentile check.
 *
 * Reuses rollPercentile from the CoC module — same d100 mechanics.
 *
 * @param skill  The skill value to test against (e.g. 65 for Épée 65%).
 */
export function brpCheck(skill: number): BRPCheckResult {
  const rollValue = rollPercentile()
  return {
    roll: rollValue,
    skill,
    successLevel: brpSuccessLevel(rollValue, skill),
    criticalThreshold: Math.max(1, Math.floor(skill / 5)),
    specialThreshold: Math.max(1, Math.floor(skill / 2)),
    fumbleThreshold: skill >= 100 ? 100 : 96,
  }
}
