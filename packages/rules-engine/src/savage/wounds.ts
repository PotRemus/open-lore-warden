// ── Types ─────────────────────────────────────────────────────────────────────

/** Result of applying or recovering the Shaken/Wounds state in Savage Worlds. */
export interface WoundResult {
  /** Shaken state before the change. */
  wasShaken: boolean
  /** Shaken state after the change. */
  isShaken: boolean
  /** Wounds before the change. */
  woundsBefore: number
  /** Wounds after the change. */
  woundsAfter: number
  /**
   * true when woundsAfter > woundsMax.
   * At this point the character is Incapacitated.
   */
  isIncapacitated: boolean
}

// ── Core functions ────────────────────────────────────────────────────────────

/**
 * Apply the Shaken condition to a Savage Worlds character.
 *
 * Rules:
 * - If the character is already Shaken, applying Shaken again inflicts 1 Wound.
 * - `statsJson.woundsMax` defaults to 3.
 *
 * Does NOT mutate the object — the caller must patch statsJson before persisting.
 *
 * @param statsJson  Parsed statsJson of the character.
 */
export function applyShaken(statsJson: Record<string, unknown>): WoundResult {
  const wasShaken = (statsJson['shaken'] as boolean | undefined) ?? false
  const woundsBefore = (statsJson['wounds'] as number | undefined) ?? 0
  const woundsMax = (statsJson['woundsMax'] as number | undefined) ?? 3
  // Already Shaken → 1 Wound instead
  const woundsAfter = wasShaken ? Math.min(woundsMax + 1, woundsBefore + 1) : woundsBefore
  return {
    wasShaken,
    isShaken: true,
    woundsBefore,
    woundsAfter,
    isIncapacitated: woundsAfter > woundsMax,
  }
}

/**
 * Apply one or more Wounds to a Savage Worlds character.
 *
 * Wounds also set the Shaken condition automatically.
 *
 * @param statsJson  Parsed statsJson of the character.
 * @param count      Number of wounds to apply (default 1).
 */
export function applyWound(
  statsJson: Record<string, unknown>,
  count: number = 1,
): WoundResult {
  const wasShaken = (statsJson['shaken'] as boolean | undefined) ?? false
  const woundsBefore = (statsJson['wounds'] as number | undefined) ?? 0
  const woundsMax = (statsJson['woundsMax'] as number | undefined) ?? 3
  const woundsAfter = Math.min(woundsMax + 1, woundsBefore + count)
  return {
    wasShaken,
    isShaken: true,
    woundsBefore,
    woundsAfter,
    isIncapacitated: woundsAfter > woundsMax,
  }
}

/**
 * Remove the Shaken condition (character recovers from Shaken at start of turn).
 *
 * Does NOT remove Wounds — wounds require medical attention or rest.
 *
 * @param statsJson  Parsed statsJson of the character.
 */
export function recoverShaken(statsJson: Record<string, unknown>): WoundResult {
  const woundsBefore = (statsJson['wounds'] as number | undefined) ?? 0
  const woundsMax = (statsJson['woundsMax'] as number | undefined) ?? 3
  return {
    wasShaken: (statsJson['shaken'] as boolean | undefined) ?? false,
    isShaken: false,
    woundsBefore,
    woundsAfter: woundsBefore,
    isIncapacitated: woundsBefore > woundsMax,
  }
}
