import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { campaignRepository } from '@/repositories/campaign.repository'
import { sceneRepository } from '@/repositories/scene.repository'
import { characterRepository } from '@/repositories/character.repository'
import { turnRepository } from '@/repositories/turn.repository'

export const loadCampaignContextTool = createTool({
  id: 'load-campaign-context',
  description:
    'Load the full context for a campaign: basic info, current scene, active characters, and the last few turns for short-term memory.',
  inputSchema: z.object({
    campaignId: z.string().min(1).describe('UUID of the campaign to load'),
    lastTurnsCount: z
      .number()
      .int()
      .min(1)
      .max(20)
      .default(5)
      .describe('How many recent turns to include for context'),
  }),
  outputSchema: z.object({
    campaign: z.object({
      id: z.string(),
      name: z.string(),
      system: z.string(),
      setting: z.string().optional(),
      currentSceneId: z.string().optional(),
    }),
    currentScene: z
      .object({
        id: z.string(),
        name: z.string(),
        sceneType: z.string(),
        status: z.string(),
        intensity: z.string().optional(),
      })
      .optional(),
    characters: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        role: z.string(),
        /** Raw system stats (HP, level, sanity, stress…) — structure depends on campaign.system. */
        statsJson: z.string(),
      }),
    ),
    recentTurns: z.array(
      z.object({
        id: z.string(),
        playerInput: z.string(),
        narrationText: z.string(),
        createdAt: z.string(),
      }),
    ),
  }),
  execute: async ({ campaignId, lastTurnsCount = 5 }) => {
    const campaign = campaignRepository.findById(campaignId)
    if (!campaign) throw new Error(`Campaign ${campaignId} not found`)

    const currentScene = campaign.currentSceneId
      ? sceneRepository.findById(campaign.currentSceneId)
      : undefined

    const characters = characterRepository.findByCampaignId(campaignId)

    const allTurns = turnRepository.findByCampaignId(campaignId)
    const recentTurns = allTurns
      .slice(-lastTurnsCount)
      .map((t) => ({
        id: t.id,
        playerInput: t.playerInput,
        narrationText: t.narrationText,
        createdAt: t.createdAt,
      }))

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        system: campaign.system,
        setting: campaign.setting,
        currentSceneId: campaign.currentSceneId,
      },
      currentScene: currentScene
        ? {
            id: currentScene.id,
            name: currentScene.name,
            sceneType: currentScene.sceneType,
            status: currentScene.status,
            intensity: currentScene.intensity,
          }
        : undefined,
      characters: characters.map((c) => ({
        id: c.id,
        name: c.name,
        role: c.role,
        statsJson: c.statsJson,
      })),
      recentTurns,
    }
  },
})
