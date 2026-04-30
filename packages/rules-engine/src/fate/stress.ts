// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Fate Core stress track type.
 *
 * - `physical` : tracked against Physical stress (resisted with Physique).
 * - `mental`   : tracked against Mental stress (resisted with Will).
 */
export type StressTrackType = 'physical' | 'mental'

/**
 * Fate Core consequence slots and the shifts they absorb.
 *
 * | Slot     | Shifts absorbed |
 * |----------|-----------------|
 * | mild     | 2               |
 * | moderate | 4               |
 * | severe   | 6               |
 */
export type ConsequenceSlot = 'mild' | 'moderate' | 'severe'

/** Shifts absorbed by each consequence slot. */
export const CONSEQUENCE_SHIFTS: Readonly<Record<ConsequenceSlot, number>> = {
  mild: 2,
  moderate: 4,
  severe: 6,
}

/** Result of applying stress to a character's stress track. */
export interface StressApplicationResult {
  /** Stress amount that was applied. */
  amount: number
  trackType: StressTrackType
  /**
   * 1-indexed box number that was checked, or null if no box could absorb it.
   * In Fate Core the box at position N absorbs exactly N shifts of stress.
   */
  boxChecked: number | null
  /** true if the stress was fully absorbed by a box. */
  absorbed: boolean
  /** Unabsorbed stress that must be handled by a consequence or being taken out. */
  overflow: number
  /** true when no box was available — the character must take a consequence or be taken out. */
  mustTakeConsequenceOrOut: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTrackKey(trackType: StressTrackType): string {
  return trackType === 'physical' ? 'physicalStress' : 'mentalStress'
}

/**
 * Read a stress track from a parsed statsJson object.
 * Returns a boolean array where index 0 = box 1, index 1 = box 2, etc.
 * Defaults to 3 unchecked boxes if the key is absent.
 */
function readTrack(stats: Record<string, unknown>, trackKey: string): boolean[] {
  const raw = stats[trackKey]
  if (Array.isArray(raw)) return raw as boolean[]
  return [false, false, false]
}

// ── Stress ────────────────────────────────────────────────────────────────────

/**
 * Apply stress to a character's stress track.
 *
 * Fate Core rule: to absorb N stress, check the stress box whose value is
 * exactly N (or higher if N's box is already checked). The lowest eligible
 * unchecked box is used.
 *
 * Returns the result and an updated statsJson string (pure — does not mutate).
 *
 * @param statsJson  Current statsJson of the character.
 * @param amount     Stress to absorb (equals shifts from an attack).
 * @param trackType  'physical' or 'mental'.
 */
export function applyStress(
  statsJson: string,
  amount: number,
  trackType: StressTrackType,
): { result: StressApplicationResult; updatedStatsJson: string } {
  const stats = JSON.parse(statsJson) as Record<string, unknown>
  const trackKey = getTrackKey(trackType)
  const track = readTrack(stats, trackKey)

  // Find the lowest unchecked box whose 1-indexed position >= amount
  let boxChecked: number | null = null
  for (let i = amount - 1; i < track.length; i++) {
    if (!track[i]) {
      boxChecked = i + 1 // 1-indexed
      break
    }
  }

  if (boxChecked !== null) {
    const newTrack = [...track]
    newTrack[boxChecked - 1] = true
    return {
      result: {
        amount,
        trackType,
        boxChecked,
        absorbed: true,
        overflow: 0,
        mustTakeConsequenceOrOut: false,
      },
      updatedStatsJson: JSON.stringify({ ...stats, [trackKey]: newTrack }),
    }
  }

  // No suitable box — character must take a consequence or be taken out
  return {
    result: {
      amount,
      trackType,
      boxChecked: null,
      absorbed: false,
      overflow: amount,
      mustTakeConsequenceOrOut: true,
    },
    updatedStatsJson: statsJson,
  }
}

// ── Consequences ──────────────────────────────────────────────────────────────

/**
 * Write an Aspect name into a consequence slot on a character's statsJson.
 *
 * Does NOT apply stress — the caller decides whether a consequence is taken
 * in lieu of stress or as a result of overflow.
 * Pure — does not mutate.
 *
 * @param statsJson  Current statsJson of the character.
 * @param slot       Consequence slot to fill ('mild', 'moderate', 'severe').
 * @param aspectName Free-form Aspect text (e.g. "Cheville foulée").
 * @throws If the slot is already filled.
 */
export function applyConsequence(
  statsJson: string,
  slot: ConsequenceSlot,
  aspectName: string,
): { shiftsAbsorbed: number; updatedStatsJson: string } {
  const stats = JSON.parse(statsJson) as Record<string, unknown>
  const consequences = { ...((stats['consequences'] as Record<string, string | null>) ?? {}) }

  if (consequences[slot] !== null && consequences[slot] !== undefined) {
    throw new Error(`Consequence slot "${slot}" is already filled: "${consequences[slot]}"`)
  }

  return {
    shiftsAbsorbed: CONSEQUENCE_SHIFTS[slot],
    updatedStatsJson: JSON.stringify({ ...stats, consequences: { ...consequences, [slot]: aspectName } }),
  }
}

/**
 * Clear a consequence slot after recovery.
 * Pure — does not mutate.
 *
 * @param statsJson Current statsJson of the character.
 * @param slot      Slot to clear.
 */
export function clearConsequence(statsJson: string, slot: ConsequenceSlot): string {
  const stats = JSON.parse(statsJson) as Record<string, unknown>
  const consequences = { ...((stats['consequences'] as Record<string, string | null>) ?? {}) }
  consequences[slot] = null
  return JSON.stringify({ ...stats, consequences })
}

// ── Stress track recovery ─────────────────────────────────────────────────────

/**
 * Clear all checked boxes on a stress track (end-of-scene / end-of-conflict recovery).
 * Pure — does not mutate.
 */
export function clearStressTrack(statsJson: string, trackType: StressTrackType): string {
  const stats = JSON.parse(statsJson) as Record<string, unknown>
  const trackKey = getTrackKey(trackType)
  const track = readTrack(stats, trackKey)
  return JSON.stringify({ ...stats, [trackKey]: track.map(() => false) })
}
