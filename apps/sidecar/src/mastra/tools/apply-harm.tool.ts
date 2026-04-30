import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { characterRepository } from '@/repositories/character.repository'
import { applyHarm, healHarm } from '@open-lore-warden/rules-engine'

export const applyHarmTool = createTool({
  id: 'apply-harm',
  description:
    'Apply or heal Harm on a PbtA character, or mark a Debility. ' +
    'Reads and writes statsJson.harm (0–harmMax, default max 6). ' +
    'isDown is true when harm reaches harmMax (character is out of action). ' +
    'Use mode "debility" to mark a persistent condition (statsJson.debilities).',
  inputSchema: z.object({
    characterId: z.string().min(1).describe('UUID of the target character'),
    mode: z
      .enum(['harm', 'heal', 'debility'])
      .describe(
        '"harm" to inflict harm points, ' +
          '"heal" to recover harm points, ' +
          '"debility" to mark a debility (persistent condition).',
      ),
    amount: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe('Number of harm points (required for modes "harm" and "heal")'),
    debilityKey: z
      .string()
      .optional()
      .describe('Key in statsJson.debilities to set to true (required for mode "debility")'),
  }),
  outputSchema: z.object({
    characterId: z.string(),
    mode: z.enum(['harm', 'heal', 'debility']),
    harmBefore: z.number().int().optional(),
    harmAfter: z.number().int().optional(),
    isDown: z.boolean().optional(),
    debilityKey: z.string().optional(),
  }),
  execute: async ({ characterId, mode, amount, debilityKey }) => {
    const character = characterRepository.findById(characterId)
    if (!character) throw new Error(`Character ${characterId} not found`)

    let stats: Record<string, unknown>
    try {
      stats = JSON.parse(character.statsJson) as Record<string, unknown>
    } catch {
      throw new Error(`Character ${characterId} has invalid statsJson`)
    }

    if (mode === 'harm') {
      if (amount === undefined) throw new Error('"amount" is required for mode "harm"')
      const result = applyHarm(stats, amount)
      const updated = { ...stats, harm: result.harmAfter }
      characterRepository.update(characterId, { statsJson: JSON.stringify(updated) })
      return { characterId, mode, harmBefore: result.harmBefore, harmAfter: result.harmAfter, isDown: result.isDown }
    }

    if (mode === 'heal') {
      if (amount === undefined) throw new Error('"amount" is required for mode "heal"')
      const result = healHarm(stats, amount)
      const updated = { ...stats, harm: result.harmAfter }
      characterRepository.update(characterId, { statsJson: JSON.stringify(updated) })
      return { characterId, mode, harmBefore: result.harmBefore, harmAfter: result.harmAfter, isDown: result.isDown }
    }

    // mode === 'debility'
    if (!debilityKey) throw new Error('"debilityKey" is required for mode "debility"')
    const debilities = (stats['debilities'] as Record<string, unknown> | undefined) ?? {}
    const updated = { ...stats, debilities: { ...debilities, [debilityKey]: true } }
    characterRepository.update(characterId, { statsJson: JSON.stringify(updated) })
    return { characterId, mode, debilityKey }
  },
})
