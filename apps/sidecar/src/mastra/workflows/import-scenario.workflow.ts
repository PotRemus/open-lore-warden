import { createWorkflow, createStep } from '@mastra/core/workflows'
import { z } from 'zod'
import { loreKeeperAgent } from '@/mastra/agents/lore-keeper.agent'

const ScenarioChunkSchema = z.object({
  title: z.string(),
  type: z.enum(['scene', 'npc', 'location', 'quest', 'item', 'lore']),
  content: z.string(),
})

// ── Step 1: Parse raw text into chunks ───────────────────────────────────────

const parseTextStep = createStep({
  id: 'parse-text',
  inputSchema: z.object({
    rawText: z.string().min(1).describe('Full extracted text from the PDF or source document'),
    campaignId: z.string().min(1),
  }),
  outputSchema: z.object({
    campaignId: z.string(),
    chunks: z.array(ScenarioChunkSchema),
  }),
  execute: async ({ inputData }) => {
    const agent = loreKeeperAgent
    const prompt = [
      'You are parsing a tabletop RPG scenario document.',
      'Split the following text into discrete chunks representing scenes, NPCs, locations, quests, items, or lore.',
      'Return ONLY a JSON array of objects: { title, type, content }',
      'Types: scene | npc | location | quest | item | lore',
      '',
      inputData.rawText.slice(0, 12000), // cap to avoid token overflow
    ].join('\n')

    const response = await agent.generate(prompt)
    let chunks: z.infer<typeof ScenarioChunkSchema>[]
    try {
      const parsed = JSON.parse(response.text)
      chunks = z.array(ScenarioChunkSchema).parse(parsed)
    } catch {
      // Wrap the whole text as a single lore chunk if parsing fails
      chunks = [{ title: 'Imported Scenario', type: 'lore', content: inputData.rawText }]
    }

    return { campaignId: inputData.campaignId, chunks }
  },
})

// ── Step 2: Validate and normalise chunks ────────────────────────────────────

const validateChunksStep = createStep({
  id: 'validate-chunks',
  inputSchema: z.object({
    campaignId: z.string(),
    chunks: z.array(ScenarioChunkSchema),
  }),
  outputSchema: z.object({
    campaignId: z.string(),
    validChunks: z.array(ScenarioChunkSchema),
    skippedCount: z.number().int(),
  }),
  execute: async ({ inputData }) => {
    const validChunks = inputData.chunks.filter(
      (c) => c.title.trim().length > 0 && c.content.trim().length > 10,
    )
    return {
      campaignId: inputData.campaignId,
      validChunks,
      skippedCount: inputData.chunks.length - validChunks.length,
    }
  },
})

// ── Step 3: Return structured payload (insertion to be confirmed by UI) ──────

const buildImportPayloadStep = createStep({
  id: 'build-import-payload',
  inputSchema: z.object({
    campaignId: z.string(),
    validChunks: z.array(ScenarioChunkSchema),
    skippedCount: z.number().int(),
  }),
  outputSchema: z.object({
    campaignId: z.string(),
    payload: z.array(ScenarioChunkSchema),
    totalChunks: z.number().int(),
    skippedCount: z.number().int(),
  }),
  execute: async ({ inputData }) => {
    return {
      campaignId: inputData.campaignId,
      payload: inputData.validChunks,
      totalChunks: inputData.validChunks.length,
      skippedCount: inputData.skippedCount,
    }
  },
})

// ── Workflow assembly ─────────────────────────────────────────────────────────

export const importScenarioWorkflow = createWorkflow({
  id: 'import-scenario',
  description:
    'Parses raw scenario text (extracted from PDF/JSON), splits it into typed chunks, validates them, and returns a preview payload for user confirmation before DB insertion.',
  inputSchema: z.object({
    rawText: z.string().min(1),
    campaignId: z.string().min(1),
  }),
  outputSchema: z.object({
    campaignId: z.string(),
    payload: z.array(ScenarioChunkSchema),
    totalChunks: z.number().int(),
    skippedCount: z.number().int(),
  }),
})
  .then(parseTextStep)
  .then(validateChunksStep)
  .then(buildImportPayloadStep)
  .commit()
