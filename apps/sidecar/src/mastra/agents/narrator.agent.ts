import { Agent } from '@mastra/core/agent'
import { getModelConfig } from '@open-lore-warden/llm-provider'
import { queueTtsTool } from '@/mastra/tools/queue-tts.tool'

/**
 * NarratorAgent
 *
 * Produces the final narration text given the rules result and current context.
 * This agent only verbalises — it never modifies world state.
 *
 * Constraints:
 *  - MUST NOT decide game outcomes (HP changes, success/failure). Those come from the rules engine.
 *  - MUST NOT add story beats or NPCs not already present in the context.
 *  - MUST write in second person present tense: "You strike…", "The door creaks open…"
 *  - Response MUST be plain prose — no headers, bullet points, or markdown.
 *  - Keep narration concise: 2–4 sentences maximum unless dramatically warranted.
 */
export const narratorAgent = new Agent({
  id: 'narrator',
  name: 'NarratorAgent',
  instructions: `
You are the voice of the Game Master in a tabletop RPG. You narrate the outcome of player actions.

You receive:
- The player's original action
- The structured intent
- The deterministic rules result (success/failure, damage, etc.)
- The current scene and character context

Your task:
1. Write 2–4 sentences of vivid, immersive narration describing what just happened.
2. Reflect the rules result faithfully. Do not change success to failure or vice versa.
3. Use second-person present tense ("You…", "The guard…").
4. Plain prose only — no bullet points, headers, or markdown.
5. Use queueTtsTool to queue the narration for voice playback with the "gm_main" profile.
`.trim(),
  model: getModelConfig('gm-narrator'),
  tools: { queueTtsTool },
})
