import { turnDbRepository, TurnDto } from '@/db/repositories/turn.db.repository'
import { turnEventDbRepository, TurnEventDto } from '@/db/repositories/turn-event.db.repository'
import { sceneRepository } from '@/repositories/scene.repository'
import type { Turn, CreateTurn, TurnEvent } from '@open-lore-warden/domain'

function toTurn(dto: TurnDto): Turn {
  return {
    id: dto.id,
    campaignId: dto.campaign_id,
    sceneId: dto.scene_id,
    playerInput: dto.player_input,
    intentJson: dto.intent_json ?? undefined,
    rulesResultJson: dto.rules_result_json,
    narrationText: dto.narration_text,
    mediaPlanJson: dto.media_plan_json ?? undefined,
    createdAt: dto.created_at,
    scene: sceneRepository.findById(dto.scene_id),
    events: toTurnEvent(turnEventDbRepository.findByTurnId(dto.id)),
  }
}

function toTurnEvent(dto: TurnEventDto[]): TurnEvent[] {
  const result: TurnEvent[] = dto.map(d => {
    return {
      id: d.id,
      turnId: d.turn_id,
      campaignId: d.campaign_id,
      sceneId: d.scene_id ?? undefined,
      eventType: d.event_type,
      actorType: d.actor_type ?? undefined,
      actorId: d.actor_id ?? undefined,
      targetType: d.target_type ?? undefined,
      targetId: d.target_id ?? undefined,
      payloadJson: d.payload_json,
      sortOrder: d.sort_order,
      createdAt: d.created_at,
    }
  })
  return result
}

export const turnRepository = {
  create(input: CreateTurn): Turn {
    return toTurn(turnDbRepository.create(input))
  },

  findById(id: string): Turn | undefined {
    const dto = turnDbRepository.findById(id)
    if (!dto) return undefined
    return toTurn(dto)
  },

  findByCampaignId(campaignId: string): Turn[] {
    return turnDbRepository.findByCampaignId(campaignId).map(toTurn)
  },

  findBySceneId(sceneId: string): Turn[] {
    return turnDbRepository.findBySceneId(sceneId).map(toTurn)
  },

  delete(id: string): boolean {
    return turnDbRepository.delete(id)
  },
}
