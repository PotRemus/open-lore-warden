// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Single Fate die result.
 * A Fate die (dF) has 6 faces: 2×(-1), 2×(0), 2×(+1).
 */
export type FateDieResult = -1 | 0 | 1

/** Result of rolling 4 Fate dice. */
export interface FateDiceRoll {
  /** Individual die results (always 4). */
  dice: [FateDieResult, FateDieResult, FateDieResult, FateDieResult]
  /** Sum of all dice (-4 to +4). */
  total: number
}

// ── Fate ladder ───────────────────────────────────────────────────────────────

/**
 * The Fate Core adjective ladder (French labels, as used in narration).
 *
 * Standard range in play: -2 (Terrible) to +8 (Légendaire).
 * Values outside this range are valid but uncommon.
 */
export const FATE_LADDER: Readonly<Record<number, string>> = {
  8: 'Légendaire',
  7: 'Épique',
  6: 'Fantastique',
  5: 'Superbe',
  4: 'Excellent',
  3: 'Bon',
  2: 'Correct',
  1: 'Moyen',
  0: 'Médiocre',
  [-1]: 'Mauvais',
  [-2]: 'Terrible',
}

/**
 * Return the Fate ladder label for a numeric rating, with sign annotation.
 * Values outside [-2, +8] return a generic formatted string.
 *
 * Examples: 3 → "Bon (+3)", 0 → "Médiocre (0)", -1 → "Mauvais (-1)"
 */
export function ladderRating(value: number): string {
  const label = FATE_LADDER[value]
  const sign = value > 0 ? '+' : ''
  return label ? `${label} (${sign}${value})` : `${sign}${value}`
}

// ── Dice ──────────────────────────────────────────────────────────────────────

/**
 * Roll a single Fate die.
 * Distribution: P(-1) = P(0) = P(+1) = 1/3.
 */
export const rollFateDie = (): FateDieResult => (Math.floor(Math.random() * 3) - 1) as FateDieResult

/**
 * Roll 4 Fate dice and return the individual results and their sum.
 * The sum ranges from -4 to +4.
 */
export function rollFateDice(): FateDiceRoll {
  const dice = [
    rollFateDie(),
    rollFateDie(),
    rollFateDie(),
    rollFateDie(),
  ] as FateDiceRoll['dice']
  return { dice, total: dice.reduce((acc: number, d) => acc + d, 0) }
}
