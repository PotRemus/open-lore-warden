import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import { config } from '@/config/index'
import { loggerOptions } from '@/config/logger'
import { healthRoute } from '@/api/health.route'
import { campaignsRoute } from '@/api/campaigns.route'
import { scenesRoute } from '@/api/scenes.route'
import { charactersRoute } from '@/api/characters.route'
import { turnsRoute } from '@/api/turns.route'
import { scenarioImportRoute } from '@/api/scenario-import.route'
import { runMigrations } from '@/db/migrations'

runMigrations()

const app = Fastify({ logger: loggerOptions })

app.register(cors, { origin: 'http://localhost:1420' })
app.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
})
app.register(healthRoute)
app.register(campaignsRoute)
app.register(scenesRoute)
app.register(charactersRoute)
app.register(turnsRoute)
app.register(scenarioImportRoute)

const start = async () => {
  try {
    await app.listen({ port: config.PORT, host: config.HOST })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
