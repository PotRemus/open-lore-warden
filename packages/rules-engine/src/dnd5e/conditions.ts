import type { StatusEffect } from '../statuses'
import type { CheckMode } from '../core/dice'

// ── Condition identifiers ─────────────────────────────────────────────────────

/**
 * The 15 standard conditions defined in D&D 5e (SRD 5.1).
 * These are the only values accepted by `CONDITIONS`.
 */
export type ConditionId =
  | 'blinded'
  | 'charmed'
  | 'deafened'
  | 'exhausted'
  | 'frightened'
  | 'grappled'
  | 'incapacitated'
  | 'invisible'
  | 'paralyzed'
  | 'petrified'
  | 'poisoned'
  | 'prone'
  | 'restrained'
  | 'stunned'
  | 'unconscious'

// ── Condition mechanics ───────────────────────────────────────────────────────

/**
 * Mechanical effects of a D&D 5e condition.
 * Only the effects relevant to the sidecar's rules resolution are modelled here.
 */
export interface ConditionEffect {
  id: ConditionId
  /** French display label shown in narration / UI. */
  label: string
  /**
   * Checks and saves on which this condition imposes disadvantage.
   * Values are free-form keys used by the rules engine (e.g. 'attack', 'str_check').
   */
  imposesDisadvantage: string[]
  /**
   * If true, attack rolls AGAINST this creature have advantage.
   * (Blind, paralyzed, petrified, stunned, unconscious.)
   */
  grantsAdvantageToAttackers: boolean
  /**
   * If true, attack rolls MADE BY this creature have advantage.
   * (Invisible.)
   */
  grantsAdvantageToSelf: boolean
  /**
   * If true, the creature cannot take actions, bonus actions, or reactions.
   * (Incapacitated, paralyzed, petrified, stunned, unconscious.)
   */
  preventsActions: boolean
  /**
   * If true, the creature's speed becomes 0 and cannot benefit from speed bonuses.
   * (Grappled, paralyzed, petrified, stunned, unconscious.)
   */
  preventsMovement: boolean
  /**
   * Saving throw types this condition causes to automatically fail.
   * E.g. paralyzed → ['str_save', 'dex_save']
   */
  autoFailsSaves: string[]
}

// ── Condition catalogue ───────────────────────────────────────────────────────

export const CONDITIONS: Readonly<Record<ConditionId, ConditionEffect>> = {
  blinded: {
    id: 'blinded',
    label: 'Aveuglé',
    imposesDisadvantage: ['attack'],
    grantsAdvantageToAttackers: true,
    grantsAdvantageToSelf: false,
    preventsActions: false,
    preventsMovement: false,
    autoFailsSaves: [],
  },
  charmed: {
    id: 'charmed',
    label: 'Charmé',
    imposesDisadvantage: [],
    grantsAdvantageToAttackers: false,
    grantsAdvantageToSelf: false,
    preventsActions: false,
    preventsMovement: false,
    autoFailsSaves: [],
  },
  deafened: {
    id: 'deafened',
    label: 'Assourdi',
    imposesDisadvantage: [],
    grantsAdvantageToAttackers: false,
    grantsAdvantageToSelf: false,
    preventsActions: false,
    preventsMovement: false,
    autoFailsSaves: [],
  },
  exhausted: {
    // Exhaustion has 6 levels in 5e; we model level 1+ effects here.
    id: 'exhausted',
    label: 'Épuisé',
    imposesDisadvantage: ['ability_check'],
    grantsAdvantageToAttackers: false,
    grantsAdvantageToSelf: false,
    preventsActions: false,
    preventsMovement: false,
    autoFailsSaves: [],
  },
  frightened: {
    id: 'frightened',
    label: 'Effrayé',
    imposesDisadvantage: ['attack', 'ability_check'],
    grantsAdvantageToAttackers: false,
    grantsAdvantageToSelf: false,
    preventsActions: false,
    preventsMovement: false,
    autoFailsSaves: [],
  },
  grappled: {
    id: 'grappled',
    label: 'Empoigné',
    imposesDisadvantage: [],
    grantsAdvantageToAttackers: false,
    grantsAdvantageToSelf: false,
    preventsActions: false,
    preventsMovement: true,
    autoFailsSaves: [],
  },
  incapacitated: {
    id: 'incapacitated',
    label: 'Incapacité',
    imposesDisadvantage: [],
    grantsAdvantageToAttackers: false,
    grantsAdvantageToSelf: false,
    preventsActions: true,
    preventsMovement: false,
    autoFailsSaves: [],
  },
  invisible: {
    id: 'invisible',
    label: 'Invisible',
    imposesDisadvantage: [],
    grantsAdvantageToAttackers: false,
    grantsAdvantageToSelf: true,
    preventsActions: false,
    preventsMovement: false,
    autoFailsSaves: [],
  },
  paralyzed: {
    id: 'paralyzed',
    label: 'Paralysé',
    imposesDisadvantage: ['attack'],
    grantsAdvantageToAttackers: true,
    grantsAdvantageToSelf: false,
    preventsActions: true,
    preventsMovement: true,
    autoFailsSaves: ['str_save', 'dex_save'],
  },
  petrified: {
    id: 'petrified',
    label: 'Pétrifié',
    imposesDisadvantage: ['attack', 'ability_check'],
    grantsAdvantageToAttackers: true,
    grantsAdvantageToSelf: false,
    preventsActions: true,
    preventsMovement: true,
    autoFailsSaves: ['str_save', 'dex_save'],
  },
  poisoned: {
    id: 'poisoned',
    label: 'Empoisonné',
    imposesDisadvantage: ['attack', 'ability_check'],
    grantsAdvantageToAttackers: false,
    grantsAdvantageToSelf: false,
    preventsActions: false,
    preventsMovement: false,
    autoFailsSaves: [],
  },
  prone: {
    id: 'prone',
    label: 'À terre',
    imposesDisadvantage: ['attack'],
    // Melee attacks against a prone creature have advantage; ranged have disadvantage.
    // We mark grantsAdvantageToAttackers: true and let callers handle the range distinction.
    grantsAdvantageToAttackers: true,
    grantsAdvantageToSelf: false,
    preventsActions: false,
    preventsMovement: false,
    autoFailsSaves: [],
  },
  restrained: {
    id: 'restrained',
    label: 'Entravé',
    imposesDisadvantage: ['attack', 'dex_save'],
    grantsAdvantageToAttackers: true,
    grantsAdvantageToSelf: false,
    preventsActions: false,
    preventsMovement: true,
    autoFailsSaves: [],
  },
  stunned: {
    id: 'stunned',
    label: 'Étourdi',
    imposesDisadvantage: [],
    grantsAdvantageToAttackers: true,
    grantsAdvantageToSelf: false,
    preventsActions: true,
    preventsMovement: true,
    autoFailsSaves: ['str_save', 'dex_save'],
  },
  unconscious: {
    id: 'unconscious',
    label: 'Inconscient',
    imposesDisadvantage: ['attack', 'ability_check'],
    grantsAdvantageToAttackers: true,
    grantsAdvantageToSelf: false,
    preventsActions: true,
    preventsMovement: true,
    autoFailsSaves: ['str_save', 'dex_save'],
  },
}

