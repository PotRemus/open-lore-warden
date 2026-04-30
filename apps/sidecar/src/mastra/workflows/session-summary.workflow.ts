import { createWorkflow, createStep } from '@mastra/core/workflows'
import { z } from 'zod'
import { loreKeeperAgent } from '@/mastra/agents/lore-keeper.agent'
import { memoryRepository } from '@/repositories/memory.repository'
import { turnRepository } from '@/repositories/turn.repository'
import { campaignRepository } from '@/repositories/campaign.repository'

// ── Step 1: Collect recent turns ─────────────────────────────────────────────

const collectRecentTurnsStep = createStep({
  id: 'collect-recent-turns',
  inputSchema: z.object({
    campaignId: z.string().min(1),
    turnCount: z.number().int().min(1).max(50).default(20),
  }),
  outputSchema: z.object({
    campaignId: z.string(),
    turnCount: z.number(),
    turnsText: z.string(),
    campaignName: z.string(),
  }),
  execute: async ({ inputData }) => {
    const campaign = campaignRepository.findById(inputData.campaignId)
    if (!campaign) throw new Error(`Campaign ${inputData.campaignId} not found`)

    const turns = turnRepository.findByCampaignId(inputData.campaignId).slice(
      -inputData.turnCount,
    )
    const turnsText = turns
      .map((t, i) => `[Turn ${i + 1}] Player: ${t.playerInput}\nNarration: ${t.narrationText}`)
      .join('\n\n')

    return {
      campaignId: inputData.campaignId,
      turnCount: turns.length,
      turnsText,
      campaignName: campaign.name,
    }
  },
})

// ── Step 2: Generate summary via LoreKeeper ──────────────────────────────────

const generateSummaryStep = createStep({
  id: 'generate-summary',
  inputSchema: z.object({
    campaignId: z.string(),
    turnCount: z.number(),
    turnsText: z.string(),
    campaignName: z.string(),
  }),
  outputSchema: z.object({
    campaignId: z.string(),
    summaryText: z.string(),
  }),
  execute: async ({ inputData }) => {
    const agent = loreKeeperAgent
    const prompt = [
      `Campaign: "${inputData.campaignName}"`,
      `Summarise the following ${inputData.turnCount} turns into a concise session recap (max 200 words).`,
      'Highlight major events, NPC interactions, and plot developments.',
      '',
      inputData.turnsText,
    ].join('\n')

    const response = await agent.generate(prompt)
    return {
      campaignId: inputData.campaignId,
      summaryText: response.text,
    }
  },
})

// ── Step 3: Persist summary as a high-importance memory ─────────────────────

const persistSummaryStep = createStep({
  id: 'persist-summary',
  inputSchema: z.object({
    campaignId: z.string(),
    summaryText: z.string(),
  }),
  outputSchema: z.object({
    memoryId: z.string(),
    summaryText: z.string(),
  }),
  execute: async ({ inputData }) => {
    const memory = memoryRepository.create({
      campaignId: inputData.campaignId,
      entityType: 'campaign',
      memoryType: 'event',
      content: inputData.summaryText,
      importance: 8,
    })
    return { memoryId: memory.id, summaryText: inputData.summaryText }
  },
})

// ── Workflow assembly ────────────────────────────────────────────────────────

export const sessionSummaryWorkflow = createWorkflow({
  id: 'session-summary',
  description: 'Generates a session recap from recent turns and persists it as a high-importance memory.',
  inputSchema: z.object({
    campaignId: z.string().min(1),
    turnCount: z.number().int().min(1).max(50).default(20),
  }),
  outputSchema: z.object({
    memoryId: z.string(),
    summaryText: z.string(),
  }),
})
  .then(collectRecentTurnsStep)
  .then(generateSummaryStep)
  .then(persistSummaryStep)
  .commit()
