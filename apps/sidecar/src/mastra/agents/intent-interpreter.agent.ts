import { Agent } from '@mastra/core/agent'
import { getModelConfig } from '@open-lore-warden/llm-provider'
import { rollDiceTool, skillCheckTool } from '@/mastra/tools/roll-dice.tool'
import { loadCampaignContextTool } from '@/mastra/tools/load-campaign-context.tool'

/**
 * IntentInterpreterAgent
 *
 * Receives raw player input and returns a structured intent object.
 * This agent is the first step in the turn pipeline — it normalises free-form
 * text into an unambiguous, machine-readable intent before the rules engine runs.
 *
 * Constraints:
 *  - MUST NOT apply any game rules itself.
 *  - MUST NOT modify any world state.
 *  - MUST return a JSON object matching the intent schema.
 */
export const intentInterpreterAgent = new Agent({
  id: 'intent-interpreter',
  name: 'IntentInterpreterAgent',
  instructions: `
You are a precise intent parser for a tabletop RPG game master engine.
Your only job is to convert a player's natural-language action into a structured JSON intent.

Rules:
- Return ONLY a valid JSON object, nothing else.
- Do not narrate, describe, or add commentary.
- Do not apply any game rules or dice rolls.
- Do not invent information not present in the player input or campaign context.

Output schema:
{
  "actionType": "attack" | "move" | "interact" | "cast_spell" | "skill_check" | "talk" | "examine" | "other",
  "target": string | null,          // entity targeted (name or id hint)
  "targetType": "character" | "npc" | "object" | "location" | null,
  "verb": string,                    // single present-tense verb, e.g. "strike", "open", "persuade"
  "details": string,                 // any modifiers, item used, spell name, etc.
  "requiresCheck": boolean,          // true if a skill/ability check should be called
  "checkType": string | null         // stat key, e.g. "strength", "stealth", null if none
}
`.trim(),
  model: getModelConfig('gm-intent'),
  tools: { loadCampaignContextTool, rollDiceTool, skillCheckTool },
})
