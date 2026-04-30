import { roll } from '../core/dice'

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Composition of a Year Zero Engine dice pool.
 *
 * Each category of die contributes its 6s as successes.
 * Only base dice (attribute dice) trigger trauma when a 1 is rolled on a push.
 */
export interface YZEDicePool {
  /** Attribute/base dice count. A 1 on these dice after a push = 1 trauma. */
  base: number
  /** Skill dice count. */
  skill: number
  /** Gear dice count. */
  gear: number
}

/** Full result of a YZE dice pool roll. */
export interface YZERollResult {
  /** Pool composition that was rolled. */
  pool: YZEDicePool
  /** Individual base die results. */
  baseDice: number[]
  /** Individual skill die results. */
  skillDice: number[]
  /** Individual gear die results. */
  gearDice: number[]
  /** Total number of 6s across all dice. */
  successes: number
  /**
   * Number of 1s on base dice.
   * Non-zero only if this result was produced by pushRoll — indicates trauma gained.
   */
  baseTragedy: number
  /** true if this result comes from a push (re-roll). */
  pushed: boolean
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function rollDice(count: number): number[] {
  return Array.from({ length: Math.max(0, count) }, () => roll(6))
}

function countSixes(dice: number[]): number {
  return dice.filter(d => d === 6).length
}

function countOnes(dice: number[]): number {
  return dice.filter(d => d === 1).length
}

// ── Core functions ────────────────────────────────────────────────────────────

/**
 * Roll a Year Zero Engine dice pool.
 *
 * Each 6 (any die type) = 1 success. Can be followed by pushRoll.
 *
 * @param pool  Composition of the dice pool (base, skill, gear counts).
 */
export function yzeRoll(pool: YZEDicePool): YZERollResult {
  const baseDice = rollDice(pool.base)
  const skillDice = rollDice(pool.skill)
  const gearDice = rollDice(pool.gear)
  const successes = countSixes(baseDice) + countSixes(skillDice) + countSixes(gearDice)
  return {
    pool,
    baseDice,
    skillDice,
    gearDice,
    successes,
    baseTragedy: 0, // not pushed yet
    pushed: false,
  }
}

/**
 * Push a previous Year Zero Engine roll.
 *
 * Re-rolls all non-6 dice. Any 1s on base dice after the push indicate trauma.
 * Sixes are kept (not re-rolled).
 *
 * Rules note: each 1 on a base die after the push = 1 point of trauma/stress.
 * The caller is responsible for applying the trauma via applyTrauma().
 *
 * @param prev  Result from yzeRoll to push.
 */
export function pushRoll(prev: YZERollResult): YZERollResult {
  const reroll = (dice: number[]): number[] => dice.map(d => (d === 6 ? d : roll(6)))

  const baseDice = reroll(prev.baseDice)
  const skillDice = reroll(prev.skillDice)
  const gearDice = reroll(prev.gearDice)
  const successes = countSixes(baseDice) + countSixes(skillDice) + countSixes(gearDice)
  return {
    pool: prev.pool,
    baseDice,
    skillDice,
    gearDice,
    successes,
    baseTragedy: countOnes(baseDice),
    pushed: true,
  }
}
