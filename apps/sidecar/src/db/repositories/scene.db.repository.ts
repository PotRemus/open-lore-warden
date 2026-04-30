import { randomUUID } from 'node:crypto'
import { sceneStatements } from '@/db/statements/scene.statements'
import { CreateScene, UpdateScene } from '@open-lore-warden/domain'

export interface SceneDto {
  id: string
  campaign_id: string
  location_id: string | null
  name: string
  scene_type: string
  status: string
  intensity: string | null
  entry_conditions_json: string | null
  exit_conditions_json: string | null
  audio_cue_id: string | null
  created_at: string
  updated_at: string
}

export const sceneDbRepository = {
  create(input: CreateScene): SceneDto {
    const now = new Date().toISOString()
    const dto: SceneDto = {
      id: randomUUID(),
      campaign_id: input.campaignId,
      location_id: input.locationId ?? null,
      name: input.name,
      scene_type: input.sceneType,
      status: input.status,
      intensity: input.intensity ?? null,
      entry_conditions_json: input.entryConditionsJson ?? null,
      exit_conditions_json: input.exitConditionsJson ?? null,
      audio_cue_id: input.audioCueId ?? null,
      created_at: now,
      updated_at: now,
    }
    sceneStatements.insert.run(
      dto.id, dto.campaign_id, dto.location_id, dto.name, dto.scene_type,
      dto.status, dto.intensity, dto.entry_conditions_json, dto.exit_conditions_json,
      dto.audio_cue_id, dto.created_at, dto.updated_at,
    )
    return dto
  },

  findById(id: string): SceneDto | undefined {
    const row = sceneStatements.findById.get(id)
    if (!row) return undefined
    return row as unknown as SceneDto
  },

  findByCampaignId(campaignId: string): SceneDto[] {
    return sceneStatements.findByCampaignId.all(campaignId) as unknown as SceneDto[]
  },

  update(id: string, input: UpdateScene): SceneDto | undefined {
    const existing = sceneDbRepository.findById(id)
    if (!existing) return undefined
    const updated: SceneDto = {
      ...existing,
      location_id: input.locationId !== undefined ? (input.locationId ?? null) : existing.location_id,
      name: input.name ?? existing.name,
      scene_type: input.sceneType ?? existing.scene_type,
      status: input.status ?? existing.status,
      intensity: input.intensity !== undefined ? (input.intensity ?? null) : existing.intensity,
      entry_conditions_json: input.entryConditionsJson !== undefined ? (input.entryConditionsJson ?? null) : existing.entry_conditions_json,
      exit_conditions_json: input.exitConditionsJson !== undefined ? (input.exitConditionsJson ?? null) : existing.exit_conditions_json,
      audio_cue_id: input.audioCueId !== undefined ? (input.audioCueId ?? null) : existing.audio_cue_id,
      updated_at: new Date().toISOString(),
    }
    sceneStatements.update.run(
      updated.location_id, updated.name, updated.scene_type, updated.status, updated.intensity,
      updated.entry_conditions_json, updated.exit_conditions_json, updated.audio_cue_id,
      updated.updated_at, updated.id,
    )
    return updated
  },

  delete(id: string): boolean {
    const result = sceneStatements.deleteById.run(id)
    return (result as { changes: number }).changes > 0
  },
}
