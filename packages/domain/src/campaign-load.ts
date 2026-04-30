import type { Campaign } from './campaign'
import type { Scene } from './scene'
import type { Character } from './character'

/** Résumé allégé d'un tour pour le contexte de session chargé. */
export interface RecentTurnSummary {
  id: string
  playerInput: string
  narrationText: string
  createdAt: string
}

/** Résultat de POST /campaigns/:id/load — contexte complet de session. */
export interface CampaignLoadResult {
  campaign: Campaign
  currentScene: Scene | null
  characters: Character[]
  /** 10 derniers tours en ordre chronologique. */
  recentTurns: RecentTurnSummary[]
}
