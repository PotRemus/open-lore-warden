import { traitRoll } from '@open-lore-warden/rules-engine'
import type { SWDieType } from '@open-lore-warden/rules-engine'
import { characterRepository } from '@/repositories/character.repository'
import type { RulesResolver, ResolverContext, RulesResult } from './types'

/**
 * Savage Worlds rules resolver.
 *
 * Resolution strategy:
 * - If the intent requires no check: return success: true.
 * - Otherwise: read the Trait die type from the first character's statsJson
 *   using `intent.checkType` as the skill key
 *   (e.g. checkType="tir" → statsJson.skills.tir = 8 → d8).
 *   Wild Cards (statsJson.isWildCard = true, default for PCs) also roll a d6
 *   Wild die and keep the higher result.
 *
 * checkType conventions for Savage Worlds:
 *   Any skill key from the character sheet (e.g. "tir", "combat", "furtivité",
 *   "persuasion", "conduite", "démotion").
 *
 * intent.details parsing:
 *   - "bonus:N"  → flat modifier (e.g. "bonus:2" for an Edge)
 *   - "tn:N"     → target number override (default 4)
 *
 * Character lookup uses the first character found in the campaign.
 * TODO: pass the active character UUID through the intent for multi-PC support.
 */
export const savageResolver: RulesResolver = {
  async resolve(ctx: ResolverContext): Promise<RulesResult> {
    const { intent, campaignId } = ctx

    if (!intent.requiresCheck || !intent.checkType) {
      return { success: true }
    }

    // Look up character
    const characters = characterRepository.findByCampaignId(campaignId)
    const character = characters[0]
    if (!character) return { success: true, check: intent.checkType }

    let stats: Record<string, unknown>
    try {
      stats = JSON.parse(character.statsJson) as Record<string, unknown>
    } catch {
      return { success: false, check: intent.checkType }
    }

    // Look up die sides from skills
    let dieSides: number = 6 // default d6
    const skillsBlob = stats['skills']
    if (skillsBlob && typeof skillsBlob === 'object') {
      const v = (skillsBlob as Record<string, unknown>)[intent.checkType]
      if (typeof v === 'number') dieSides = v
    }
    const topLevel = stats[intent.checkType]
    if (typeof topLevel === 'number') dieSides = topLevel

    // Clamp to valid Savage Worlds die types
    const validDie: SWDieType = ([4, 6, 8, 10, 12] as number[]).includes(dieSides)
      ? (dieSides as SWDieType)
      : 6

    const isWildCard = (stats['isWildCard'] as boolean | undefined) ?? true

    // Parse optional bonus and target number from details
    const bonusMatch = intent.details?.match(/bonus:(-?\d+)/)
    const tnMatch = intent.details?.match(/tn:(\d+)/)
    const bonus = bonusMatch ? parseInt(bonusMatch[1]!, 10) : 0
    const tn = tnMatch ? parseInt(tnMatch[1]!, 10) : 4

    const result = traitRoll(validDie, isWildCard, bonus, tn)

    return {
      check: intent.checkType,
      roll: result.finalTotal,
      success: result.success,
      swTraitResult: result.traitDie,
      swWildResult: result.wildDie,
      swRaises: result.raises,
      stateChanges: {
        skillKey: intent.checkType,
        dieSides: validDie,
        isWildCard,
        total: result.total,
        bonus: result.bonus,
        targetNumber: result.targetNumber,
        raises: result.raises,
      },
    }
  },
}
