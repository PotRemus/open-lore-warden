import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { characterRepository } from '@/repositories/character.repository'
import { sanityCheck, applySanityLoss, insanityThreshold } from '@open-lore-warden/rules-engine'

export const applySanityLossTool = createTool({
  id: 'apply-sanity-loss',
  description:
    'Roll a Call of Cthulhu 7e Sanity check and persist the resulting SAN loss to the character. ' +
    'Reads `sanity` from statsJson, rolls d100, resolves loss from the notation (e.g. "0/1d6"), ' +
    'and writes the new sanity value back. ' +
    'Returns whether the investigator is temporarily or permanently insane.',
  inputSchema: z.object({
    characterId: z.string().min(1).describe('UUID of the investigator'),
    sanLossNotation: z
      .string()
      .min(1)
      .describe(
        'CoC SAN loss notation: "successLoss/failureLoss". ' +
          'Examples: "0/1d6" (no loss on success, 1d6 on fail), "1/1d8", "0/1d3".',
      ),
  }),
  outputSchema: z.object({
    characterId: z.string(),
    rollValue: z.number().int().describe('Raw d100 result'),
    successLevel: z.enum(['extreme', 'hard', 'regular', 'failure', 'fumble']),
    isSuccess: z.boolean(),
    previousSanity: z.number().int(),
    sanityLost: z.number().int(),
    newSanity: z.number().int(),
    /** Losing ≥ 5 SAN in one check triggers temporary insanity (CoC 7e rule). */
    isTemporarilyInsane: z.boolean(),
    /** SAN reached 0 — permanent insanity. */
    isPermanentlyInsane: z.boolean(),
    /** 1/5 of current SAN — the indefinite insanity threshold for this session. */
    insanityThreshold: z.number().int(),
  }),
  execute: async ({ characterId, sanLossNotation }) => {
    const character = characterRepository.findById(characterId)
    if (!character) throw new Error(`Character ${characterId} not found`)

    let stats: Record<string, unknown>
    try {
      stats = JSON.parse(character.statsJson) as Record<string, unknown>
    } catch {
      throw new Error(`Character ${characterId} has invalid statsJson`)
    }

    if (typeof stats['sanity'] !== 'number') {
      throw new Error(
        `Character ${characterId} does not have a numeric "sanity" field in statsJson. ` +
          'CoC characters must have statsJson.sanity set.',
      )
    }

    const currentSanity = stats['sanity'] as number
    const result = sanityCheck(currentSanity, sanLossNotation)

    // Persist the new sanity value into statsJson
    const updatedStatsJson = applySanityLoss(character.statsJson, result.sanityLost)
    characterRepository.update(characterId, { statsJson: updatedStatsJson })

    return {
      characterId,
      rollValue: result.rollValue,
      successLevel: result.successLevel,
      isSuccess: result.isSuccess,
      previousSanity: currentSanity,
      sanityLost: result.sanityLost,
      newSanity: result.newSanity,
      isTemporarilyInsane: result.isTemporarilyInsane,
      isPermanentlyInsane: result.isPermanentlyInsane,
      insanityThreshold: insanityThreshold(currentSanity),
    }
  },
})
