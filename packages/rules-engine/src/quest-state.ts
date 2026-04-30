import { ok, err, type Result } from '@open-lore-warden/shared'

export type QuestStatus = 'inactive' | 'active' | 'completed' | 'failed'

export interface QuestState {
  id: string
  status: QuestStatus
  progressJson: string
}

/** Transition a quest to a new status, enforcing valid transitions. */
export function transitionQuest(
  quest: QuestState,
  next: QuestStatus,
): Result<QuestState> {
  const allowed: Record<QuestStatus, QuestStatus[]> = {
    inactive: ['active'],
    active: ['completed', 'failed'],
    completed: [],
    failed: [],
  }
  if (!allowed[quest.status].includes(next)) {
    return err(`Cannot transition quest ${quest.id} from ${quest.status} to ${next}`)
  }
  return ok({ ...quest, status: next })
}

/**
 * Check whether all required flags for a quest completion are satisfied.
 * `requiredFlags` lists flag keys that must be present in `activeFlags`.
 */
export function isQuestCompletable(
  quest: QuestState,
  requiredFlags: string[],
  activeFlags: Set<string>,
): boolean {
  if (quest.status !== 'active') return false
  return requiredFlags.every((f) => activeFlags.has(f))
}

/** Update the progress JSON payload on a quest. */
export function updateQuestProgress(
  quest: QuestState,
  patch: Record<string, unknown>,
): Result<QuestState> {
  if (quest.status !== 'active') {
    return err(`Cannot update progress on a ${quest.status} quest`)
  }
  let existing: Record<string, unknown> = {}
  try {
    existing = JSON.parse(quest.progressJson) as Record<string, unknown>
  } catch {
    // start fresh if the stored JSON is malformed
  }
  return ok({ ...quest, progressJson: JSON.stringify({ ...existing, ...patch }) })
}
