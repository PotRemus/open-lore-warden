import { npcDbRepository, NpcDto } from '@/db/repositories/npc.db.repository'
import { factionDbRepository, FactionDto } from '@/db/repositories/faction.db.repository'
import { locationRepository } from '@/repositories/location.repository'
import { voiceProfileDbRepository, VoiceProfileDto } from '@/db/repositories/voice-profile.db.repository'
import type { Npc, CreateNpc, UpdateNpc, Faction, VoiceProfile } from '@open-lore-warden/domain'

function toNpc(dto: NpcDto): Npc {
  return {
    id: dto.id,
    campaignId: dto.campaign_id,
    name: dto.name,
    factionId: dto.faction_id ?? undefined,
    locationId: dto.location_id ?? undefined,
    voiceProfileId: dto.voice_profile_id ?? undefined,
    summary: dto.summary ?? undefined,
    disposition: dto.disposition ?? undefined,
    secretNotes: dto.secret_notes ?? undefined,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    faction: dto.faction_id ? toFaction(factionDbRepository.findById(dto.faction_id)) : undefined,
    location: dto.location_id ? locationRepository.findById(dto.location_id) : undefined,
    voiceProfile: dto.voice_profile_id ? toVoiceProfile(voiceProfileDbRepository.findById(dto.voice_profile_id)) : undefined,
  }
}

function toFaction(dto: FactionDto | undefined): Faction | undefined {
  if (!dto) return undefined
  const result: Faction = {
    id: dto.id,
    campaignId: dto.campaign_id,
    name: dto.name,
    type: dto.type ?? undefined,
    description: dto.description ?? undefined,
    reputationScore: dto.reputation_score,
    goalsJson: dto.goals_json ?? undefined,
    status: dto.status,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  }
  return result
}

function toVoiceProfile(dto: VoiceProfileDto | undefined): VoiceProfile | undefined {
  if (!dto) return undefined
  const result: VoiceProfile = {
    id: dto.id,
    campaignId: dto.campaign_id ?? undefined,
    name: dto.name,
    provider: dto.provider,
    voiceKey: dto.voice_key,
    language: dto.language,
    genderHint: dto.gender_hint ?? undefined,
    styleHint: dto.style_hint ?? undefined,
    speed: dto.speed,
    pitch: dto.pitch,
    samplePath: dto.sample_path ?? undefined,
    isDefault: dto.is_default ? true : false,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  }
  return result
}

export const npcRepository = {
  create(input: CreateNpc): Npc {
    return toNpc(npcDbRepository.create(input))
  },

  findById(id: string): Npc | undefined {
    const dto = npcDbRepository.findById(id)
    if (!dto) return undefined
    return toNpc(dto)
  },

  findByCampaignId(campaignId: string): Npc[] {
    return npcDbRepository.findByCampaignId(campaignId).map(toNpc)
  },

  update(id: string, input: UpdateNpc): Npc | undefined {
    const dto = npcDbRepository.update(id, input)
    if (!dto) return undefined
    return toNpc(dto)
  },

  delete(id: string): boolean {
    return npcDbRepository.delete(id)
  },
}
