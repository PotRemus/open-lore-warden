// Generic status effects — system-agnostic.
// For D&D 5e standard conditions (Blinded, Charmed, etc.) see dnd5e/conditions.ts.
export type { StatusId, StatusEffect } from '../statuses'
export { hasStatus, applyStatus, removeStatus, tickStatuses } from '../statuses'
