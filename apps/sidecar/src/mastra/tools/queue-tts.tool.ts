import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

/**
 * QueueTtsTool — enqueues a TTS synthesis job.
 * Actual synthesis is handled asynchronously by the media layer.
  *The tool returns immediately with a job identifier.
 */
export const queueTtsTool = createTool({
  id: 'queue-tts',
  description:
    'Queue a text-to-speech synthesis job for a segment of narration or NPC dialogue. Returns a job ID; playback is handled asynchronously.',
  inputSchema: z.object({
    text: z.string().min(1).describe('Text to synthesise into speech'),
    voiceProfile: z
      .string()
      .default('gm_main')
      .describe('Voice profile key, e.g. "gm_main", "npc_villain_01"'),
    priority: z
      .enum(['normal', 'high'])
      .default('normal')
      .describe('High priority plays before queued normal jobs'),
  }),
  outputSchema: z.object({
    jobId: z.string(),
    text: z.string(),
    voiceProfile: z.string(),
    queuedAt: z.string(),
  }),
  execute: async ({ text, voiceProfile = 'gm_main' }) => {
    // In the current implementation TTS synthesis is a placeholder.
    // When the media service is available this tool will POST to it.
    const jobId = `tts_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    return {
      jobId,
      text,
      voiceProfile,
      queuedAt: new Date().toISOString(),
    }
  },
})
