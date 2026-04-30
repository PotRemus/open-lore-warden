import { roll } from '../core/dice'
import type { CoCSuccessLevel } from './mechanics'
import { successLevel } from './mechanics'

// ── Types ─────────────────────────────────────────────────────────────────────

/** Result of a CoC 7e Sanity check. */
export interface SanityCheckResult {
  /** Raw d100 value of the Sanity roll. */
  rollValue: number
  /** The investigator's current Sanity value at the time of the check. */
  currentSanity: number
  /** Success level of the roll (treated as a regular skill check vs current SAN). */
  successLevel: CoCSuccessLevel
  /** true if the SAN roll succeeded (no loss, or minimal loss). */
  isSuccess: boolean
  /**
   * Sanity points lost.
   * On success the minimum loss is applied; on failure the full loss is applied.
   *
   * sanLoss format (CoC 7e): e.g. "1/1d6" — pass = 1, fail = 1d6.
   * This result carries the final resolved integer.
   */
  sanityLost: number
  /** Sanity value after the loss. Never below 0. */
  newSanity: number
  /** true if the investigator lost 5+ SAN in a single check (temporary insanity threshold). */
  isTemporarilyInsane: boolean
  /** true if total SAN has reached 0. */
  isPermanentlyInsane: boolean
}

/**
 * Parsed SAN loss notation: e.g. "0/1d4" → { onSuccess: 0, failDice: 4, failCount: 1 }
 * or "1/1d6" → { onSuccess: 1, failDice: 6, failCount: 1 }.
 */
interface SanLossSpec {
  /** Fixed amount lost on a successful SAN roll. */
  onSuccess: number
  /** Die faces for the failure roll (e.g. 6 for d6). 0 means a fixed amount. */
  failDice: number
  /** Number of dice rolled on failure. */
  failCount: number
  /** Fixed amount on failure when failDice is 0. */
  failFixed: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Parse a CoC SAN loss notation string into a structured spec.
 *
 * Accepted formats:
 *   "0/1d4"   → onSuccess: 0, failCount: 1, failDice: 4
 *   "1/1d6"   → onSuccess: 1, failCount: 1, failDice: 6
 *   "1d3/1d8" → onSuccess: roll 1d3, failCount: 1, failDice: 8
 *   "2/2d6"   → onSuccess: 2, failCount: 2, failDice: 6
 *   "1/3"     → onSuccess: 1, failFixed: 3 (no dice, fixed fail loss)
 *
 * Falls back to { onSuccess: 0, failDice: 6, failCount: 1, failFixed: 0 } on parse error.
 */
function parseSanLoss(notation: string): SanLossSpec {
  const parts = notation.trim().split('/')
  if (parts.length !== 2) return { onSuccess: 0, failDice: 6, failCount: 1, failFixed: 0 }

  const parseHalf = (s: string): { fixed: number; dice: number; count: number } => {
    const diceMatch = s.match(/^(\d+)d(\d+)$/)
    if (diceMatch) return { fixed: 0, dice: Number(diceMatch[2]), count: Number(diceMatch[1]) }
    const fixed = parseInt(s, 10)
    return { fixed: isNaN(fixed) ? 0 : fixed, dice: 0, count: 0 }
  }

  const success = parseHalf(parts[0]!)
  const failure = parseHalf(parts[1]!)

  return {
    onSuccess: success.dice > 0 ? roll(success.dice, success.count) : success.fixed,
    failDice: failure.dice,
    failCount: failure.count,
    failFixed: failure.fixed,
  }
}

function rollLoss(spec: SanLossSpec, succeeded: boolean): number {
  if (succeeded) return spec.onSuccess
  return spec.failDice > 0 ? roll(spec.failDice, spec.failCount) : spec.failFixed
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Roll a CoC 7e Sanity check.
 *
 * Rules (CoC 7e, p. 164):
 * - Roll d100 vs current Sanity value.
 * - On success: lose `sanLossOnSuccess` SAN (usually 0 or 1).
 * - On failure: lose `sanLossOnFailure` SAN (usually a dice roll, e.g. 1d6).
 * - Losing 5+ SAN in a single roll triggers temporary insanity.
 * - Reaching 0 SAN means permanent insanity.
 *
 * @param currentSanity   Current SAN value of the investigator (0–99).
 * @param sanLossNotation CoC notation string, e.g. "0/1d6" or "1/1d8".
 */
export function sanityCheck(currentSanity: number, sanLossNotation: string): SanityCheckResult {
  const rollValue = roll(100)
  const level = successLevel(rollValue, currentSanity)
  const isSuccess = level === 'regular' || level === 'hard' || level === 'extreme'

  const spec = parseSanLoss(sanLossNotation)
  const sanityLost = rollLoss(spec, isSuccess)
  const newSanity = Math.max(0, currentSanity - sanityLost)

  return {
    rollValue,
    currentSanity,
    successLevel: level,
    isSuccess,
    sanityLost,
    newSanity,
    isTemporarilyInsane: sanityLost >= 5,
    isPermanentlyInsane: newSanity === 0,
  }
}

/**
 * Compute the temporary insanity threshold for an investigator.
 *
 * CoC 7e rule: losing 1/5 of current Sanity in a single session triggers
 * indefinite insanity. This helper returns that threshold value.
 *
 * @param currentSanity Current SAN value.
 */
export function insanityThreshold(currentSanity: number): number {
  return Math.max(1, Math.floor(currentSanity / 5))
}

/**
 * Apply a resolved sanity loss to a statsJson blob.
 *
 * Reads `sanity` from the parsed stats, subtracts `amount`, and returns
 * the updated JSON string. Does not mutate the original.
 *
 * @param statsJson Current statsJson string for the character.
 * @param amount    Amount of SAN to subtract (must be ≥ 0).
 * @returns Updated statsJson string with the new `sanity` value.
 * @throws If statsJson is invalid JSON or `sanity` is not a number.
 */
export function applySanityLoss(statsJson: string, amount: number): string {
  const stats = JSON.parse(statsJson) as Record<string, unknown>
  if (typeof stats['sanity'] !== 'number') {
    throw new Error('statsJson must contain a numeric "sanity" field for CoC characters')
  }
  const newSanity = Math.max(0, (stats['sanity'] as number) - amount)
  return JSON.stringify({ ...stats, sanity: newSanity })
}
