import type { FastifyPluginAsync } from 'fastify'
import { campaignRepository } from '@/repositories/campaign.repository'
import { sceneRepository } from '@/repositories/scene.repository'
import { characterRepository } from '@/repositories/character.repository'
import { turnRepository } from '@/repositories/turn.repository'
import { CreateCampaignSchema, UpdateCampaignSchema } from '@open-lore-warden/domain'
import { z } from 'zod'

export const campaignsRoute: FastifyPluginAsync = async (app) => {
  app.get('/campaigns', async () => {
    return campaignRepository.findAll()
  })

  app.get<{ Params: { id: string } }>('/campaigns/:id', async (request, reply) => {
    const campaign = campaignRepository.findById(request.params.id)
    if (!campaign) return reply.status(404).send({ error: 'Campaign not found' })
    return campaign
  })

  app.post('/campaigns', async (request, reply) => {
    const parsed = CreateCampaignSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ error: z.treeifyError(parsed.error) })
    const campaign = campaignRepository.create(parsed.data)
    return reply.status(201).send(campaign)
  })

  app.patch<{ Params: { id: string } }>('/campaigns/:id', async (request, reply) => {
    const parsed = UpdateCampaignSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ error: z.treeifyError(parsed.error) })
    const campaign = campaignRepository.update(request.params.id, parsed.data)
    if (!campaign) return reply.status(404).send({ error: 'Campaign not found' })
    return campaign
  })

  app.delete<{ Params: { id: string } }>('/campaigns/:id', async (request, reply) => {
    const deleted = campaignRepository.delete(request.params.id)
    if (!deleted) return reply.status(404).send({ error: 'Campaign not found' })
    return reply.status(204).send()
  })

  /**
   * POST /campaigns/:id/load
   * Charge le contexte complet d'une campagne : campagne, scène courante,
   * personnages actifs, et les 10 derniers tours.
   * Utilisé par l'UI au démarrage d'une session de jeu.
   */
  app.post<{ Params: { id: string } }>('/campaigns/:id/load', async (request, reply) => {
    const campaign = campaignRepository.findById(request.params.id)
    if (!campaign) return reply.status(404).send({ error: 'Campaign not found' })

    const currentScene = campaign.currentScene ?? (
      campaign.currentSceneId
        ? sceneRepository.findById(campaign.currentSceneId)
        : undefined
    )

    const characters = characterRepository.findByCampaignId(campaign.id)

    const recentTurns = turnRepository
      .findByCampaignId(campaign.id)
      .slice(-10)
      .map((t) => ({
        id: t.id,
        playerInput: t.playerInput,
        narrationText: t.narrationText,
        createdAt: t.createdAt,
      }))

    return {
      campaign,
      currentScene: currentScene ?? null,
      characters,
      recentTurns,
    }
  })
}
