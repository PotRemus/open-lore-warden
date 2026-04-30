// ── Types ─────────────────────────────────────────────────────────────────────

/** Result of applying or healing Harm on a PbtA character. */
export interface HarmResult {
  /** Harm level before the change. */
  harmBefore: number
  /** Harm level after the change. */
  harmAfter: number
  /** true when harmAfter >= harmMax (character is down / out of action). */
  isDown: boolean
}

// ── Core functions ────────────────────────────────────────────────────────────

/**
 * Apply harm to a PbtA character.
 *
 * Reads `statsJson.harm` and `statsJson.harmMax` (defaults: 0 and 6).
 * Does NOT mutate the object — the caller must patch statsJson before persisting.
 *
 * @param statsJson  Parsed statsJson of the character.
 * @param amount     Number of harm points to inflict.
 * @returns          HarmResult with before/after values and isDown flag.
 */
export function applyHarm(
  statsJson: Record<string, unknown>,
  amount: number,
): HarmResult {
  const harmBefore = (statsJson['harm'] as number | undefined) ?? 0
  const harmMax = (statsJson['harmMax'] as number | undefined) ?? 6
  const harmAfter = Math.min(harmMax, harmBefore + amount)
  return {
    harmBefore,
    harmAfter,
    isDown: harmAfter >= harmMax,
  }
}

/**
 * Heal harm on a PbtA character.
 *
 * @param statsJson  Parsed statsJson of the character.
 * @param amount     Number of harm points to recover.
 * @returns          HarmResult with before/after values.
 */
export function healHarm(
  statsJson: Record<string, unknown>,
  amount: number,
): HarmResult {
  const harmBefore = (statsJson['harm'] as number | undefined) ?? 0
  const harmMax = (statsJson['harmMax'] as number | undefined) ?? 6
  const harmAfter = Math.max(0, harmBefore - amount)
  return {
    harmBefore,
    harmAfter,
    isDown: harmAfter >= harmMax,
  }
}
