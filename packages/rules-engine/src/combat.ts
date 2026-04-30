// Backward-compat stub — source of truth has moved to the structured modules.
// Generic combat (resolveAttack, applyDamage, applyHealing, rollInitiative, Combatant, AttackResult):
export * from './core/combat'
// D&D 5e death saving throw (DeathSaveResult, deathSavingThrow):
export { type DeathSaveResult, deathSavingThrow } from './dnd5e/mechanics'
