import { roll } from '../core/dice'

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Result level of a Call of Cthulhu 7e percentile roll.
 *
 * Rules (CoC 7e, p. 23):
 * - Extreme success  : roll ≤ skill / 5
 * - Hard success     : roll ≤ skill / 2
 * - Regular success  : roll ≤ skill
 * - Failure          : roll > skill (and not a fumble)
 * - Fumble           : roll ≥ 96 when skill < 50, or roll = 100 always
 */
export type CoCSuccessLevel = 'extreme' | 'hard' | 'regular' | 'failure' | 'fumble'

/** Full result of a CoC percentile check. */
export interface CoCCheckResult {
  /** Raw d100 value (1–100). */
  rollValue: number
  /** The skill or characteristic value tested against. */
  skillValue: number
  /** Resolved success level. */
  successLevel: CoCSuccessLevel
  /** true for any success (regular, hard, or extreme). */
  isSuccess: boolean
  /** true when successLevel is 'extreme' or 'hard'. */
  isSpecialSuccess: boolean
}

/** Result of a CoC 7e opposed roll (two investigators or investigator vs NPC). */
export interface CoCOpposedResult {
  /** Success level of the first participant. */
  level1: CoCSuccessLevel
  /** Success level of the second participant. */
  level2: CoCSuccessLevel
  /** 1 if participant 1 wins, 2 if participant 2 wins, 0 for a tie. */
  winner: 0 | 1 | 2
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Numeric rank for a success level — used to compare opposed rolls.
 * Higher = better.
 */
const LEVEL_RANK: Record<CoCSuccessLevel, number> = {
  extreme: 4,
  hard: 3,
  regular: 2,
  failure: 1,
  fumble: 0,
}

// ── Core functions ────────────────────────────────────────────────────────────

/** Roll a d100. Returns 1–100. */
export const rollPercentile = (): number => roll(100)

/**
 * Determine the success level of a CoC 7e percentile roll.
 *
 * @param rollValue  The d100 result (1–100).
 * @param skillValue The skill or characteristic value (1–100).
 */
export function successLevel(rollValue: number, skillValue: number): CoCSuccessLevel {
  // Fumble: ≥ 96 when skill < 50, or = 100 always
  if (rollValue === 100 || (rollValue >= 96 && skillValue < 50)) return 'fumble'
  if (rollValue <= Math.floor(skillValue / 5)) return 'extreme'
  if (rollValue <= Math.floor(skillValue / 2)) return 'hard'
  if (rollValue <= skillValue) return 'regular'
  return 'failure'
}

/**
 * Perform a full CoC 7e percentile check.
 *
 * @param skillValue The skill value to test against (e.g. 55 for Bibliothèque 55%).
 */
export function cocCheck(skillValue: number): CoCCheckResult {
  const rollValue = rollPercentile()
  const level = successLevel(rollValue, skillValue)
  return {
    rollValue,
    skillValue,
    successLevel: level,
    isSuccess: level === 'regular' || level === 'hard' || level === 'extreme',
    isSpecialSuccess: level === 'hard' || level === 'extreme',
  }
}

/**
 * Resolve a CoC 7e opposed roll between two participants.
 *
 * Rules: each participant rolls. The one with the higher success level wins.
 * On a tie, the participant with the higher skill value wins.
 * On an equal skill value tie, the result is a draw (winner: 0).
 *
 * @param skill1 Skill value of participant 1.
 * @param skill2 Skill value of participant 2.
 */
export function opposedCoCRoll(skill1: number, skill2: number): CoCOpposedResult {
  const r1 = cocCheck(skill1)
  const r2 = cocCheck(skill2)
  const rank1 = LEVEL_RANK[r1.successLevel]
  const rank2 = LEVEL_RANK[r2.successLevel]

  let winner: 0 | 1 | 2
  if (rank1 > rank2) winner = 1
  else if (rank2 > rank1) winner = 2
  else if (skill1 > skill2) winner = 1
  else if (skill2 > skill1) winner = 2
  else winner = 0

  return { level1: r1.successLevel, level2: r2.successLevel, winner }
}
