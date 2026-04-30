import { ok, err, type Result } from '@open-lore-warden/shared'

// ── Types ─────────────────────────────────────────────────────────────────────

/** How a d20 roll is made — normal, with advantage (keep highest), or with disadvantage (keep lowest). */
export type CheckMode = 'normal' | 'advantage' | 'disadvantage'

/**
 * Rich result of a d20 check (ability check, skill check, saving throw, attack roll).
 *
 * Note: isCritical / isFumble are meaningful only on ATTACK ROLLS.
 * Ability checks and saving throws do NOT auto-succeed on a 20 or auto-fail on a 1
 * in most d20 systems (D&D 5e included), unless a specific rule says otherwise.
 */
export interface D20CheckResult {
  /** Raw value of the d20 die before any modifier. */
  naturalRoll: number
  /** naturalRoll + bonus. */
  total: number
  /** The Difficulty Class this roll was tested against. */
  dc: number
  /** true if total >= dc. */
  success: boolean
  /** true if the natural d20 was 20. */
  isCritical: boolean
  /** true if the natural d20 was 1. */
  isFumble: boolean
  /** Roll mode used. */
  mode: CheckMode
}

// ── Core primitives ───────────────────────────────────────────────────────────

/** Roll `count` dice with `sides` faces. Returns the sum. */
export const roll = (sides: number, count = 1): number =>
  Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1).reduce(
    (a, b) => a + b,
    0,
  )

/**
 * Roll 2d20 and keep the highest (advantage mechanic).
 * Returns the single winning die value.
 */
export const rollAdvantage = (): number => Math.max(roll(20), roll(20))

/**
 * Roll 2d20 and keep the lowest (disadvantage mechanic).
 * Returns the single losing die value.
 */
export const rollDisadvantage = (): number => Math.min(roll(20), roll(20))

// ── Internal helpers ──────────────────────────────────────────────────────────

function d20Natural(mode: CheckMode): number {
  if (mode === 'advantage') return rollAdvantage()
  if (mode === 'disadvantage') return rollDisadvantage()
  return roll(20)
}

function buildCheckResult(
  naturalRoll: number,
  bonus: number,
  dc: number,
  mode: CheckMode,
): D20CheckResult {
  const total = naturalRoll + bonus
  return {
    naturalRoll,
    total,
    dc,
    success: total >= dc,
    isCritical: naturalRoll === 20,
    isFumble: naturalRoll === 1,
    mode,
  }
}

// ── Skill / ability checks ────────────────────────────────────────────────────

/**
 * Generic d20 skill / ability check: d20 + bonus vs DC.
 * Supports advantage and disadvantage.
 * Returns a rich result with naturalRoll, total, success, and roll metadata.
 */
export const skillCheck = (
  bonus: number,
  dc: number,
  mode: CheckMode = 'normal',
): D20CheckResult => {
  const natural = d20Natural(mode)
  return buildCheckResult(natural, bonus, dc, mode)
}

/**
 * Generic d20 saving throw: d20 + bonus vs DC.
 * Same mechanics as skillCheck — distinct function for semantic clarity.
 */
export const savingThrow = (
  bonus: number,
  dc: number,
  mode: CheckMode = 'normal',
): D20CheckResult => {
  const natural = d20Natural(mode)
  return buildCheckResult(natural, bonus, dc, mode)
}

// ── Legacy Result<number> wrapper ─────────────────────────────────────────────

/**
 * @deprecated Use `skillCheck()` which returns a rich `D20CheckResult`.
 * Retained for backward-compatibility only.
 */
export const skillCheckLegacy = (bonus: number, dc: number): Result<number> => {
  const result = skillCheck(bonus, dc)
  return result.success
    ? ok(result.total)
    : err(`Failed: rolled ${result.total}, needed ${dc}`)
}
