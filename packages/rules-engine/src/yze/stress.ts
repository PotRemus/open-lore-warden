// ── Types ─────────────────────────────────────────────────────────────────────

/** Result of applying or recovering stress/trauma in Year Zero Engine. */
export interface TraumaResult {
  /** Stress level before the change. */
  stressBefore: number
  /** Stress level after the change. */
  stressAfter: number
  /** Trauma actually added (may be less than requested if cap was reached). */
  traumaGained: number
  /** true when stressAfter >= stressMax (character is broken). */
  isBroken: boolean
}

// ── Core functions ────────────────────────────────────────────────────────────

/**
 * Apply trauma to a YZE character after a pushed roll.
 *
 * Reads `statsJson.stress` and `statsJson.stressMax` (defaults: 0 and 10).
 * Does NOT mutate the object — the caller must patch statsJson before persisting.
 *
 * @param statsJson  Parsed statsJson of the character.
 * @param trauma     Number of trauma points to apply (= number of 1s on base dice after push).
 */
export function applyTrauma(
  statsJson: Record<string, unknown>,
  trauma: number,
): TraumaResult {
  const stressBefore = (statsJson['stress'] as number | undefined) ?? 0
  const stressMax = (statsJson['stressMax'] as number | undefined) ?? 10
  const traumaGained = Math.min(trauma, stressMax - stressBefore)
  const stressAfter = Math.min(stressMax, stressBefore + trauma)
  return {
    stressBefore,
    stressAfter,
    traumaGained,
    isBroken: stressAfter >= stressMax,
  }
}

/**
 * Recover stress from a YZE character (rest, healing action, etc.).
 *
 * @param statsJson  Parsed statsJson of the character.
 * @param amount     Number of stress points to recover.
 */
export function recoverStress(
  statsJson: Record<string, unknown>,
  amount: number,
): TraumaResult {
  const stressBefore = (statsJson['stress'] as number | undefined) ?? 0
  const stressMax = (statsJson['stressMax'] as number | undefined) ?? 10
  const stressAfter = Math.max(0, stressBefore - amount)
  return {
    stressBefore,
    stressAfter,
    traumaGained: 0,
    isBroken: stressAfter >= stressMax,
  }
}
