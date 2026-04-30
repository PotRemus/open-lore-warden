import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { characterRepository } from '@/repositories/character.repository'
import { applyStress, applyConsequence, clearStressTrack } from '@open-lore-warden/rules-engine'

export const applyStressTool = createTool({
  id: 'apply-stress',
  description:
    'Apply stress or a consequence to a Fate Core character. ' +
    'Reads the stress track from statsJson and checks the lowest eligible box. ' +
    'If no box is available, returns mustTakeConsequenceOrOut: true — ' +
    'call again with mode "consequence" to absorb the overflow with an Aspect. ' +
    'Use mode "clear" to reset a stress track at end of conflict.',
  inputSchema: z.object({
    characterId: z.string().min(1).describe('UUID of the target character'),
    mode: z
      .enum(['stress', 'consequence', 'clear'])
      .describe(
        '"stress" to apply stress boxes, "consequence" to fill a consequence slot, "clear" to reset a track.',
      ),
    trackType: z
      .enum(['physical', 'mental'])
      .describe('Which stress track to operate on'),
    amount: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe('Stress amount to absorb (required for mode "stress")'),
    consequenceSlot: z
      .enum(['mild', 'moderate', 'severe'])
      .optional()
      .describe('Slot to fill (required for mode "consequence")'),
    aspectName: z
      .string()
      .optional()
      .describe('Aspect text for the consequence (required for mode "consequence")'),
  }),
  outputSchema: z.object({
    characterId: z.string(),
    mode: z.enum(['stress', 'consequence', 'clear']),
    // stress mode
    boxChecked: z.number().int().nullable().optional(),
    absorbed: z.boolean().optional(),
    overflow: z.number().int().optional(),
    mustTakeConsequenceOrOut: z.boolean().optional(),
    // consequence mode
    consequenceSlot: z.enum(['mild', 'moderate', 'severe']).nullable().optional(),
    shiftsAbsorbed: z.number().int().optional(),
    aspectName: z.string().optional(),
  }),
  execute: async ({ characterId, mode, trackType, amount, consequenceSlot, aspectName }) => {
    const character = characterRepository.findById(characterId)
    if (!character) throw new Error(`Character ${characterId} not found`)

    if (mode === 'stress') {
      if (amount === undefined) throw new Error('"amount" is required for mode "stress"')
      const { result, updatedStatsJson } = applyStress(character.statsJson, amount, trackType)
      characterRepository.update(characterId, { statsJson: updatedStatsJson })
      return {
        characterId,
        mode,
        boxChecked: result.boxChecked,
        absorbed: result.absorbed,
        overflow: result.overflow,
        mustTakeConsequenceOrOut: result.mustTakeConsequenceOrOut,
      }
    }

    if (mode === 'consequence') {
      if (!consequenceSlot) throw new Error('"consequenceSlot" is required for mode "consequence"')
      if (!aspectName) throw new Error('"aspectName" is required for mode "consequence"')
      const { shiftsAbsorbed, updatedStatsJson } = applyConsequence(
        character.statsJson,
        consequenceSlot,
        aspectName,
      )
      characterRepository.update(characterId, { statsJson: updatedStatsJson })
      return {
        characterId,
        mode,
        consequenceSlot,
        shiftsAbsorbed,
        aspectName,
      }
    }

    // mode === 'clear'
    const updatedStatsJson = clearStressTrack(character.statsJson, trackType)
    characterRepository.update(characterId, { statsJson: updatedStatsJson })
    return { characterId, mode }
  },
})
