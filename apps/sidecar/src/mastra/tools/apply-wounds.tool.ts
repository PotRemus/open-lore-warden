import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { characterRepository } from '@/repositories/character.repository'
import { applyShaken, applyWound, recoverShaken } from '@open-lore-warden/rules-engine'

export const applyWoundsTool = createTool({
  id: 'apply-wounds',
  description:
    'Apply Shaken or Wounds to a Savage Worlds character, or recover Shaken status. ' +
    'Reads and writes statsJson.shaken and statsJson.wounds. ' +
    'Mode "shaken": sets Shaken; if already Shaken, inflicts 1 Wound instead. ' +
    'Mode "wound": inflicts N Wounds (also sets Shaken). ' +
    'Mode "recover": removes Shaken (does NOT remove Wounds). ' +
    'isIncapacitated is true when wounds > woundsMax (default 3).',
  inputSchema: z.object({
    characterId: z.string().min(1).describe('UUID of the target character'),
    mode: z
      .enum(['shaken', 'wound', 'recover'])
      .describe(
        '"shaken" to apply Shaken (or 1 Wound if already Shaken), ' +
          '"wound" to apply N Wounds, ' +
          '"recover" to remove Shaken status.',
      ),
    count: z
      .number()
      .int()
      .min(1)
      .default(1)
      .describe('Number of wounds to apply (used by mode "wound" only)'),
  }),
  outputSchema: z.object({
    characterId: z.string(),
    mode: z.enum(['shaken', 'wound', 'recover']),
    wasShaken: z.boolean(),
    isShaken: z.boolean(),
    woundsBefore: z.number().int(),
    woundsAfter: z.number().int(),
    isIncapacitated: z.boolean(),
  }),
  execute: async ({ characterId, mode, count }) => {
    const character = characterRepository.findById(characterId)
    if (!character) throw new Error(`Character ${characterId} not found`)

    let stats: Record<string, unknown>
    try {
      stats = JSON.parse(character.statsJson) as Record<string, unknown>
    } catch {
      throw new Error(`Character ${characterId} has invalid statsJson`)
    }

    let result
    if (mode === 'shaken') {
      result = applyShaken(stats)
    } else if (mode === 'wound') {
      result = applyWound(stats, count)
    } else {
      result = recoverShaken(stats)
    }

    const updated = {
      ...stats,
      shaken: result.isShaken,
      wounds: result.woundsAfter,
    }
    characterRepository.update(characterId, { statsJson: JSON.stringify(updated) })

    return {
      characterId,
      mode,
      wasShaken: result.wasShaken,
      isShaken: result.isShaken,
      woundsBefore: result.woundsBefore,
      woundsAfter: result.woundsAfter,
      isIncapacitated: result.isIncapacitated,
    }
  },
})
