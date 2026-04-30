/**
 * Statut d'un job d'import de scénario PDF tel qu'exposé par l'API.
 * Reflète les étapes internes du pipeline d'import du sidecar.
 */
export type ImportJobStatus =
  | 'pending'
  | 'extracting'
  | 'classifying'
  | 'generating_campaign'
  | 'generating_scenario'
  | 'done'
  | 'error'

/** Progression d'un job d'import (étape courante / total d'étapes). */
export type ImportJobProgress = {
  current: number
  total: number
}

/** Représentation publique d'un job d'import tel que retourné par GET /scenarios/import-jobs/:id. */
export interface ImportJob {
  id: string
  status: ImportJobStatus
  filename: string
  gameSystemId: string | null
  progress?: ImportJobProgress
  startedAt: string
  finishedAt?: string
  error?: string
  resultPath?: string
}

/**
 * Statut d'un job de régénération de scénario unique.
 */
export type ScenarioRegenerationJobStatus =
  | 'pending'
  | 'loading_artifacts'
  | 'generating_scenario'
  | 'writing_campaign'
  | 'done'
  | 'error'

/**
 * Représentation publique d'un job de régénération de scénario.
 */
export interface ScenarioRegenerationJob {
  id: string
  importId: string
  scenarioId: string
  status: ScenarioRegenerationJobStatus
  progress?: ImportJobProgress
  startedAt: string
  finishedAt?: string
  error?: string
  resultPath?: string
}

/**
 * Résumé d'un scénario importé tel que retourné par GET /scenarios/imports.
 * Chaque entrée correspond à un dossier campaign.json valide sur le disque.
 */
export interface ImportSummary {
  /** Nom du dossier d'import (= importId dans campaign.json). */
  id: string
  title: string
  genre: string
  theme: string
  summary: string
}

export type ImageGenStatus = 'pending' | 'generating' | 'done' | 'error'

/** Type d'entité pouvant faire l'objet d'une génération d'image. */
export type ImageEntityType = 'npc' | 'location'

/**
 * Job de génération d'image pour une entité unique (PNJ ou lieu) d'un job d'import.
 * Exposé par GET /scenarios/import-jobs/:jobId/generate-image/:genJobId.
 */
export interface EntityImageGenJob {
  id: string
  importJobId: string
  /** ID de l'entité (NPC ou lieu) dans le JSON résultat de l'import. */
  itemId: string
  /** Type résolu au démarrage du pipeline (null tant que non déterminé). */
  entityType: ImageEntityType | null
  status: ImageGenStatus
  startedAt: string
  finishedAt?: string
  error?: string
}
