import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

/**
 * PlanAudioCueTool — purely declarative.
 * The tool returns a structured audio plan; the sidecar media layer is
 * responsible for actually starting playback.  No side effects occur here.
 */
export const planAudioCueTool = createTool({
  id: 'plan-audio-cue',
  description:
    'Decide the ambient atmosphere and music for the current scene moment. Returns a structured media plan — does NOT trigger playback directly.',
  inputSchema: z.object({
    sceneIntensity: z
      .enum(['calm', 'tense', 'combat', 'mystery', 'triumph', 'horror'])
      .describe('Emotional intensity of the current scene moment'),
    contextHint: z
      .string()
      .optional()
      .describe('Optional short description of what just happened, to inform the choice'),
  }),
  outputSchema: z.object({
    ambience: z.string().describe('Suggested ambience track key'),
    music: z.string().describe('Suggested music track key'),
    sfx: z.array(z.string()).describe('List of sound-effect keys to play once'),
  }),
  execute: async ({ sceneIntensity }) => {
    // Deterministic mapping — no LLM call needed for basic cues.
    const cueMap: Record<
      string,
      { ambience: string; music: string; sfx: string[] }
    > = {
      calm: { ambience: 'tavern_ambient', music: 'folk_gentle', sfx: [] },
      tense: { ambience: 'dungeon_drip', music: 'suspense_low', sfx: ['heartbeat'] },
      combat: { ambience: 'battle_clash', music: 'combat_intense', sfx: ['sword_draw'] },
      mystery: { ambience: 'cave_wind', music: 'mystery_low', sfx: [] },
      triumph: { ambience: 'open_air', music: 'fanfare_short', sfx: ['crowd_cheer'] },
      horror: { ambience: 'dark_forest', music: 'horror_drone', sfx: ['scream_distant'] },
    }
    return cueMap[sceneIntensity] ?? cueMap['calm']!
  },
})
