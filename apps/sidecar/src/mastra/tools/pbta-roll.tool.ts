import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { characterRepository } from '@/repositories/character.repository'
import { pbtaRoll, outcomeLabel } from '@open-lore-warden/rules-engine'

export const pbtaRollTool = createTool({
  id: 'pbta-roll',
  description:
    'Perform a PbtA (Powered by the Apocalypse) 2d6+stat roll. ' +
    'Reads the stat modifier from statsJson.stats[statKey]. ' +
    'Returns the two dice, the total, and the outcome: ' +
    '"full_success" (10+), "partial_success" (7-9), or "failure" (6-). ' +
    'Use for any PbtA move that calls for a roll+STAT.',
  inputSchema: z.object({
    characterId: z.string().min(1).describe('UUID of the acting character'),
    statKey: z
      .string()
      .min(1)
      .describe(
        'Key in statsJson.stats to read the stat modifier from ' +
          '(e.g. "cool", "hard", "hot", "sharp", "weird", "forceful", "quick").',
      ),
  }),
  outputSchema: z.object({
    characterId: z.string(),
    statKey: z.string(),
    statValue: z.number().int().describe('Stat modifier read from statsJson'),
    dice: z.array(z.number().int()).length(2).describe('Individual die results [d1, d2]'),
    total: z.number().int().describe('d1 + d2 + stat'),
    outcome: z.enum(['full_success', 'partial_success', 'failure']),
    outcomeLabel: z.string().describe('French narrative label for the outcome'),
  }),
  execute: async ({ characterId, statKey }) => {
    const character = characterRepository.findById(characterId)
    if (!character) throw new Error(`Character ${characterId} not found`)

    let stats: Record<string, unknown>
    try {
      stats = JSON.parse(character.statsJson) as Record<string, unknown>
    } catch {
      throw new Error(`Character ${characterId} has invalid statsJson`)
    }

    // Look up stat modifier: in nested `stats` object
    let statValue = 0
    const statsBlob = stats['stats']
    if (statsBlob && typeof statsBlob === 'object') {
      const v = (statsBlob as Record<string, unknown>)[statKey]
      if (typeof v === 'number') statValue = v
    }
    // Also check top-level as fallback
    const topLevel = stats[statKey]
    if (typeof topLevel === 'number') statValue = topLevel

    const result = pbtaRoll(statValue)

    return {
      characterId,
      statKey,
      statValue,
      dice: [...result.dice],
      total: result.total,
      outcome: result.outcome,
      outcomeLabel: outcomeLabel(result.outcome),
    }
  },
})
