import type { FastifyPluginAsync } from 'fastify'
import { writeFileSync, mkdirSync, readFileSync, readdirSync } from 'node:fs'
import { join, basename } from 'node:path'
import { listPublicSystemDescriptors } from '@open-lore-warden/rules-engine'
import { checkSdHealth } from '@open-lore-warden/llm-provider'
import type { ImportSummary, CampaignImportResult } from '@open-lore-warden/domain'
import { config } from '@/config/index'
import {
  createJob,
  getJob,
  runImportPipeline,
} from '@/services/scenario-import-job.service'
import {
  createEntityImageGenJob,
  getEntityImageGenJob,
  runEntityImageGenerationPipeline,
} from '@/services/image-generation.service'
import {
  createScenarioRegenerationJob,
  getScenarioRegenerationJob,
  runScenarioRegenerationPipeline,
} from '@/services/scenario-regeneration-job.service'

// ---------------------------------------------------------------------------
// Helper — lecture des imports depuis le disque
// ---------------------------------------------------------------------------

/**
 * Parcourt {DATA_DIR}/scenario-imports/ et retourne un résumé pour chaque
 * dossier qui contient un campaign.json valide.
 * Les dossiers sans campaign.json (imports en cours ou échoués) sont ignorés.
 * Le tableau est trié du plus récent au plus ancien (generatedAt desc).
 */
function listImportSummaries(dataDir: string): ImportSummary[] {
  const importsDir = join(dataDir, 'scenario-imports')
  let names: string[]

  try {
    names = readdirSync(importsDir) as string[]
  } catch {
    // Dossier inexistant ou non accessible — retourne un tableau vide
    return []
  }

  type RawEntry = ImportSummary & { generatedAt: string }
  const results: RawEntry[] = []

  for (const name of names) {
    const campaignPath = join(importsDir, name, 'campaign.json')
    try {
      const raw = readFileSync(campaignPath, 'utf-8')
      const data = JSON.parse(raw) as Record<string, unknown>

      const title = typeof data.title === 'string' ? data.title : ''
      const genre = typeof data.genre === 'string' ? data.genre : ''
      const theme = typeof data.theme === 'string' ? data.theme : ''
      const summary = typeof data.summary === 'string' ? data.summary : ''
      const generatedAt = typeof data.generatedAt === 'string' ? data.generatedAt : ''

      results.push({ id: name, title, genre, theme, summary, generatedAt })
    } catch {
      // campaign.json absent, illisible, JSON invalide ou name est un fichier — ignoré silencieusement
    }
  }

  results.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))

  return results.map(({ id, title, genre, theme, summary }) => ({
    id,
    title,
    genre,
    theme,
    summary,
  }))
}

/**
 * Lit le campaign.json d'un import identifié par son importId (= nom du dossier).
 * Retourne null si le fichier est absent ou illisible.
 * Ne dépend pas du store en mémoire — fonctionne après redémarrage du serveur.
 */
function readImportResult(dataDir: string, importId: string): CampaignImportResult | null {
  const campaignPath = join(dataDir, 'scenario-imports', importId, 'campaign.json')
  try {
    const raw = readFileSync(campaignPath, 'utf-8')
    return JSON.parse(raw) as CampaignImportResult
  } catch {
    return null
  }
}

