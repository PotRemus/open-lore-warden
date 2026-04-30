import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { npcRepository } from '@/repositories/npc.repository'

export const moveActorTool = createTool({
  id: 'move-actor',
  description:
    'Move an NPC to a new location. Updates the locationId field in the database.',
  inputSchema: z.object({
    npcId: z.string().min(1).describe('UUID of the NPC to move'),
    locationId: z.string().min(1).describe('UUID of the destination location'),
  }),
  outputSchema: z.object({
    npcId: z.string(),
    previousLocationId: z.string().optional(),
    newLocationId: z.string(),
  }),
  execute: async ({ npcId, locationId }) => {
    const npc = npcRepository.findById(npcId)
    if (!npc) throw new Error(`NPC ${npcId} not found`)
    const previousLocationId = npc.locationId
    npcRepository.update(npcId, { locationId })
    return {
      npcId,
      previousLocationId,
      newLocationId: locationId,
    }
  },
})
