import { createWorkflow, createStep } from '@mastra/core/workflows'
import { z } from 'zod'
import { intentInterpreterAgent } from '@/mastra/agents/intent-interpreter.agent'
import { narratorAgent } from '@/mastra/agents/narrator.agent'
import { sceneDirectorAgent } from '@/mastra/agents/scene-director.agent'
import { loreKeeperAgent } from '@/mastra/agents/lore-keeper.agent'
import { campaignRepository } from '@/repositories/campaign.repository'
import { sceneRepository } from '@/repositories/scene.repository'
import { turnRepository } from '@/repositories/turn.repository'
import { memoryRepository } from '@/repositories/memory.repository'
import { getResolver, IntentSchema, RulesResultSchema } from './resolvers/index'

// ── Shared schemas ───────────────────────────────────────────────────────────

const TurnInputSchema = z.object({
  campaignId: z.string().min(1),
  playerInput: z.string().min(1),
})

// IntentSchema and RulesResultSchema are imported from resolvers/types.ts
// to avoid duplicating definitions and to keep resolvers self-contained.
export { IntentSchema, RulesResultSchema }

// ── Step 1: Load context ─────────────────────────────────────────────────────

const loadContextStep = createStep({
  id: 'load-context',
  inputSchema: TurnInputSchema,
  outputSchema: z.object({
    campaignId: z.string(),
    playerInput: z.string(),
    sceneId: z.string(),
    contextSummary: z.string(),
  }),
  execute: async ({ inputData }) => {
    const campaign = campaignRepository.findById(inputData.campaignId)
    if (!campaign) throw new Error(`Campaign ${inputData.campaignId} not found`)
    if (!campaign.currentSceneId) {
      throw new Error('No active scene — load a scene before resolving turns')
    }

    const scene = sceneRepository.findById(campaign.currentSceneId)
    const recentTurns = turnRepository.findByCampaignId(inputData.campaignId).slice(-5)
    const recentMemories = memoryRepository.findByCampaignId(inputData.campaignId)
      .filter((m) => m.importance >= 5)
      .slice(-10)

    const contextSummary = JSON.stringify({
      campaign: { name: campaign.name, system: campaign.system },
      scene: scene
        ? { name: scene.name, type: scene.sceneType, status: scene.status, intensity: scene.intensity }
        : null,
      recentTurns: recentTurns.map((t) => ({
        input: t.playerInput,
        narration: t.narrationText,
      })),
      importantMemories: recentMemories.map((m) => m.content),
    })

    return {
      campaignId: inputData.campaignId,
      playerInput: inputData.playerInput,
      sceneId: campaign.currentSceneId,
      contextSummary,
    }
  },
})

// ── Step 2: Interpret intent ─────────────────────────────────────────────────

const interpretIntentStep = createStep({
  id: 'interpret-intent',
  inputSchema: z.object({
    campaignId: z.string(),
    playerInput: z.string(),
    sceneId: z.string(),
    contextSummary: z.string(),
  }),
  outputSchema: z.object({
    campaignId: z.string(),
    playerInput: z.string(),
    sceneId: z.string(),
    intentJson: z.string(),
    intent: IntentSchema,
  }),
  execute: async ({ inputData }) => {
    const agent = intentInterpreterAgent
    const response = await agent.generate(
      `Player action: "${inputData.playerInput}"\n\nContext:\n${inputData.contextSummary}`,
    )

    let intent: z.infer<typeof IntentSchema>
    try {
      intent = IntentSchema.parse(JSON.parse(response.text))
    } catch {
      // Fallback intent if the model output is malformed
      intent = {
        actionType: 'other',
        target: null,
        targetType: null,
        verb: 'act',
        details: inputData.playerInput,
        requiresCheck: false,
        checkType: null,
      }
    }

    return {
      campaignId: inputData.campaignId,
      playerInput: inputData.playerInput,
      sceneId: inputData.sceneId,
      intentJson: JSON.stringify(intent),
      intent,
    }
  },
})

// ── Step 3: Run rules engine ─────────────────────────────────────────────────

const resolveRulesStep = createStep({
  id: 'resolve-rules',
  inputSchema: z.object({
    campaignId: z.string(),
    playerInput: z.string(),
    sceneId: z.string(),
    intentJson: z.string(),
    intent: IntentSchema,
  }),
  outputSchema: z.object({
    campaignId: z.string(),
    playerInput: z.string(),
    sceneId: z.string(),
    intentJson: z.string(),
    rulesResultJson: z.string(),
    rulesResult: RulesResultSchema,
  }),
  execute: async ({ inputData }) => {
    const campaign = campaignRepository.findById(inputData.campaignId)
    const system = campaign?.system ?? 'dnd5e'

    const resolver = getResolver(system)
    const result = await resolver.resolve({
      campaignSystem: system,
      intent: inputData.intent,
      campaignId: inputData.campaignId,
    })

    return {
      campaignId: inputData.campaignId,
      playerInput: inputData.playerInput,
      sceneId: inputData.sceneId,
      intentJson: inputData.intentJson,
      rulesResultJson: JSON.stringify(result),
      rulesResult: result,
    }
  },
})

// ── Step 4: Narrate ──────────────────────────────────────────────────────────

