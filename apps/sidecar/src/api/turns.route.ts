import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { turnRepository } from '@/repositories/turn.repository'
import { mastra } from '@/mastra/index'

const ResolveTurnBodySchema = z.object({
  campaignId: z.string().min(1),
  playerInput: z.string().min(1),
})

const SessionSummaryBodySchema = z.object({
  campaignId: z.string().min(1),
  turnCount: z.number().int().min(1).max(50).optional(),
})

export const turnsRoute: FastifyPluginAsync = async (app) => {
  /**
   * POST /turns/resolve
   * Run the full turn pipeline for the given campaign + player input.
   */
  app.post('/turns/resolve', async (request, reply) => {
    const parsed = ResolveTurnBodySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: z.treeifyError(parsed.error) })
    }

    const workflow = mastra.getWorkflow('resolveTurnWorkflow')
    const run = await workflow.createRun()
    const result = await run.start({ inputData: parsed.data })

    if (result.status === 'failed') {
      app.log.error({ err: result.error }, 'Turn resolution failed')
      return reply.status(500).send({ error: 'Turn resolution failed', detail: result.error?.message })
    }

    if (result.status !== 'success') {
      return reply.status(500).send({ error: `Unexpected workflow status: ${result.status}` })
    }

    const output = result.result
    const rulesResult = JSON.parse(output.rulesResultJson) as Record<string, unknown>
    const mediaPlan = JSON.parse(output.mediaPlanJson) as Record<string, unknown>

    // Extract stateChanges from rulesResult and surface it at the response root
    const { stateChanges, ...rulesCore } = rulesResult as {
      stateChanges?: Record<string, unknown>
      [key: string]: unknown
    }

    return {
      turnId: output.turnId,
      narration: output.narrationText,
      rulesResult: rulesCore,
      stateChanges: stateChanges ?? {},
      mediaPlan,
    }
  })

  /**
   * GET /turns/latest?campaignId=<id>&limit=<n>
   * Returns the most recent turns for a campaign.
   */
  app.get<{ Querystring: { campaignId: string; limit?: string } }>(
    '/turns/latest',
    async (request, reply) => {
      const { campaignId, limit } = request.query
      if (!campaignId) {
        return reply.status(400).send({ error: 'campaignId query param is required' })
      }
      const n = Math.min(parseInt(limit ?? '10', 10) || 10, 50)
      const turns = turnRepository.findByCampaignId(campaignId).slice(-n)
      return turns
    },
  )

  /**
   * GET /turns/:id
   * Retrieve a single turn by id.
   */
  app.get<{ Params: { id: string } }>('/turns/:id', async (request, reply) => {
    const turn = turnRepository.findById(request.params.id)
    if (!turn) return reply.status(404).send({ error: 'Turn not found' })
    return turn
  })

  /**
   * POST /turns/session-summary
   * Generate and persist a session recap from recent turns.
   */
  app.post('/turns/session-summary', async (request, reply) => {
    const parsed = SessionSummaryBodySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: z.treeifyError(parsed.error) })
    }

    const workflow = mastra.getWorkflow('sessionSummaryWorkflow')
    const run = await workflow.createRun()
    const result = await run.start({
      inputData: {
        campaignId: parsed.data.campaignId,
        turnCount: parsed.data.turnCount ?? 20,
      },
    })

    if (result.status === 'failed') {
      app.log.error({ err: result.error }, 'Session summary failed')
      return reply.status(500).send({ error: 'Session summary failed', detail: result.error?.message })
    }

    if (result.status !== 'success') {
      return reply.status(500).send({ error: `Unexpected workflow status: ${result.status}` })
    }

    return result.result
  })
}