export const scenarioImportRoute: FastifyPluginAsync = async (app) => {
  /**
   * GET /scenarios/imports
   * Retourne la liste des scénarios importés présents sur le disque.
   * Chaque entrée correspond à un dossier contenant un campaign.json valide.
   * Les imports en cours ou échoués (sans campaign.json) sont ignorés.
   * Triés du plus récent au plus ancien (generatedAt desc).
   *
   * Returns 200 : { imports: ImportSummary[] }
   *   ImportSummary { id, title, genre, theme, summary }
   */
  app.get('/scenarios/imports', async (_request, reply) => {
    return reply.send({ imports: listImportSummaries(config.DATA_DIR) })
  })

  /**
   * GET /scenarios/imports/:importId
   * Retourne le contenu complet du campaign.json d'un import identifié par son importId.
   * Fonctionne purement depuis le disque — ne dépend pas du store en mémoire.
   *
   * Returns 200 : CampaignImportResult
   * Returns 404 : importId introuvable (dossier absent ou campaign.json manquant)
   */
  app.get<{ Params: { importId: string } }>(
    '/scenarios/imports/:importId',
    async (request, reply) => {
      const { importId } = request.params
      const result = readImportResult(config.DATA_DIR, importId)

      if (!result) {
        return reply.status(404).send({ error: `Import introuvable : ${importId}` })
      }

      return reply.send(result)
    },
  )

  /**
   * GET /scenarios/imports/:importId/images/:filename
   * Sert un fichier image généré pour un import donné.
   * Les images sont stockées dans {DATA_DIR}/scenario-imports/{importId}/images/.
   *
   * Returns 200 : image/png
   * Returns 400 : paramètres invalides (tentative de path traversal détectée)
   * Returns 404 : image introuvable
   */
  app.get<{ Params: { importId: string; filename: string } }>(
    '/scenarios/imports/:importId/images/:filename',
    async (request, reply) => {
      const { importId, filename } = request.params

      // Protection contre le path traversal
      if (
        importId !== basename(importId) ||
        filename !== basename(filename) ||
        !filename.endsWith('.png')
      ) {
        return reply.status(400).send({ error: 'Paramètres invalides.' })
      }

      const filePath = join(config.DATA_DIR, 'scenario-imports', importId, 'images', filename)

      try {
        const buffer = readFileSync(filePath)
        return reply.header('Cache-Control', 'no-cache').type('image/png').send(buffer)
      } catch {
        return reply.status(404).send({ error: `Image introuvable : ${filename}` })
      }
    },
  )

  /**
   * Retourne la liste des systèmes de jeu supportés par le moteur de règles.
   * Les champs sont des identifiants stables destinés à l'i18n côté frontend.
   * Le champ `llmName` (interne) est exclu de la réponse.
   *
   * Returns 200 : { systems: Omit<GameSystemDescriptor, 'llmName'>[] }
   */
  app.get('/scenarios/game-systems', async (_request, reply) => {
    return reply.send({ systems: listPublicSystemDescriptors() })
  })

  /**
   * POST /scenarios/import-pdf
   * Démarre l'import asynchrone d'un scénario PDF.
   *
   * Body : multipart/form-data
   *   - file          (File)   — le fichier PDF du scénario
   *   - gameSystemId  (string) — ID du système de jeu, ex: "dnd-5e", "fate-core"
   *                             (voir GET /scenarios/game-systems pour la liste)
   *
   * Returns 202 : { jobId: string }
   */
  app.post('/scenarios/import-pdf', async (request, reply) => {
    const parts = request.parts()

    let fileBuffer: Buffer | undefined
    let filename: string | undefined
    let gameSystemId: string | null = null

    for await (const part of parts) {
      if (part.type === 'file') {
        if (part.fieldname === 'file') {
          filename = part.filename
          fileBuffer = await part.toBuffer()
        } else {
          // Consommer les champs fichiers non attendus pour éviter tout blocage
          await part.toBuffer()
        }
      } else if (part.type === 'field' && part.fieldname === 'gameSystemId') {
        gameSystemId = String(part.value).trim() || null
      }
    }

    if (!fileBuffer || !filename) {
      return reply.status(400).send({
        error: 'Aucun fichier reçu. Envoyez une requête multipart/form-data avec un champ "file".',
      })
    }

    if (!filename.toLowerCase().endsWith('.pdf')) {
      return reply.status(400).send({
        error: 'Le fichier doit avoir l\'extension .pdf',
      })
    }

    const sourceName = filename ?? 'upload.pdf'
    const stem = sourceName.replace(/\.pdf$/i, '').replace(/[^a-z0-9_-]/gi, '_')

    // Création du job en premier pour obtenir l'importId (jobId)
    const job = createJob(filename, gameSystemId)

    // Écriture du PDF dans le dossier de debug de l'import
    const uploadDir = join(config.DATA_DIR, 'scenario-imports', job.id, 'debug', 'uploads')
    mkdirSync(uploadDir, { recursive: true })
    const tempPath = join(uploadDir, `${stem}.pdf`)
    writeFileSync(tempPath, fileBuffer)

    // Lancement du pipeline en arrière-plan
    runImportPipeline(job.id, tempPath, stem, filename, gameSystemId).catch((err: unknown) => {
      app.log.error(err, `[scenario-import] Erreur non gérée dans le pipeline — job ${job.id}`)
    })

    return reply.status(202).send({ jobId: job.id })
  })

  /**
   * GET /scenarios/import-jobs/:jobId
   * Retourne l'état courant d'un job d'import.
   *
   * Returns : Job { id, status, filename, gameSystem, progress?, startedAt,
   *                 finishedAt?, error?, resultPath? }
   */
  app.get<{ Params: { jobId: string } }>(
    '/scenarios/import-jobs/:jobId',
    async (request, reply) => {
      const { jobId } = request.params
      const job = getJob(jobId)

      if (!job) {
        return reply.status(404).send({ error: `Job introuvable : ${jobId}` })
      }

      return reply.send(job)
    },
  )

  /**
   * GET /scenarios/import-jobs/:jobId/result
   * Retourne le JSON de résultat d'un job terminé (ScenarioImportResult).
   *
   * - 202 si le job est encore en cours (avec status et progress)
   * - 422 si le job a échoué
   * - 200 avec le ScenarioImportResult si le job est terminé
   */
  app.get<{ Params: { jobId: string } }>(
    '/scenarios/import-jobs/:jobId/result',
    async (request, reply) => {
      const { jobId } = request.params
      const job = getJob(jobId)

      if (!job) {
        return reply.status(404).send({ error: `Job introuvable : ${jobId}` })
      }

      if (job.status === 'error') {
        return reply.status(422).send({
          error: 'Le job d\'import a échoué',
          detail: job.error,
        })
      }

      if (job.status !== 'done' || !job.resultPath) {
        return reply.status(202).send({
          error: 'Le job d\'import n\'est pas encore terminé',
          status: job.status,
          progress: job.progress,
        })
      }

      try {
        const raw = readFileSync(job.resultPath, 'utf-8')
        return reply.send(JSON.parse(raw))
      } catch (err) {
        app.log.error(err, `Impossible de lire le fichier résultat du job ${jobId}`)
        return reply.status(500).send({ error: 'Impossible de lire le fichier résultat' })
      }
    },
  )

  /**
   * POST /scenarios/imports/:importId/generate-image
   * Démarre la génération asynchrone de l'image d'une entité unique (PNJ ou lieu)
   * appartenant au résultat d'un import.
   *
   * L'entité est recherchée automatiquement par `itemId` dans le campaign.json lu sur
   * le disque — ne dépend pas du store en mémoire, fonctionne après redémarrage du
   * serveur et pour les imports chargés depuis l'historique.
   *
   * Prérequis :
   *   - L'import identifié par `importId` doit posséder un campaign.json valide.
   *   - sd-server doit être démarré et joignable (via la commande Tauri start_sd_server).
   *   - L'entité identifiée par `itemId` doit exister dans le résultat.
   *
   * Body : { itemId: string }
   *
   * Returns 202 : { genJobId: string }
   * Returns 400 : itemId absent ou vide
   * Returns 404 : import introuvable (campaign.json absent ou illisible)
   * Returns 503 : sd-server inaccessible
   */
  app.post<{ Params: { importId: string }; Body: { itemId?: string } }>(
    '/scenarios/imports/:importId/generate-image',
    async (request, reply) => {
      const { importId } = request.params
      const { itemId } = request.body ?? {}

      if (!itemId || typeof itemId !== 'string' || itemId.trim() === '') {
        return reply.status(400).send({ error: 'Le champ "itemId" est requis.' })
      }

      const resultPath = join(config.DATA_DIR, 'scenario-imports', importId, 'campaign.json')
      const importExists = readImportResult(config.DATA_DIR, importId)
      if (!importExists) {
        return reply.status(404).send({ error: `Import introuvable : ${importId}` })
      }

      const sdReady = await checkSdHealth()
      if (!sdReady) {
        return reply.status(503).send({
          error:
            'sd-server n\'est pas joignable. Démarrez-le via la commande Tauri start_sd_server avant de lancer la génération d\'images.',
        })
      }

      const genJob = createEntityImageGenJob(importId, itemId.trim())

      runEntityImageGenerationPipeline(genJob.id, importId, resultPath, itemId.trim()).catch(
        (err: unknown) => {
          app.log.error(
            err,
            `[image-generation] Erreur non gérée dans le pipeline — genJob ${genJob.id}`,
          )
        },
      )

      return reply.status(202).send({ genJobId: genJob.id })
    },
  )

  /**
   * GET /scenarios/imports/:importId/generate-image/:genJobId
   * Retourne l'état courant d'un job de génération d'image (entité unique).
   *
   * Returns : EntityImageGenJob { id, importJobId, itemId, entityType, status, startedAt, finishedAt?, error? }
   * Returns 404 : job de génération introuvable ou n'appartenant pas à cet import
   */
  app.get<{ Params: { importId: string; genJobId: string } }>(
    '/scenarios/imports/:importId/generate-image/:genJobId',
    async (request, reply) => {
      const { importId, genJobId } = request.params

      const genJob = getEntityImageGenJob(genJobId)
      if (!genJob || genJob.importJobId !== importId) {
        return reply.status(404).send({ error: `Job de génération d'image introuvable : ${genJobId}` })
      }

      return reply.send(genJob)
    },
  )

  /**
   * POST /scenarios/imports/:importId/regenerate-scenario
   * Démarre la régénération asynchrone d'un scénario précis d'un import.
   * Le traitement s'exécute en arrière-plan via un job dédié.
   *
   * Body : { scenarioId: string }
   *
   * Returns 202 : { jobId: string }
   * Returns 400 : scenarioId absent ou vide
   * Returns 404 : import ou scénario introuvable
   * Returns 409 : une régénération est déjà en cours pour cet import
   */
  app.post<{ Params: { importId: string }; Body: { scenarioId?: string } }>(
    '/scenarios/imports/:importId/regenerate-scenario',
    async (request, reply) => {
      const { importId } = request.params
      const { scenarioId } = request.body ?? {}

      if (!scenarioId || typeof scenarioId !== 'string' || scenarioId.trim() === '') {
        return reply.status(400).send({ error: 'Le champ "scenarioId" est requis.' })
      }

      const campaign = readImportResult(config.DATA_DIR, importId)
      if (!campaign) {
        return reply.status(404).send({ error: `Import introuvable : ${importId}` })
      }

      const targetScenarioId = scenarioId.trim()
      const scenarioExists = campaign.scenarios.some((scenario) => scenario.id === targetScenarioId)
      if (!scenarioExists) {
        return reply.status(404).send({ error: `Scénario introuvable : ${targetScenarioId}` })
      }

      const created = createScenarioRegenerationJob(importId, targetScenarioId)
      if (!created.ok) {
        return reply.status(409).send({
          error: 'Une régénération est déjà en cours pour cet import.',
          jobId: created.existingJob.id,
        })
      }

      runScenarioRegenerationPipeline(created.job.id).catch((err: unknown) => {
        app.log.error(
          err,
          `[scenario-regeneration] Erreur non gérée dans le pipeline — job ${created.job.id}`,
        )
      })

      return reply.status(202).send({ jobId: created.job.id })
    },
  )

  /**
   * GET /scenarios/regenerate-jobs/:jobId
   * Retourne l'état courant d'un job de régénération de scénario.
   *
   * Returns : ScenarioRegenerationJob
   * Returns 404 : job introuvable
   */
  app.get<{ Params: { jobId: string } }>(
    '/scenarios/regenerate-jobs/:jobId',
    async (request, reply) => {
      const { jobId } = request.params
      const job = getScenarioRegenerationJob(jobId)

      if (!job) {
        return reply.status(404).send({ error: `Job de régénération introuvable : ${jobId}` })
      }

      return reply.send(job)
    },
  )

  /**
   * GET /scenarios/regenerate-jobs/:jobId/result
   * Retourne le campaign.json mis à jour d'un job de régénération terminé.
   *
   * - 202 si le job est encore en cours
   * - 422 si le job a échoué
   * - 200 avec CampaignImportResult si le job est terminé
   */
  app.get<{ Params: { jobId: string } }>(
    '/scenarios/regenerate-jobs/:jobId/result',
    async (request, reply) => {
      const { jobId } = request.params
      const job = getScenarioRegenerationJob(jobId)

      if (!job) {
        return reply.status(404).send({ error: `Job de régénération introuvable : ${jobId}` })
      }

      if (job.status === 'error') {
        return reply.status(422).send({
          error: 'Le job de régénération a échoué',
          detail: job.error,
        })
      }

      if (job.status !== 'done' || !job.resultPath) {
        return reply.status(202).send({
          error: 'Le job de régénération n\'est pas encore terminé',
          status: job.status,
          progress: job.progress,
        })
      }

      try {
        const raw = readFileSync(job.resultPath, 'utf-8')
        return reply.send(JSON.parse(raw))
      } catch (err) {
        app.log.error(err, `Impossible de lire le fichier résultat du job de régénération ${jobId}`)
        return reply.status(500).send({ error: 'Impossible de lire le fichier résultat' })
      }
    },
  )
}
