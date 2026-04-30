import type { ImportJobProgress, ScenarioRegenerationJobStatus } from '@open-lore-warden/domain'

/**
 * Types partagés entre les composants d'import de scénario PDF.
 */

export type ImageGenStatus = 'idle' | 'generating' | 'done' | 'error'

export interface ImageGenState {
  status: ImageGenStatus
  genJobId?: string
  error?: string
  /** Timestamp (Date.now()) mis à jour uniquement quand status passe à 'done'. Sert de cache-buster pour l'URL image. */
  cacheBust?: string
}

export interface ScenarioRegenerationState {
  status: 'idle' | 'generating' | 'error'
  jobId?: string
  jobStatus?: ScenarioRegenerationJobStatus
  progress?: ImportJobProgress
  error?: string
}
