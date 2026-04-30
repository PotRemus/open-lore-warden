import { createWorkflow, createStep } from '@mastra/core/workflows'
import { z } from 'zod'
import { loreKeeperAgent } from '@/mastra/agents/lore-keeper.agent'
import { campaignRepository } from '@/repositories/campaign.repository'
import { memoryRepository } from '@/repositories/memory.repository'

// ── Step 1: Validate campaign exists ─────────────────────────────────────────

const validateCampaignStep = createStep({
  id: 'validate-campaign',
  inputSchema: z.object({
    campaignId: z.string().min(1),
  }),
  outputSchema: z.object({
    campaignId: z.string(),
    campaignName: z.string(),
    system: z.string(),
    setting: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    const campaign = campaignRepository.findById(inputData.campaignId)
    if (!campaign) throw new Error(`Campaign ${inputData.campaignId} not found`)
    return {
      campaignId: campaign.id,
      campaignName: campaign.name,
      system: campaign.system,
      setting: campaign.setting,
    }
  },
})

// ── Step 2: Generate campaign introduction memory ────────────────────────────

const generateIntroductionStep = createStep({
  id: 'generate-introduction',
  inputSchema: z.object({
    campaignId: z.string(),
    campaignName: z.string(),
    system: z.string(),
    setting: z.string().optional(),
  }),
  outputSchema: z.object({
    campaignId: z.string(),
    introductionText: z.string(),
  }),
  execute: async ({ inputData }) => {
    const agent = loreKeeperAgent
    const prompt = [
      'A new campaign is starting.',
      `Name: "${inputData.campaignName}"`,
      `System: ${inputData.system}`,
      inputData.setting ? `Setting: ${inputData.setting}` : '',
      '',
      'Write a short GM introduction (2-3 sentences) that sets the tone for this campaign.',
      'This will be stored as the founding memory of the campaign.',
    ]
      .filter(Boolean)
      .join('\n')

    const response = await agent.generate(prompt)
    return {
      campaignId: inputData.campaignId,
      introductionText: response.text,
    }
  },
})

// ── Step 3: Persist bootstrap memory ────────────────────────────────────────

const persistBootstrapMemoryStep = createStep({
  id: 'persist-bootstrap-memory',
  inputSchema: z.object({
    campaignId: z.string(),
    introductionText: z.string(),
  }),
  outputSchema: z.object({
    campaignId: z.string(),
    memoryId: z.string(),
    introductionText: z.string(),
  }),
  execute: async ({ inputData }) => {
    const memory = memoryRepository.create({
      campaignId: inputData.campaignId,
      entityType: 'campaign',
      memoryType: 'lore',
      content: inputData.introductionText,
      importance: 9,
    })
    return {
      campaignId: inputData.campaignId,
      memoryId: memory.id,
      introductionText: inputData.introductionText,
    }
  },
})

// ── Workflow assembly ─────────────────────────────────────────────────────────

export const bootstrapCampaignWorkflow = createWorkflow({
  id: 'bootstrap-campaign',
  description: 'Initialises a new campaign: validates it exists, generates an intro narrative, and stores it as the founding memory.',
  inputSchema: z.object({
    campaignId: z.string().min(1),
  }),
  outputSchema: z.object({
    campaignId: z.string(),
    memoryId: z.string(),
    introductionText: z.string(),
  }),
})
  .then(validateCampaignStep)
  .then(generateIntroductionStep)
  .then(persistBootstrapMemoryStep)
  .commit()
