import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { campaignRepository } from '@/repositories/campaign.repository'

export const updateFlagTool = createTool({
  id: 'update-flag',
  description:
    'Set or clear a campaign flag. Flags track world-state events (e.g. "crypt_entrance_opened"). Used by the rules engine to gate scene and quest progress.',
  inputSchema: z.object({
    campaignId: z.string().min(1),
    key: z.string().min(1).describe('Flag key, e.g. "crypt_entrance_opened"'),
    value: z
      .string()
      .default('true')
      .describe('Flag value — defaults to "true"; set to "false" to clear a boolean flag'),
    scopeType: z
      .enum(['campaign', 'scene', 'quest', 'npc'])
      .default('campaign')
      .describe('Scope of the flag'),
    scopeId: z.string().optional().describe('ID of the scoped entity if not global'),
  }),
  outputSchema: z.object({
    key: z.string(),
    value: z.string(),
    updatedAt: z.string(),
  }),
  execute: async ({ campaignId, key, value, scopeType, scopeId }) => {
    const flag = campaignRepository.setFlag({
      campaignId,
      key,
      value,
      valueType: 'string',
      scopeType,
      scopeId,
    })
    return { key: flag.key, value: flag.value ?? 'true', updatedAt: flag.updatedAt }
  },
})
