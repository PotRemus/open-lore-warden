import { dnd5eResolver } from './dnd5e'
import { cocResolver } from './coc'
import { fateResolver } from './fate'
import { pbtaResolver } from './pbta'
import { yzeResolver } from './yze'
import { brpResolver } from './brp'
import { savageResolver } from './savage'
import type { RulesResolver } from './types'

// ── Strategy map ──────────────────────────────────────────────────────────────

/**
 * Maps campaign.system identifiers to their RulesResolver implementation.
 *
 * Supported values:
 *   'dnd5e'  → D&D 5e (d20 skill checks, advantage/disadvantage)
 *   'coc'    → Call of Cthulhu 7e (d100 percentile, sanity)
 *   'fate'   → Fate Core (4dF, shifts, ladder)
 *   'pbta'   → Powered by the Apocalypse (2d6+stat, 10+ / 7-9 / 6-)
 *   'yze'    → Year Zero Engine (d6 pool, push/trauma)
 *   'brp'    → Basic Role-Playing (d100 critical/special/success, resistance table)
 *   'savage' → Savage Worlds (Trait die + Wild die, aces, raises)
 *
 * Add a new entry here when integrating a new game system.
 * The key must match the value stored in campaigns.system (case-sensitive).
 */
const resolvers: Record<string, RulesResolver> = {
  dnd5e: dnd5eResolver,
  coc: cocResolver,
  fate: fateResolver,
  pbta: pbtaResolver,
  yze: yzeResolver,
  brp: brpResolver,
  savage: savageResolver,
}

/**
 * Return the RulesResolver for a given game system.
 * Falls back to the D&D 5e resolver if the system is unknown,
 * so existing campaigns keep working without interruption.
 *
 * @param system  The campaign.system string (e.g. 'dnd5e', 'coc', 'fate').
 */
export function getResolver(system: string): RulesResolver {
  return resolvers[system] ?? resolvers['dnd5e']!
}

export type { RulesResolver, ResolverContext, RulesResult, Intent } from './types'
export { IntentSchema, RulesResultSchema } from './types'
