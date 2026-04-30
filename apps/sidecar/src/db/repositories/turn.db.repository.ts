import { randomUUID } from 'node:crypto'
import { turnStatements } from '@/db/statements/turn.statements'
import { CreateTurn } from '@open-lore-warden/domain'

export interface TurnDto {
  id: string
  campaign_id: string
  scene_id: string
  player_input: string
  intent_json: string | null
  rules_result_json: string
  narration_text: string
  media_plan_json: string | null
  created_at: string
}

export const turnDbRepository = {
  create(input: CreateTurn): TurnDto {
    const dto: TurnDto = {
      id: randomUUID(),
      campaign_id: input.campaignId,
      scene_id: input.sceneId,
      player_input: input.playerInput,
      intent_json: input.intentJson ?? null,
      rules_result_json: input.rulesResultJson,
      narration_text: input.narrationText,
      media_plan_json: input.mediaPlanJson ?? null,
      created_at: new Date().toISOString(),
    }
    turnStatements.insert.run(
      dto.id, dto.campaign_id, dto.scene_id, dto.player_input, dto.intent_json,
      dto.rules_result_json, dto.narration_text, dto.media_plan_json, dto.created_at,
    )
    return dto
  },

  findById(id: string): TurnDto | undefined {
    const row = turnStatements.findById.get(id)
    if (!row) return undefined
    return row as unknown as TurnDto
  },

  findByCampaignId(campaignId: string): TurnDto[] {
    return turnStatements.findByCampaignId.all(campaignId) as unknown as TurnDto[]
  },

  findBySceneId(sceneId: string): TurnDto[] {
    return turnStatements.findBySceneId.all(sceneId) as unknown as TurnDto[]
  },

  delete(id: string): boolean {
    const result = turnStatements.deleteById.run(id)
    return (result as { changes: number }).changes > 0
  },
}
