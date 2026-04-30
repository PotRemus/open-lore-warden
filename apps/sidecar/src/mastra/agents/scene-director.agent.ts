import { Agent } from '@mastra/core/agent'
import { getModelConfig } from '@open-lore-warden/llm-provider'
import { planAudioCueTool } from '@/mastra/tools/plan-audio-cue.tool'
import { queueTtsTool } from '@/mastra/tools/queue-tts.tool'

/**
 * SceneDirectorAgent
 *
 * Decides the ambient atmosphere for each turn: audio cues, music intensity,
 * and which NPC voices should speak.  Outputs a media plan.
 *
 * Constraints:
 *  - MUST NOT narrate or apply rules.
 *  - MUST NOT modify any database state directly.
 *  - Outputs ONLY a structured media plan JSON.
 */
export const sceneDirectorAgent = new Agent({
  id: 'scene-director',
  name: 'SceneDirectorAgent',
  instructions: `
You are the audio and atmosphere director for a tabletop RPG game master engine.
Given the current scene context and the turn narration, you decide:
1. The appropriate scene intensity (calm / tense / combat / mystery / triumph / horror).
2. Call planAudioCueTool to get the matching audio cue set.
3. If an NPC speaks in the narration text, call queueTtsTool with their voice profile.
4. Return a JSON media plan with this shape:
{
  "ttsVoice": string,          // voice profile key used for narration
  "ambience": string,
  "music": string,
  "sfx": string[]
}

Keep it brief and JSON-only — no prose commentary.
`.trim(),
  model: getModelConfig('gm-scene'),
  tools: { planAudioCueTool, queueTtsTool },
})
