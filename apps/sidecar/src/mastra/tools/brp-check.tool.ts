import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { characterRepository } from '@/repositories/character.repository'
import { brpCheck, resistanceRoll } from '@open-lore-warden/rules-engine'

export const brpCheckTool = createTool({
  id: 'brp-check',
  description:
    'Perform a BRP (Basic Role-Playing) percentile skill check or Resistance Roll. ' +
    'Skill check: reads skill value from statsJson.skills[skillKey], rolls d100, ' +
    'and returns a success level: critical / special / success / failure / fumble. ' +
    'Resistance roll: uses two characteristic values (active vs passive) to compute ' +
    'the chance (50 + (active − passive) × 5) and rolls against it. ' +
    'Compatible with RuneQuest, Stormbringer, and other BRP derivatives.',
  inputSchema: z.object({
    characterId: z.string().min(1).describe('UUID of the acting character'),
    mode: z
      .enum(['skill', 'resistance'])
      .default('skill')
      .describe(
        '"skill" for a standard percentile skill check. ' +
          '"resistance" for a Resistance Roll between two characteristic values.',
      ),
    skillKey: z
      .string()
      .optional()
      .describe('Key in statsJson.skills for mode "skill" (e.g. "épée", "esquive", "perception")'),
    activeValue: z
      .number()
      .int()
      .optional()
      .describe('Active characteristic value for mode "resistance" (e.g. STR of the attacker)'),
    passiveValue: z
      .number()
      .int()
      .optional()
      .describe('Passive characteristic value for mode "resistance" (e.g. STR of the defender)'),
  }),
  outputSchema: z.object({
    characterId: z.string(),
    mode: z.enum(['skill', 'resistance']),
    // skill mode
    skillKey: z.string().optional(),
    skillValue: z.number().int().optional(),
    roll: z.number().int().optional(),
    successLevel: z.string().optional(),
    criticalThreshold: z.number().int().optional(),
    specialThreshold: z.number().int().optional(),
    // resistance mode
    chance: z.number().int().optional(),
    success: z.boolean().optional(),
    activeValue: z.number().int().optional(),
    passiveValue: z.number().int().optional(),
  }),
  execute: async ({ characterId, mode = 'skill', skillKey, activeValue, passiveValue }) => {
    const character = characterRepository.findById(characterId)
    if (!character) throw new Error(`Character ${characterId} not found`)

    if (mode === 'resistance') {
      if (activeValue === undefined) throw new Error('"activeValue" is required for mode "resistance"')
      if (passiveValue === undefined) throw new Error('"passiveValue" is required for mode "resistance"')
      const result = resistanceRoll(activeValue, passiveValue)
      return {
        characterId,
        mode: 'resistance' as const,
        roll: result.roll,
        chance: result.chance,
        success: result.success,
        activeValue: result.activeValue,
        passiveValue: result.passiveValue,
      }
    }

    // mode === 'skill'
    if (!skillKey) throw new Error('"skillKey" is required for mode "skill"')

    let stats: Record<string, unknown>
    try {
      stats = JSON.parse(character.statsJson) as Record<string, unknown>
    } catch {
      throw new Error(`Character ${characterId} has invalid statsJson`)
    }

    let skillValue = 25 // default fallback
    const skillsBlob = stats['skills']
    if (skillsBlob && typeof skillsBlob === 'object') {
      const v = (skillsBlob as Record<string, unknown>)[skillKey]
      if (typeof v === 'number') skillValue = v
    }
    const topLevel = stats[skillKey]
    if (typeof topLevel === 'number') skillValue = topLevel

    const result = brpCheck(skillValue)
    return {
      characterId,
      mode: 'skill' as const,
      skillKey,
      skillValue,
      roll: result.roll,
      successLevel: result.successLevel,
      criticalThreshold: result.criticalThreshold,
      specialThreshold: result.specialThreshold,
      success: result.successLevel !== 'failure' && result.successLevel !== 'fumble',
    }
  },
})
