import { randomUUID } from 'node:crypto'
import { encounterStatements } from '@/db/statements/encounter.statements'
import { CreateEncounter, UpdateEncounter } from '@open-lore-warden/domain'

export interface EncounterDto {
  id: string
  campaign_id: string
  scene_id: string
  name: string
  encounter_type: string
  status: string
  difficulty: string | null
  summary: string | null
  setup_json: string | null
  resolution_json: string | null
  started_at: string | null
  ended_at: string | null
  created_at: string
  updated_at: string
}

export const encounterDbRepository = {
  create(input: CreateEncounter): EncounterDto {
    const now = new Date().toISOString()
    const dto: EncounterDto = {
      id: randomUUID(),
      campaign_id: input.campaignId,
      scene_id: input.sceneId,
      name: input.name,
      encounter_type: input.encounterType,
      status: input.status ?? 'pending',
      difficulty: input.difficulty ?? null,
      summary: input.summary ?? null,
      setup_json: input.setupJson ?? null,
      resolution_json: null,
      started_at: null,
      ended_at: null,
      created_at: now,
      updated_at: now,
    }
    encounterStatements.insert.run(
      dto.id, dto.campaign_id, dto.scene_id, dto.name, dto.encounter_type,
      dto.status, dto.difficulty, dto.summary, dto.setup_json,
      dto.resolution_json, dto.started_at, dto.ended_at, dto.created_at, dto.updated_at,
    )
    return dto
  },

  findById(id: string): EncounterDto | undefined {
    const row = encounterStatements.findById.get(id)
    if (!row) return undefined
    return row as unknown as EncounterDto
  },

  findByCampaignId(campaignId: string): EncounterDto[] {
    return encounterStatements.findByCampaignId.all(campaignId).map(
      (row) => row as unknown as EncounterDto,
    )
  },

  findBySceneId(sceneId: string): EncounterDto[] {
    return encounterStatements.findBySceneId.all(sceneId).map(
      (row) => row as unknown as EncounterDto,
    )
  },

  update(id: string, input: UpdateEncounter): EncounterDto | undefined {
    const existing = encounterDbRepository.findById(id)
    if (!existing) return undefined
    const dto: EncounterDto = {
      ...existing,
      name: input.name ?? existing.name,
      encounter_type: input.encounterType ?? existing.encounter_type,
      status: input.status ?? existing.status,
      difficulty: input.difficulty !== undefined ? input.difficulty : existing.difficulty,
      summary: input.summary !== undefined ? input.summary : existing.summary,
      setup_json: input.setupJson !== undefined ? input.setupJson : existing.setup_json,
      resolution_json: input.resolutionJson !== undefined ? input.resolutionJson : existing.resolution_json,
      started_at: input.startedAt !== undefined ? input.startedAt : existing.started_at,
      ended_at: input.endedAt !== undefined ? input.endedAt : existing.ended_at,
      updated_at: new Date().toISOString(),
    }
    encounterStatements.update.run(
      dto.name, dto.encounter_type, dto.status, dto.difficulty, dto.summary,
      dto.setup_json, dto.resolution_json, dto.started_at, dto.ended_at,
      dto.updated_at, dto.id,
    )
    return dto
  },

  delete(id: string): boolean {
    const result = encounterStatements.deleteById.run(id)
    return (result as { changes: number }).changes > 0
  },
}
