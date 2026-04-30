import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { npcRepository } from '@/repositories/npc.repository'

export const getNpcProfileTool = createTool({
  id: 'get-npc-profile',
  description:
    'Retrieve the profile of an NPC: name, summary, disposition, and faction. Does NOT expose secret notes to the agent.',
  inputSchema: z.object({
    npcId: z.string().min(1).describe('UUID of the NPC'),
  }),
  outputSchema: z.object({
    id: z.string(),
    name: z.string(),
    summary: z.string().optional(),
    disposition: z.string().optional(),
    factionId: z.string().optional(),
    locationId: z.string().optional(),
  }),
  execute: async ({ npcId }) => {
    const npc = npcRepository.findById(npcId)
    if (!npc) throw new Error(`NPC ${npcId} not found`)
    // secretNotes deliberately excluded — agents must not see hidden GM info
    return {
      id: npc.id,
      name: npc.name,
      summary: npc.summary,
      disposition: npc.disposition,
      factionId: npc.factionId,
      locationId: npc.locationId,
    }
  },
})
