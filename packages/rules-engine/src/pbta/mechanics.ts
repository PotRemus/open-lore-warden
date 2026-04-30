import { roll } from '../core/dice'

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * PbtA (Powered by the Apocalypse) outcome, determined by the 2d6+stat total.
 *
 * | Total | Outcome          | Description                        |
 * |-------|------------------|------------------------------------|
 * | 10+   | full_success     | Tu fais ce que tu voulais.         |
 * | 7–9   | partial_success  | Tu réussis, mais avec un coût.     |
 * | 6−    | failure          | Le MJ fait un mouvement.           |
 */
export type PbtAOutcome = 'full_success' | 'partial_success' | 'failure'

/** Full result of a PbtA 2d6+stat roll. */
export interface PbtARollResult {
  /** Individual die results [d1, d2]. */
  dice: [number, number]
  /** Stat modifier applied to the roll. */
  stat: number
  /** d1 + d2 + stat. */
  total: number
  /** Resolved outcome. */
  outcome: PbtAOutcome
}

// ── Core functions ────────────────────────────────────────────────────────────

/**
 * Determine the PbtA outcome from a roll total.
 *
 * @param total  2d6 + stat modifier.
 */
export function pbtaOutcome(total: number): PbtAOutcome {
  if (total >= 10) return 'full_success'
  if (total >= 7) return 'partial_success'
  return 'failure'
}

/**
 * French label for a PbtA outcome, suitable for display in a narrative.
 *
 * @param outcome The resolved PbtA outcome.
 */
export function outcomeLabel(outcome: PbtAOutcome): string {
  switch (outcome) {
    case 'full_success': return 'Succès complet (10+)'
    case 'partial_success': return 'Succès partiel (7-9)'
    case 'failure': return 'Échec (6-)'
  }
}

/**
 * Perform a PbtA 2d6+stat roll.
 *
 * @param statValue  The stat modifier to add (typically −2 to +3).
 */
export function pbtaRoll(statValue: number): PbtARollResult {
  const d1 = roll(6)
  const d2 = roll(6)
  const total = d1 + d2 + statValue
  return {
    dice: [d1, d2],
    stat: statValue,
    total,
    outcome: pbtaOutcome(total),
  }
}