const narrateStep = createStep({
  id: 'narrate',
  inputSchema: z.object({
    campaignId: z.string(),
    playerInput: z.string(),
    sceneId: z.string(),
    intentJson: z.string(),
    rulesResultJson: z.string(),
    rulesResult: RulesResultSchema,
  }),
  outputSchema: z.object({
    campaignId: z.string(),
    playerInput: z.string(),
    sceneId: z.string(),
    intentJson: z.string(),
    rulesResultJson: z.string(),
    narrationText: z.string(),
  }),
  execute: async ({ inputData }) => {
    const agent = narratorAgent
    const prompt = [
      `Player action: "${inputData.playerInput}"`,
      `Intent: ${inputData.intentJson}`,
      `Rules result: ${inputData.rulesResultJson}`,
    ].join('\n')

    const response = await agent.generate(prompt)
    return {
      campaignId: inputData.campaignId,
      playerInput: inputData.playerInput,
      sceneId: inputData.sceneId,
      intentJson: inputData.intentJson,
      rulesResultJson: inputData.rulesResultJson,
      narrationText: response.text,
    }
  },
})

// ── Step 5: Plan media ───────────────────────────────────────────────────────

const planMediaStep = createStep({
  id: 'plan-media',
  inputSchema: z.object({
    campaignId: z.string(),
    playerInput: z.string(),
    sceneId: z.string(),
    intentJson: z.string(),
    rulesResultJson: z.string(),
    narrationText: z.string(),
  }),
  outputSchema: z.object({
    campaignId: z.string(),
    playerInput: z.string(),
    sceneId: z.string(),
    intentJson: z.string(),
    rulesResultJson: z.string(),
    narrationText: z.string(),
    mediaPlanJson: z.string(),
  }),
  execute: async ({ inputData }) => {
    const agent = sceneDirectorAgent
    const prompt = `Narration: "${inputData.narrationText}"\nRules: ${inputData.rulesResultJson}`
    const response = await agent.generate(prompt)

    let mediaPlanJson: string
    try {
      JSON.parse(response.text) // validate it's parseable JSON
      mediaPlanJson = response.text
    } catch {
      mediaPlanJson = JSON.stringify({ ttsVoice: 'gm_main', ambience: 'default', music: 'default', sfx: [] })
    }

    return {
      campaignId: inputData.campaignId,
      playerInput: inputData.playerInput,
      sceneId: inputData.sceneId,
      intentJson: inputData.intentJson,
      rulesResultJson: inputData.rulesResultJson,
      narrationText: inputData.narrationText,
      mediaPlanJson: mediaPlanJson,
    }
  },
})

// ── Step 6: Persist turn ─────────────────────────────────────────────────────

const persistTurnStep = createStep({
  id: 'persist-turn',
  inputSchema: z.object({
    campaignId: z.string(),
    playerInput: z.string(),
    sceneId: z.string(),
    intentJson: z.string(),
    rulesResultJson: z.string(),
    narrationText: z.string(),
    mediaPlanJson: z.string(),
  }),
  outputSchema: z.object({
    turnId: z.string(),
    narrationText: z.string(),
    rulesResultJson: z.string(),
    mediaPlanJson: z.string(),
  }),
  execute: async ({ inputData }) => {
    const turn = turnRepository.create({
      campaignId: inputData.campaignId,
      sceneId: inputData.sceneId,
      playerInput: inputData.playerInput,
      intentJson: inputData.intentJson,
      rulesResultJson: inputData.rulesResultJson,
      narrationText: inputData.narrationText,
      mediaPlanJson: inputData.mediaPlanJson,
    })
    return {
      turnId: turn.id,
      narrationText: turn.narrationText,
      rulesResultJson: turn.rulesResultJson,
      mediaPlanJson: turn.mediaPlanJson ?? '{}',
    }
  },
})

// ── Step 7: Extract memories ─────────────────────────────────────────────────

const extractMemoriesStep = createStep({
  id: 'extract-memories',
  inputSchema: z.object({
    turnId: z.string(),
    narrationText: z.string(),
    rulesResultJson: z.string(),
    mediaPlanJson: z.string(),
  }),
  outputSchema: z.object({
    turnId: z.string(),
    narrationText: z.string(),
    rulesResultJson: z.string(),
    mediaPlanJson: z.string(),
  }),
  execute: async ({ inputData }) => {
    // LoreKeeperAgent runs in background — we fire-and-forget to not block the UI.
    // Memory extraction is best-effort; failures should not surface to the player.
    try {
      const agent = loreKeeperAgent
      void agent.generate(
        `Extract memories from this turn. Turn id: ${inputData.turnId}. Narration: "${inputData.narrationText}"`,
      )
    } catch {
      // swallow — non-critical
    }
    return inputData
  },
})

// ── Workflow assembly ────────────────────────────────────────────────────────

export const resolveTurnWorkflow = createWorkflow({
  id: 'resolve-turn',
  description: 'Full turn resolution pipeline: load context → interpret intent → run rules → narrate → plan media → persist → extract memories.',
  inputSchema: TurnInputSchema,
  outputSchema: z.object({
    turnId: z.string(),
    narrationText: z.string(),
    rulesResultJson: z.string(),
    mediaPlanJson: z.string(),
  }),
})
  .then(loadContextStep)
  .then(interpretIntentStep)
  .then(resolveRulesStep)
  .then(narrateStep)
  .then(planMediaStep)
  .then(persistTurnStep)
  .then(extractMemoriesStep)
  .commit()
