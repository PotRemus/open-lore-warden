import { randomUUID } from 'node:crypto'
import { locationStatements } from '@/db/statements/location.statements'
import { CreateLocation, UpdateLocation } from '@open-lore-warden/domain'

export interface LocationDto {
  id: string
  campaign_id: string
  parent_location_id: string | null
  name: string
  type: string
  description_public: string | null
  description_gm: string | null
  tags_json: string | null
  danger_level: number
  image_asset_id: string | null
  created_at: string
  updated_at: string
}

export const locationDbRepository = {
  create(input: CreateLocation): LocationDto {
    const now = new Date().toISOString()
    const dto: LocationDto = {
      id: randomUUID(),
      campaign_id: input.campaignId,
      parent_location_id: input.parentLocationId ?? null,
      name: input.name,
      type: input.type,
      description_public: input.descriptionPublic ?? null,
      description_gm: input.descriptionGm ?? null,
      tags_json: input.tagsJson ?? null,
      danger_level: input.dangerLevel ?? 0,
      image_asset_id: input.imageAssetId ?? null,
      created_at: now,
      updated_at: now,
    }
    locationStatements.insert.run(
      dto.id, dto.campaign_id, dto.parent_location_id, dto.name, dto.type,
      dto.description_public, dto.description_gm, dto.tags_json,
      dto.danger_level, dto.image_asset_id, dto.created_at, dto.updated_at,
    )
    return dto
  },

  findById(id: string): LocationDto | undefined {
    const row = locationStatements.findById.get(id)
    if (!row) return undefined
    return row as unknown as LocationDto
  },

  findByCampaignId(campaignId: string): LocationDto[] {
    return locationStatements.findByCampaignId.all(campaignId).map(
      (row) => row as unknown as LocationDto,
    )
  },

  update(id: string, input: UpdateLocation): LocationDto | undefined {
    const existing = locationDbRepository.findById(id)
    if (!existing) return undefined
    const dto: LocationDto = {
      ...existing,
      parent_location_id: input.parentLocationId !== undefined ? input.parentLocationId : existing.parent_location_id,
      name: input.name ?? existing.name,
      type: input.type ?? existing.type,
      description_public: input.descriptionPublic !== undefined ? input.descriptionPublic : existing.description_public,
      description_gm: input.descriptionGm !== undefined ? input.descriptionGm : existing.description_gm,
      tags_json: input.tagsJson !== undefined ? input.tagsJson : existing.tags_json,
      danger_level: input.dangerLevel ?? existing.danger_level,
      image_asset_id: input.imageAssetId !== undefined ? input.imageAssetId : existing.image_asset_id,
      updated_at: new Date().toISOString(),
    }
    locationStatements.update.run(
      dto.parent_location_id, dto.name, dto.type, dto.description_public,
      dto.description_gm, dto.tags_json, dto.danger_level, dto.image_asset_id,
      dto.updated_at, dto.id,
    )
    return dto
  },

  delete(id: string): boolean {
    const result = locationStatements.deleteById.run(id)
    return (result as { changes: number }).changes > 0
  },
}
