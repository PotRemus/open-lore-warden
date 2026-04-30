import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { characterRepository } from '@/repositories/character.repository'
import { fateAction, ladderRating } from '@open-lore-warden/rules-engine'

export const fateRollTool = createTool({
  id: 'fate-roll',
  description:
    'Perform a Fate Core action roll (4dF + skill rating vs opposition). ' +
    'Reads the skill rating from statsJson.skills[skillKey]. ' +
    'Returns shifts, outcome (success_with_style / success / tie / failure), ' +
    'individual dice, and Fate ladder labels for both totals. ' +
    'Use for any Fate action: Overcome, Create Advantage, Attack, or Defend.',
  inputSchema: z.object({
    characterId: z.string().min(1).describe('UUID of the acting character'),
    skillKey: z
      .string()
      .min(1)
      .describe(
        'Key in statsJson.skills to read the skill rating from (e.g. "combat", "athlétisme", "furtivité"). ' +
          'May also be an Approach key for Fate Accelerated (e.g. "fougueux", "prudent").',
      ),
    opposition: z
      .number()
      .int()
      .describe(
        'Passive difficulty (Fate ladder value) or the opponent\'s already-resolved total. ' +
          'Use 0 for Average difficulty, 2 for Fair, 4 for Great, etc.',
      ),
    actionType: z
      .enum(['overcome', 'create_advantage', 'attack', 'defend'])
      .default('overcome')
      .describe('Type of Fate action being attempted'),
  }),
  outputSchema: z.object({
    characterId: z.string(),
    skillKey: z.string(),
    skillRating: z.number().int().describe('Skill value read from statsJson'),
    dice: z
      .array(z.number())
      .length(4)
      .describe('Individual Fate die results (each -1, 0, or +1)'),
    diceTotal: z.number().int().describe('Sum of the 4 dice (-4 to +4)'),
    total: z.number().int().describe('diceTotal + skillRating'),
    totalLabel: z.string().describe('Fate ladder label for the total (e.g. "Bon (+3)")'),
    opposition: z.number().int(),
    oppositionLabel: z.string().describe('Fate ladder label for the opposition'),
    shifts: z.number().int().describe('total − opposition'),
    outcome: z.enum(['success_with_style', 'success', 'tie', 'failure']),
    actionType: z.enum(['overcome', 'create_advantage', 'attack', 'defend']),
  }),
  execute: async ({ characterId, skillKey, opposition, actionType = 'overcome' }) => {
    const character = characterRepository.findById(characterId)
    if (!character) throw new Error(`Character ${characterId} not found`)

    let stats: Record<string, unknown>
    try {
      stats = JSON.parse(character.statsJson) as Record<string, unknown>
    } catch {
      throw new Error(`Character ${characterId} has invalid statsJson`)
    }

    // Look up skill rating: first in nested `skills` object, then top-level
    let skillRating = 0 // default: Mediocre (0)
    const skillsBlob = stats['skills']
    if (skillsBlob && typeof skillsBlob === 'object') {
      const v = (skillsBlob as Record<string, unknown>)[skillKey]
      if (typeof v === 'number') skillRating = v
    }
    const topLevel = stats[skillKey]
    if (typeof topLevel === 'number') skillRating = topLevel

    const result = fateAction(skillRating, opposition, actionType)

    return {
      characterId,
      skillKey,
      skillRating,
      dice: [...result.dice],
      diceTotal: result.diceTotal,
      total: result.total,
      totalLabel: ladderRating(result.total),
      opposition,
      oppositionLabel: ladderRating(opposition),
      shifts: result.shifts,
      outcome: result.outcome,
      actionType: result.actionType,
    }
  },
})
