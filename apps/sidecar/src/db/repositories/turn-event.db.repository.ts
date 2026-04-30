import { randomUUID } from 'node:crypto'
import { turnEventStatements } from '@/db/statements/turn-event.statements'
import { CreateTurnEvent } from '@open-lore-warden/domain'

export interface TurnEventDto {
  id: string
  turn_id: string
  campaign_id: string
  scene_id: string | null
  event_type: string
  actor_type: string | null
  actor_id: string | null
  target_type: string | null
  target_id: string | null
  payload_json: string
  sort_order: number
  created_at: string
}

export const turnEventDbRepository = {
  create(input: CreateTurnEvent): TurnEventDto {
    const dto: TurnEventDto = {
      id: randomUUID(),
      turn_id: input.turnId,
      campaign_id: input.campaignId,
      scene_id: input.sceneId ?? null,
      event_type: input.eventType,
      actor_type: input.actorType ?? null,
      actor_id: input.actorId ?? null,
      target_type: input.targetType ?? null,
      target_id: input.targetId ?? null,
      payload_json: input.payloadJson,
      sort_order: input.sortOrder ?? 0,
      created_at: new Date().toISOString(),
    }
    turnEventStatements.insert.run(
      dto.id, dto.turn_id, dto.campaign_id, dto.scene_id, dto.event_type,
      dto.actor_type, dto.actor_id, dto.target_type, dto.target_id,
      dto.payload_json, dto.sort_order, dto.created_at,
    )
    return dto
  },

  findById(id: string): TurnEventDto | undefined {
    const row = turnEventStatements.findById.get(id)
    if (!row) return undefined
    return row as unknown as TurnEventDto
  },

  findByTurnId(turnId: string): TurnEventDto[] {
    return turnEventStatements.findByTurnId.all(turnId).map(
      (row) => row as unknown as TurnEventDto,
    )
  },

  findByCampaignId(campaignId: string): TurnEventDto[] {
    return turnEventStatements.findByCampaignId.all(campaignId).map(
      (row) => row as unknown as TurnEventDto,
    )
  },

  delete(id: string): boolean {
    const result = turnEventStatements.deleteById.run(id)
    return (result as { changes: number }).changes > 0
  },
}
