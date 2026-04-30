import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { questRepository } from '@/repositories/quest.repository'

export const getQuestStateTool = createTool({
  id: 'get-quest-state',
  description: 'Retrieve the current state and progress of a quest.',
  inputSchema: z.object({
    questId: z.string().min(1).describe('UUID of the quest'),
  }),
  outputSchema: z.object({
    id: z.string(),
    title: z.string(),
    category: z.string(),
    status: z.string(),
    summary: z.string().optional(),
    progressJson: z.string().optional(),
  }),
  execute: async ({ questId }) => {
    const quest = questRepository.findById(questId)
    if (!quest) throw new Error(`Quest ${questId} not found`)
    return {
      id: quest.id,
      title: quest.title,
      category: quest.category,
      status: quest.status,
      summary: quest.summary,
      progressJson: quest.progressJson,
    }
  },
})
