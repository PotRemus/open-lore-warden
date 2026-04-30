// Rules engine — generic core mechanics + D&D 5e + Call of Cthulhu + Fate Core
//   + PbtA + Year Zero Engine + BRP + Savage Worlds.
// System descriptors (metadata for UI + LLM):
export * from './systems'
// Generic (system-agnostic):
export * from './core/dice'
export * from './core/combat'
export * from './core/statuses'
export * from './core/inventory'
export * from './core/quest-state'
export * from './core/scene-progress'
// D&D 5e specific:
export * from './dnd5e/mechanics'
export * from './dnd5e/conditions'
// Call of Cthulhu 7e specific:
export * from './coc/mechanics'
export * from './coc/sanity'
// Fate Core specific:
export * from './fate/dice'
export * from './fate/actions'
export * from './fate/stress'
// PbtA (Powered by the Apocalypse) specific:
export * from './pbta/mechanics'
export * from './pbta/harm'
// Year Zero Engine specific:
export * from './yze/dice'
export * from './yze/stress'
// BRP (Basic Role-Playing) specific:
export * from './brp/mechanics'
export * from './brp/resistance'
// Savage Worlds specific:
export * from './savage/dice'
export * from './savage/wounds'
