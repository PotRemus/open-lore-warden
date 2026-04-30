import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { memoryRepository } from '@/repositories/memory.repository'

export const storeMemoryTool = createTool({
  id: 'store-memory',
  description:
    'Persist a notable fact or event as a campaign memory. Used by LoreKeeperAgent after each turn to capture important information for future context retrieval.',
  inputSchema: z.object({
    campaignId: z.string().min(1),
    entityType: z
      .enum(['campaign', 'character', 'npc', 'location', 'quest', 'faction'])
      .describe('Category of the entity this memory concerns'),
    entityId: z.string().optional().describe('UUID of the specific entity, if any'),
    memoryType: z
      .enum(['event', 'relationship', 'discovery', 'lore', 'decision'])
      .describe('Type of information being stored'),
    content: z.string().min(1).describe('The memory content in plain text'),
    importance: z
      .number()
      .int()
      .min(1)
      .max(10)
      .default(5)
      .describe('Importance from 1 (trivial) to 10 (critical)'),
    sourceTurnId: z.string().optional().describe('UUID of the turn that produced this memory'),
  }),
  outputSchema: z.object({
    id: z.string(),
    content: z.string(),
    importance: z.number(),
    createdAt: z.string(),
  }),
  execute: async ({ campaignId, entityType, entityId, memoryType, content, importance, sourceTurnId }) => {
    const memory = memoryRepository.create({
      campaignId,
      entityType,
      entityId,
      memoryType,
      content,
      importance,
      sourceTurnId,
    })
    return {
      id: memory.id,
      content: memory.content,
      importance: memory.importance,
      createdAt: memory.createdAt,
    }
  },
})
