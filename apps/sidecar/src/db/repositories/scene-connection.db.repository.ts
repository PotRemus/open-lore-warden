import { randomUUID } from 'node:crypto'
import { sceneConnectionStatements } from '@/db/statements/scene-connection.statements'
import { CreateSceneConnection } from '@open-lore-warden/domain'

export interface SceneConnectionDto {
  id: string
  campaign_id: string
  from_scene_id: string
  to_scene_id: string
  connection_type: string
  label: string | null
  is_bidirectional: number
  conditions_json: string | null
  priority: number
  created_at: string
}

export const sceneConnectionDbRepository = {
  create(input: CreateSceneConnection): SceneConnectionDto {
    const dto: SceneConnectionDto = {
      id: randomUUID(),
      campaign_id: input.campaignId,
      from_scene_id: input.fromSceneId,
      to_scene_id: input.toSceneId,
      connection_type: input.connectionType,
      label: input.label ?? null,
      is_bidirectional: input.isBidirectional ? 1 : 0,
      conditions_json: input.conditionsJson ?? null,
      priority: input.priority ?? 0,
      created_at: new Date().toISOString(),
    }
    sceneConnectionStatements.insert.run(
      dto.id, dto.campaign_id, dto.from_scene_id, dto.to_scene_id, dto.connection_type,
      dto.label, dto.is_bidirectional, dto.conditions_json, dto.priority, dto.created_at,
    )
    return dto
  },

  findById(id: string): SceneConnectionDto | undefined {
    const row = sceneConnectionStatements.findById.get(id)
    if (!row) return undefined
    return row as unknown as SceneConnectionDto
  },

  findByCampaignId(campaignId: string): SceneConnectionDto[] {
    return sceneConnectionStatements.findByCampaignId.all(campaignId).map(
      (row) => row as unknown as SceneConnectionDto,
    )
  },

  findByFromSceneId(fromSceneId: string): SceneConnectionDto[] {
    return sceneConnectionStatements.findByFromSceneId.all(fromSceneId).map(
      (row) => row as unknown as SceneConnectionDto,
    )
  },

  delete(id: string): boolean {
    const result = sceneConnectionStatements.deleteById.run(id)
    return (result as { changes: number }).changes > 0
  },
}
