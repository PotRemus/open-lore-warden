import { ok, err, type Result } from '@open-lore-warden/shared'

export type SceneStatus = 'pending' | 'active' | 'completed' | 'skipped'

export interface SceneState {
  id: string
  status: SceneStatus
  /** JSON-encoded exit requirements checked against active flags. */
  exitConditionsJson?: string
}

/** Activate a pending scene. */
export function activateScene(scene: SceneState): Result<SceneState> {
  if (scene.status !== 'pending') {
    return err(`Scene ${scene.id} is already ${scene.status}`)
  }
  return ok({ ...scene, status: 'active' })
}

/**
 * Attempt to complete a scene by verifying its exit conditions.
 * `activeFlags` is the set of campaign flags currently set to true.
 */
export function completeScene(
  scene: SceneState,
  activeFlags: Set<string>,
): Result<SceneState> {
  if (scene.status !== 'active') {
    return err(`Scene ${scene.id} is not active (current: ${scene.status})`)
  }

  if (scene.exitConditionsJson) {
    let conditions: string[]
    try {
      conditions = JSON.parse(scene.exitConditionsJson) as string[]
    } catch {
      return err(`Malformed exitConditionsJson on scene ${scene.id}`)
    }
    const unmet = conditions.filter((c) => !activeFlags.has(c))
    if (unmet.length > 0) {
      return err(`Exit conditions not met: ${unmet.join(', ')}`)
    }
  }

  return ok({ ...scene, status: 'completed' })
}

/** Skip a scene regardless of conditions (GM override). */
export function skipScene(scene: SceneState): Result<SceneState> {
  if (scene.status === 'completed' || scene.status === 'skipped') {
    return err(`Scene ${scene.id} is already ${scene.status}`)
  }
  return ok({ ...scene, status: 'skipped' })
}
