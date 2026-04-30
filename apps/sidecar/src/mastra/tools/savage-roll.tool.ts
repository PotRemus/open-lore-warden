import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { characterRepository } from '@/repositories/character.repository'
import { traitRoll } from '@open-lore-warden/rules-engine'
import type { SWDieType } from '@open-lore-warden/rules-engine'

export const savageRollTool = createTool({
  id: 'savage-roll',
  description:
    'Perform a Savage Worlds Trait roll (Trait die + Wild die for Wild Cards). ' +
    'Reads the die type from statsJson.skills[skillKey] ' +
    '(an integer: 4, 6, 8, 10, or 12 for d4–d12). ' +
    'Reads isWildCard from statsJson.isWildCard (default true for PCs). ' +
    'Aces (exploding dice) are applied automatically. ' +
    'Returns the individual die results, the final total, success, and raises.',
  inputSchema: z.object({
    characterId: z.string().min(1).describe('UUID of the acting character'),
    skillKey: z
      .string()
      .min(1)
      .describe(
        'Key in statsJson.skills for the Trait die sides ' +
          '(e.g. "tir" with value 8 = d8, "combat" with value 6 = d6).',
      ),
    bonus: z
      .number()
      .int()
      .default(0)
      .describe('Flat modifier to add after the roll (Trait Edge bonus, situational modifier)'),
    targetNumber: z
      .number()
      .int()
      .default(4)
      .describe('Target Number (default 4 in Savage Worlds Adventure Edition)'),
  }),
  outputSchema: z.object({
    characterId: z.string(),
    skillKey: z.string(),
    dieSides: z.number().int(),
    traitDie: z.number().int().describe('Trait die result (with aces)'),
    wildDie: z.number().int().describe('Wild die result (with aces, 0 for Extras)'),
    total: z.number().int().describe('Higher of trait die and wild die'),
    bonus: z.number().int(),
    finalTotal: z.number().int().describe('total + bonus'),
    targetNumber: z.number().int(),
    success: z.boolean(),
    raises: z.number().int(),
    isWildCard: z.boolean(),
  }),
  execute: async ({ characterId, skillKey, bonus, targetNumber }) => {
    const character = characterRepository.findById(characterId)
    if (!character) throw new Error(`Character ${characterId} not found`)

    let stats: Record<string, unknown>
    try {
      stats = JSON.parse(character.statsJson) as Record<string, unknown>
    } catch {
      throw new Error(`Character ${characterId} has invalid statsJson`)
    }

    // Look up die sides from skills
    let dieSides = 6 // default d6
    const skillsBlob = stats['skills']
    if (skillsBlob && typeof skillsBlob === 'object') {
      const v = (skillsBlob as Record<string, unknown>)[skillKey]
      if (typeof v === 'number') dieSides = v
    }
    const topLevel = stats[skillKey]
    if (typeof topLevel === 'number') dieSides = topLevel

    // Clamp to valid Savage Worlds die types
    const validDie = ([4, 6, 8, 10, 12] as number[]).includes(dieSides)
      ? (dieSides as SWDieType)
      : 6

    const isWildCard = (stats['isWildCard'] as boolean | undefined) ?? true

    const result = traitRoll(validDie, isWildCard, bonus, targetNumber)
    return {
      characterId,
      skillKey,
      dieSides: validDie,
      traitDie: result.traitDie,
      wildDie: result.wildDie,
      total: result.total,
      bonus: result.bonus,
      finalTotal: result.finalTotal,
      targetNumber: result.targetNumber,
      success: result.success,
      raises: result.raises,
      isWildCard: result.isWildCard,
    }
  },
})
