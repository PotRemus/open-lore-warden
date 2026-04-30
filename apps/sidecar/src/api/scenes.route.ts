import type { FastifyPluginAsync } from 'fastify'
import { campaignRepository } from '@/repositories/campaign.repository'
import { sceneRepository } from '@/repositories/scene.repository'

export const scenesRoute: FastifyPluginAsync = async (app) => {
  /**
   * GET /scenes/current?campaignId=<id>
   * Retourne la scène active de la campagne, avec ses connexions, rencontres et cue audio.
   */
  app.get<{ Querystring: { campaignId?: string } }>('/scenes/current', async (request, reply) => {
    const { campaignId } = request.query
    if (!campaignId) {
      return reply.status(400).send({ error: 'campaignId query param is required' })
    }

    const campaign = campaignRepository.findById(campaignId)
    if (!campaign) {
      return reply.status(404).send({ error: 'Campaign not found' })
    }

    const sceneId = campaign.currentSceneId ?? campaign.currentScene?.id
    if (!sceneId) {
      return reply.status(404).send({ error: 'No active scene for this campaign' })
    }

    const scene = sceneRepository.findById(sceneId)
    if (!scene) {
      return reply.status(404).send({ error: 'Scene not found' })
    }

    return scene
  })
}
