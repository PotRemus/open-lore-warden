import type { FastifyPluginAsync } from 'fastify'
import { characterRepository } from '@/repositories/character.repository'
import { UpdateCharacterSchema } from '@open-lore-warden/domain'
import { z } from 'zod'

export const charactersRoute: FastifyPluginAsync = async (app) => {
  /**
   * GET /characters?campaignId=<id>
   * Retourne tous les personnages (joueurs + PNJs) d'une campagne avec leur inventaire.
   */
  app.get<{ Querystring: { campaignId?: string } }>('/characters', async (request, reply) => {
    const { campaignId } = request.query
    if (!campaignId) {
      return reply.status(400).send({ error: 'campaignId query param is required' })
    }
    return characterRepository.findByCampaignId(campaignId)
  })

  /**
   * PATCH /characters/:id
   * Met à jour un personnage (HP, niveau, stats, statut, etc.).
   * Utile pour appliquer des dégâts, soins ou progression de niveau depuis l'UI.
   */
  app.patch<{ Params: { id: string } }>('/characters/:id', async (request, reply) => {
    const parsed = UpdateCharacterSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: z.treeifyError(parsed.error) })
    }
    const character = characterRepository.update(request.params.id, parsed.data)
    if (!character) {
      return reply.status(404).send({ error: 'Character not found' })
    }
    return character
  })
}
