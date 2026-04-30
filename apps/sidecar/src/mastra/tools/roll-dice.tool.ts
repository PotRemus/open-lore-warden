import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { roll, skillCheck } from '@open-lore-warden/rules-engine'

export const rollDiceTool = createTool({
  id: 'roll-dice',
  description: 'Roll one or more dice and return the total. Supports any die size (d4, d6, d8, d10, d12, d20, d100).',
  inputSchema: z.object({
    sides: z.number().int().min(2).describe('Number of faces on each die (e.g. 20 for a d20)'),
    count: z.number().int().min(1).default(1).describe('Number of dice to roll'),
  }),
  outputSchema: z.object({
    total: z.number().int(),
    sides: z.number().int(),
    count: z.number().int(),
  }),
  execute: async ({ sides, count = 1 }) => {
    const total = roll(sides, count)
    return { total, sides, count }
  },
})

export const skillCheckTool = createTool({
  id: 'skill-check',
  description: 'Perform a D&D 5e d20 skill / ability check with a bonus against a Difficulty Class (DC). Supports advantage and disadvantage. Returns the full roll breakdown.',
  inputSchema: z.object({
    bonus: z.number().int().describe('Ability modifier + proficiency bonus applied to the d20 roll'),
    dc: z.number().int().min(1).describe('Difficulty Class — minimum total needed to succeed'),
    mode: z
      .enum(['normal', 'advantage', 'disadvantage'])
      .default('normal')
      .describe('Roll mode: normal (1d20), advantage (2d20 keep highest), disadvantage (2d20 keep lowest)'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    naturalRoll: z.number().int().describe('Raw d20 result before bonus'),
    total: z.number().int().describe('naturalRoll + bonus'),
    dc: z.number().int(),
    isCritical: z.boolean().describe('Natural 20 — relevant for attack rolls'),
    isFumble: z.boolean().describe('Natural 1 — relevant for attack rolls'),
    mode: z.enum(['normal', 'advantage', 'disadvantage']),
  }),
  execute: async ({ bonus, dc, mode = 'normal' }) => {
    const result = skillCheck(bonus, dc, mode)
    return {
      success: result.success,
      naturalRoll: result.naturalRoll,
      total: result.total,
      dc: result.dc,
      isCritical: result.isCritical,
      isFumble: result.isFumble,
      mode: result.mode,
    }
  },
})
