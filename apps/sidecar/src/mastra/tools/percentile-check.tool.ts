import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { characterRepository } from '@/repositories/character.repository'
import { cocCheck } from '@open-lore-warden/rules-engine'

export const percentileCheckTool = createTool({
  id: 'percentile-check',
  description:
    'Perform a Call of Cthulhu 7e percentile check. ' +
    'Reads the skill value from the character statsJson by key, rolls d100, ' +
    'and returns the full result including success level (extreme / hard / regular / failure / fumble). ' +
    'Use for any CoC skill check: Library Use, Spot Hidden, combat skills, etc.',
  inputSchema: z.object({
    characterId: z.string().min(1).describe('UUID of the character making the check'),
    skillKey: z
      .string()
      .min(1)
      .describe(
        'Key in statsJson.skills to read the skill value from (e.g. "bibliothèque", "écoute", "pistolet"). ' +
          'May also be a top-level statsJson key for characteristics (e.g. "FOR", "CON").',
      ),
  }),
  outputSchema: z.object({
    characterId: z.string(),
    skillKey: z.string(),
    skillValue: z.number().int().describe('Skill value found in statsJson'),
    rollValue: z.number().int().describe('Raw d100 result (1–100)'),
    successLevel: z
      .enum(['extreme', 'hard', 'regular', 'failure', 'fumble'])
      .describe('CoC 7e success level'),
    isSuccess: z.boolean(),
    isSpecialSuccess: z.boolean().describe('true for hard or extreme success'),
  }),
  execute: async ({ characterId, skillKey }) => {
    const character = characterRepository.findById(characterId)
    if (!character) throw new Error(`Character ${characterId} not found`)

    let stats: Record<string, unknown>
    try {
      stats = JSON.parse(character.statsJson) as Record<string, unknown>
    } catch {
      throw new Error(`Character ${characterId} has invalid statsJson`)
    }

    // Look up skill value: first in the nested `skills` object, then at the top level.
    let skillValue: number | undefined
    const skillsBlob = stats['skills']
    if (skillsBlob && typeof skillsBlob === 'object') {
      const v = (skillsBlob as Record<string, unknown>)[skillKey]
      if (typeof v === 'number') skillValue = v
    }
    if (skillValue === undefined) {
      const v = stats[skillKey]
      if (typeof v === 'number') skillValue = v
    }

    if (skillValue === undefined) {
      throw new Error(
        `Skill "${skillKey}" not found in statsJson for character ${characterId}. ` +
          `Check that statsJson contains skills.${skillKey} or a top-level ${skillKey} key.`,
      )
    }

    const result = cocCheck(skillValue)

    return {
      characterId,
      skillKey,
      skillValue,
      rollValue: result.rollValue,
      successLevel: result.successLevel,
      isSuccess: result.isSuccess,
      isSpecialSuccess: result.isSpecialSuccess,
    }
  },
})
