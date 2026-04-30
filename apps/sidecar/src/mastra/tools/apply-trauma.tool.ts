import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { characterRepository } from '@/repositories/character.repository'
import { applyTrauma, recoverStress } from '@open-lore-warden/rules-engine'

export const applyTraumaTool = createTool({
  id: 'apply-trauma',
  description:
    'Apply trauma (stress) to or recover stress from a YZE character. ' +
    'Reads and writes statsJson.stress (0–stressMax, default max 10). ' +
    'isBroken is true when stress reaches stressMax (character is broken). ' +
    'Use mode "trauma" after a pushed roll to apply 1s on base dice as trauma. ' +
    'Use mode "recover" after rest or healing.',
  inputSchema: z.object({
    characterId: z.string().min(1).describe('UUID of the target character'),
    mode: z
      .enum(['trauma', 'recover'])
      .describe('"trauma" to add stress, "recover" to remove stress'),
    amount: z.number().int().min(1).describe('Number of stress points to apply or recover'),
  }),
  outputSchema: z.object({
    characterId: z.string(),
    mode: z.enum(['trauma', 'recover']),
    stressBefore: z.number().int(),
    stressAfter: z.number().int(),
    traumaGained: z.number().int(),
    isBroken: z.boolean(),
  }),
  execute: async ({ characterId, mode, amount }) => {
    const character = characterRepository.findById(characterId)
    if (!character) throw new Error(`Character ${characterId} not found`)

    let stats: Record<string, unknown>
    try {
      stats = JSON.parse(character.statsJson) as Record<string, unknown>
    } catch {
      throw new Error(`Character ${characterId} has invalid statsJson`)
    }

    const result = mode === 'trauma' ? applyTrauma(stats, amount) : recoverStress(stats, amount)
    const updated = { ...stats, stress: result.stressAfter }
    characterRepository.update(characterId, { statsJson: JSON.stringify(updated) })

    return {
      characterId,
      mode,
      stressBefore: result.stressBefore,
      stressAfter: result.stressAfter,
      traumaGained: result.traumaGained,
      isBroken: result.isBroken,
    }
  },
})
