import { Agent } from '@mastra/core/agent'
import { getModelConfig } from '@open-lore-warden/llm-provider'
import { storeMemoryTool } from '@/mastra/tools/store-memory.tool'
import { loadCampaignContextTool } from '@/mastra/tools/load-campaign-context.tool'
import { getNpcProfileTool } from '@/mastra/tools/get-npc-profile.tool'
import { getQuestStateTool } from '@/mastra/tools/get-quest-state.tool'

/**
 * LoreKeeperAgent
 *
 * Extracts facts worth remembering from a completed turn and persists them as
 * campaign memories.  Also retrieves relevant lore to provide as context.
 *
 * Constraints:
 *  - MUST NOT narrate or interpret player actions.
 *  - MUST NOT modify character stats, flags, or scene state.
 *  - Only store facts that are truly useful for future turns (importance ≥ 5 for important events).
 *  - Exclude trivial/routine actions (walking, looking around) unless context-changing.
 */
export const loreKeeperAgent = new Agent({
  id: 'lore-keeper',
  name: 'LoreKeeperAgent',
  instructions: `
You are the memory keeper for a long-running tabletop RPG campaign.
After each turn, you:
1. Analyse what just happened.
2. Identify facts worth preserving (discoveries, NPC interactions, decisions, lore reveals, significant combat outcomes).
3. Store each notable fact using storeMemoryTool with an appropriate importance score (1-10).
4. Do NOT store trivial actions (simple movement, routine dialogue).

When asked to retrieve context, use loadCampaignContextTool + getNpcProfileTool + getQuestStateTool
to build a relevant summary for the other agents.

Memory importance guide:
- 1-3: Background detail, might be useful later
- 4-6: Meaningful event, NPC interaction, minor lore
- 7-9: Major plot beat, alliance/betrayal, important discovery
- 10: Campaign-defining moment
`.trim(),
  model: getModelConfig('gm-lore'),
  tools: { storeMemoryTool, loadCampaignContextTool, getNpcProfileTool, getQuestStateTool },
})