// ── Utility functions ─────────────────────────────────────────────────────────

/** Look up a condition's effect record by its id. */
export function getCondition(id: ConditionId): ConditionEffect {
  return CONDITIONS[id]
}

/**
 * Collect all active D&D 5e `ConditionEffect`s from a list of `StatusEffect`s.
 * Ignores status ids that are not valid `ConditionId`s (custom statuses).
 */
export function getConditionsForCombatant(statuses: StatusEffect[]): ConditionEffect[] {
  const results: ConditionEffect[] = []
  for (const s of statuses) {
    const cond = CONDITIONS[s.id as ConditionId]
    if (cond) results.push(cond)
  }
  return results
}

/**
 * Determine the effective `CheckMode` for an action by combining the actor's and
 * target's active conditions.
 *
 * Rules (D&D 5e PHB):
 * - Advantage and disadvantage cancel each other out regardless of sources → normal.
 * - Multiple sources of advantage don't stack (still just advantage).
 * - Multiple sources of disadvantage don't stack (still just disadvantage).
 *
 * @param actorConditions  Conditions affecting the creature making the roll.
 * @param checkType        The type of check being made (e.g. 'attack', 'ability_check').
 * @param targetConditions Conditions on the target (relevant for attack rolls).
 */
export function resolveCheckMode(
  actorConditions: ConditionEffect[],
  checkType: string,
  targetConditions: ConditionEffect[] = [],
): CheckMode {
  let hasAdvantage = false
  let hasDisadvantage = false

  // Actor-side disadvantage (e.g. blinded, frightened, poisoned)
  for (const cond of actorConditions) {
    if (cond.imposesDisadvantage.includes(checkType)) hasDisadvantage = true
    if (cond.grantsAdvantageToSelf && checkType === 'attack') hasAdvantage = true
  }

  // Target-side advantage grants (e.g. defender is blinded, prone, paralyzed)
  if (checkType === 'attack') {
    for (const cond of targetConditions) {
      if (cond.grantsAdvantageToAttackers) hasAdvantage = true
    }
  }

  // Advantage and disadvantage cancel each other out
  if (hasAdvantage && hasDisadvantage) return 'normal'
  if (hasAdvantage) return 'advantage'
  if (hasDisadvantage) return 'disadvantage'
  return 'normal'
}
