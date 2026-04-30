import type { FastifyPluginAsync } from 'fastify'
import { getHealthStatus } from '@/core/health'

export const healthRoute: FastifyPluginAsync = async (app) => {
  app.get('/system/health', async () => getHealthStatus())
}
