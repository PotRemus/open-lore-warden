import { z } from 'zod'

// ── Shared schemas (used by both workflow and resolvers) ──────────────────────

/**
 * Intent extracted from the player's input by the intent-interpreter agent.
 * Defined here (not in the workflow) to avoid circular imports.
 */
export const IntentSchema = z.object({
  actionType: z.string(),
  target: z.string().nullable(),
  targetType: z.string().nullable(),
  verb: z.string(),
  details: z.string(),
  requiresCheck: z.boolean(),
  checkType: z.string().nullable(),
})

export type Intent = z.infer<typeof IntentSchema>

/**
 * Result produced by a RulesResolver.
 * Kept intentionally generic so each system can carry its own fields
 * via `stateChanges` without widening this schema.
 */
export const RulesResultSchema = z.object({
  /** Human-readable label of the check performed (e.g. 'skill_check', 'san_check'). */
  check: z.string().optional(),
  // D&D 5e / generic d20 fields
  naturalRoll: z.number().optional(),
  roll: z.number().optional(),
  success: z.boolean(),
  isCritical: z.boolean().optional(),
  isFumble: z.boolean().optional(),
  mode: z.enum(['normal', 'advantage', 'disadvantage']).optional(),
  damage: z.number().optional(),
  // CoC / BRP specific (shared — values differ per system)
  /**
   * CoC 7e: 'extreme' | 'hard' | 'regular' | 'failure' | 'fumble'.
   * BRP:    'critical' | 'special' | 'success' | 'failure' | 'fumble'.
   */
  successLevel: z.string().optional(),
  /** SAN lost in a CoC sanity check. */
  sanityLost: z.number().optional(),
  /** Whether the investigator is temporarily insane after this check (CoC). */
  isTemporarilyInsane: z.boolean().optional(),
  // Fate Core specific
  /** Net shifts: positive = success, 0 = tie, negative = failure. */
  shifts: z.number().optional(),
  /** Fate outcome label. */
  outcome: z.enum(['success_with_style', 'success', 'tie', 'failure']).optional(),
  /** Individual Fate die results (each -1, 0, or +1). Always 4 values. */
  fateDice: z.array(z.number()).optional(),
  // PbtA (Powered by the Apocalypse) specific
  /** PbtA outcome: 'full_success' | 'partial_success' | 'failure'. */
  pbtaOutcome: z.string().optional(),
  /** Individual PbtA die results [d1, d2]. */
  pbtaDice: z.array(z.number()).optional(),
  /** 2d6 + stat total. */
  pbtaTotal: z.number().optional(),
  // Year Zero Engine specific
  /** Number of successes (6s) in the dice pool. */
  yzeSuccesses: z.number().optional(),
  /** true if this was a pushed roll. */
  yzePushed: z.boolean().optional(),
  /** Trauma gained from 1s on base dice after a push. */
  yzeTrauma: z.number().optional(),
  // Savage Worlds specific
  /** Final Trait die result (including aces). */
  swTraitResult: z.number().optional(),
  /** Final Wild die result (including aces, 0 for Extras). */
  swWildResult: z.number().optional(),
  /** Number of Raises above the Target Number. */
  swRaises: z.number().optional(),
  // Generic state changes surfaced to the API caller
  stateChanges: z.record(z.string(), z.unknown()).optional(),
})

export type RulesResult = z.infer<typeof RulesResultSchema>

// ── Resolver interface ────────────────────────────────────────────────────────

/** Context passed to every RulesResolver. */
export interface ResolverContext {
  /** campaign.system value (e.g. 'dnd5e', 'coc', 'fate'). */
  campaignSystem: string
  /** Resolved intent from the interpret-intent step. */
  intent: Intent
  /** Campaign UUID — available if a resolver needs to look up characters. */
  campaignId: string
}

/**
 * A RulesResolver handles the rules resolution step for one game system.
 * Each system implements this interface and is registered in the strategy map.
 */
export interface RulesResolver {
  resolve(ctx: ResolverContext): Promise<RulesResult>
}
