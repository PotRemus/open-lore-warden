import { CreateLocation, Location, UpdateLocation } from '@open-lore-warden/domain'
import { locationDbRepository, LocationDto } from '@/db/repositories/location.db.repository'

function toLocation(dto: LocationDto): Location {
  const result: Location = {
    id: dto.id,
    campaignId: dto.campaign_id,
    name: dto.name,
    type: dto.type ?? undefined,
    descriptionPublic: dto.description_public ?? undefined,
    descriptionGm: dto.description_gm ?? undefined,
    tagsJson: dto.tags_json ?? undefined,
    dangerLevel: dto.danger_level,
    imageAssetId: dto.image_asset_id ?? undefined,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  }
  return result
}
    
export const locationRepository = {
  create(input: CreateLocation): Location {
    return toLocation(locationDbRepository.create(input))
  },

  findById(id: string): Location | undefined {
    const dto = locationDbRepository.findById(id)
    if (!dto) return undefined
    return toLocation(dto)
  },

  findByCampaignId(campaignId: string): Location[] {
    return locationDbRepository.findByCampaignId(campaignId).map(toLocation)
  },

  update(id: string, input: UpdateLocation): Location | undefined {
    const dto = locationDbRepository.update(id, input)
    if (!dto) return undefined
    return toLocation(dto)
  },

  delete(id: string): boolean {
    return locationDbRepository.delete(id)
  },
}
