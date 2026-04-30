import { rollPercentile } from '../coc/mechanics'

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Result of a BRP Resistance Roll.
 *
 * Formula: chance = 50 + (active − passive) × 5, clamped to [5, 95].
 * Roll d100 ≤ chance to succeed.
 *
 * Used to resolve direct opposition between two characteristic values
 * (e.g. STR vs STR to escape a grapple, POW vs POW for magic resistance).
 */
export interface ResistanceResult {
  /** Raw d100 result (1–100). */
  roll: number
  /** Computed chance of success (5–95). */
  chance: number
  /** true if roll ≤ chance. */
  success: boolean
  /** Active (attacking) characteristic value. */
  activeValue: number
  /** Passive (defending) characteristic value. */
  passiveValue: number
}

// ── Core function ─────────────────────────────────────────────────────────────

/**
 * Perform a BRP Resistance Roll.
 *
 * @param active   The acting characteristic value (e.g. STR of the attacker).
 * @param passive  The resisting characteristic value (e.g. STR of the defender).
 */
export function resistanceRoll(active: number, passive: number): ResistanceResult {
  const chance = Math.max(5, Math.min(95, 50 + (active - passive) * 5))
  const rollValue = rollPercentile()
  return {
    roll: rollValue,
    chance,
    success: rollValue <= chance,
    activeValue: active,
    passiveValue: passive,
  }
}
