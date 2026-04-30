import { ok, err, type Result } from '@open-lore-warden/shared'

export type StatusId = string

export interface StatusEffect {
  id: StatusId
  label: string
  /** Remaining turns, or undefined for permanent until removed. */
  durationTurns?: number
}

/** Returns true when the given status is active on the list. */
export function hasStatus(statuses: StatusEffect[], id: StatusId): boolean {
  return statuses.some((s) => s.id === id)
}

/** Applies a status. If already present, refreshes duration. Returns updated list. */
export function applyStatus(
  statuses: StatusEffect[],
  effect: StatusEffect,
): StatusEffect[] {
  const filtered = statuses.filter((s) => s.id !== effect.id)
  return [...filtered, effect]
}

/** Removes a status by id. Returns an err if not present. */
export function removeStatus(
  statuses: StatusEffect[],
  id: StatusId,
): Result<StatusEffect[]> {
  if (!hasStatus(statuses, id)) return err(`Status ${id} not active`)
  return ok(statuses.filter((s) => s.id !== id))
}

/**
 * Decrements duration for all timed statuses by one turn.
 * Expired statuses (duration reaches 0) are automatically removed.
 * Returns the updated list.
 */
export function tickStatuses(statuses: StatusEffect[]): StatusEffect[] {
  return statuses
    .map((s) =>
      s.durationTurns !== undefined
        ? { ...s, durationTurns: s.durationTurns - 1 }
        : s,
    )
    .filter((s) => s.durationTurns === undefined || s.durationTurns > 0)
}
