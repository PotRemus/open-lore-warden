import { ok, err, type Result } from '@open-lore-warden/shared'
import { roll, type CheckMode } from './dice'

// ── Interfaces ────────────────────────────────────────────────────────────────

/**
 * A generic combatant applicable to any d20-based system.
 * `defense` is the target number an attack roll must meet or beat to hit
 * (equivalent to Armor Class in D&D, Defense Rating in other systems, etc.).
 */
export interface Combatant {
  id: string
  name: string
  hpCurrent: number
  hpMax: number
  /** Generic defense value — called "Armor Class" in D&D, "Defense" in other systems. */
  defense: number
  initiativeBonus: number
  attackBonus: number
  /** Number of faces on the damage die (e.g. 8 for d8). */
  damageDice: number
  damageBonus: number
}

/**
 * Result of a single attack resolution.
 * The Combatant arguments are never mutated — callers receive the new HP via
 * `defenderHpAfter` and are responsible for persisting the change.
 */
export interface AttackResult {
  attackerName: string
  defenderName: string
  /** Raw d20 value before any attack bonus. */
  naturalRoll: number
  /** naturalRoll + attackBonus. */
  attackRoll: number
  hit: boolean
  /**
   * Natural 20 → auto-hit regardless of defense, damage dice are doubled.
   * A critical hit always sets `hit: true`.
   */
  isCritical: boolean
  /**
   * Natural 1 → auto-miss regardless of attack bonus or defense value.
   * A fumble always sets `hit: false` and `damage: 0`.
   */
  isFumble: boolean
  /** Damage dealt (0 on a miss). */
  damage: number
  /** Number of damage dice rolled (doubled on a critical hit). */
  diceRolled: number
  defenderHpBefore: number
  defenderHpAfter: number
}

// ── Attack resolution ─────────────────────────────────────────────────────────

/**
 * Resolve a single attack (generic d20 system).
 *
 * Rules:
 * - Natural 20 → auto-hit, double the number of damage dice.
 * - Natural 1  → auto-miss, 0 damage.
 * - Advantage / disadvantage via `mode`.
 * - The `defender` argument is NEVER mutated; `defenderHpAfter` carries the new value.
 */
export function resolveAttack(
  attacker: Combatant,
  defender: Combatant,
  mode: CheckMode = 'normal',
): Result<AttackResult> {
  const d20a = roll(20)
  const d20b = mode !== 'normal' ? roll(20) : d20a
  let naturalRoll: number
  if (mode === 'advantage') naturalRoll = Math.max(d20a, d20b)
  else if (mode === 'disadvantage') naturalRoll = Math.min(d20a, d20b)
  else naturalRoll = d20a

  const isCritical = naturalRoll === 20
  const isFumble = naturalRoll === 1
  const attackRoll = naturalRoll + attacker.attackBonus

  // Critical always hits, fumble always misses
  const hit = isCritical || (!isFumble && attackRoll >= defender.defense)

  let damage = 0
  let diceRolled = 1
  if (hit) {
    // Critical hit: double the NUMBER of dice, not the final total
    diceRolled = isCritical ? 2 : 1
    damage = Math.max(0, roll(attacker.damageDice, diceRolled) + attacker.damageBonus)
  }

  const defenderHpBefore = defender.hpCurrent
  const defenderHpAfter = Math.max(0, defenderHpBefore - damage)

  return ok({
    attackerName: attacker.name,
    defenderName: defender.name,
    naturalRoll,
    attackRoll,
    hit,
    isCritical,
    isFumble,
    damage,
    diceRolled,
    defenderHpBefore,
    defenderHpAfter,
  })
}

// ── HP helpers ────────────────────────────────────────────────────────────────

/** Apply damage to a combatant. Returns the new HP value (minimum 0). Pure — does not mutate. */
export function applyDamage(
  target: Pick<Combatant, 'id' | 'name' | 'hpCurrent' | 'hpMax'>,
  amount: number,
): Result<number> {
  if (amount < 0) return err('Damage amount must be non-negative')
  return ok(Math.max(0, target.hpCurrent - amount))
}

/** Apply healing to a combatant. Returns the new HP value (maximum hpMax). Pure — does not mutate. */
export function applyHealing(
  target: Pick<Combatant, 'id' | 'name' | 'hpCurrent' | 'hpMax'>,
  amount: number,
): Result<number> {
  if (amount < 0) return err('Healing amount must be non-negative')
  return ok(Math.min(target.hpMax, target.hpCurrent + amount))
}

// ── Initiative ────────────────────────────────────────────────────────────────

/** Roll initiative (d20 + initiativeBonus) for a group. Returns sorted descending. */
export function rollInitiative(
  combatants: Pick<Combatant, 'id' | 'name' | 'initiativeBonus'>[],
): Array<{ id: string; name: string; initiative: number }> {
  return combatants
    .map((c) => ({ id: c.id, name: c.name, initiative: roll(20) + c.initiativeBonus }))
    .sort((a, b) => b.initiative - a.initiative)
}
