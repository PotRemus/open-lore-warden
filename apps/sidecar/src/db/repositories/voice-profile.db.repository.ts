import { randomUUID } from 'node:crypto'
import { voiceProfileStatements } from '@/db/statements/voice-profile.statements'
import { CreateVoiceProfile, UpdateVoiceProfile } from '@open-lore-warden/domain'

export interface VoiceProfileDto {
  id: string
  campaign_id: string | null
  name: string
  provider: string
  voice_key: string
  language: string
  gender_hint: string | null
  style_hint: string | null
  speed: number
  pitch: number
  sample_path: string | null
  is_default: number
  created_at: string
  updated_at: string
}

export const voiceProfileDbRepository = {
  create(input: CreateVoiceProfile): VoiceProfileDto {
    const now = new Date().toISOString()
    const dto: VoiceProfileDto = {
      id: randomUUID(),
      campaign_id: input.campaignId ?? null,
      name: input.name,
      provider: input.provider,
      voice_key: input.voiceKey,
      language: input.language ?? 'fr-FR',
      gender_hint: input.genderHint ?? null,
      style_hint: input.styleHint ?? null,
      speed: input.speed ?? 1.0,
      pitch: input.pitch ?? 1.0,
      sample_path: input.samplePath ?? null,
      is_default: input.isDefault ? 1 : 0,
      created_at: now,
      updated_at: now,
    }
    voiceProfileStatements.insert.run(
      dto.id, dto.campaign_id, dto.name, dto.provider, dto.voice_key,
      dto.language, dto.gender_hint, dto.style_hint, dto.speed, dto.pitch,
      dto.sample_path, dto.is_default, dto.created_at, dto.updated_at,
    )
    return dto
  },

  findById(id: string): VoiceProfileDto | undefined {
    const row = voiceProfileStatements.findById.get(id)
    if (!row) return undefined
    return row as unknown as VoiceProfileDto
  },

  findByCampaignId(campaignId: string): VoiceProfileDto[] {
    return voiceProfileStatements.findByCampaignId.all(campaignId).map(
      (row) => row as unknown as VoiceProfileDto,
    )
  },

  findGlobal(): VoiceProfileDto[] {
    return voiceProfileStatements.findGlobal.all().map(
      (row) => row as unknown as VoiceProfileDto,
    )
  },

  update(id: string, input: UpdateVoiceProfile): VoiceProfileDto | undefined {
    const existing = voiceProfileDbRepository.findById(id)
    if (!existing) return undefined
    const dto: VoiceProfileDto = {
      ...existing,
      name: input.name ?? existing.name,
      provider: input.provider ?? existing.provider,
      voice_key: input.voiceKey ?? existing.voice_key,
      language: input.language ?? existing.language,
      gender_hint: input.genderHint !== undefined ? input.genderHint : existing.gender_hint,
      style_hint: input.styleHint !== undefined ? input.styleHint : existing.style_hint,
      speed: input.speed ?? existing.speed,
      pitch: input.pitch ?? existing.pitch,
      sample_path: input.samplePath !== undefined ? input.samplePath : existing.sample_path,
      is_default: input.isDefault !== undefined ? Number(input.isDefault) : existing.is_default,
      updated_at: new Date().toISOString(),
    }
    voiceProfileStatements.update.run(
      dto.name, dto.provider, dto.voice_key, dto.language, dto.gender_hint,
      dto.style_hint, dto.speed, dto.pitch, dto.sample_path, dto.is_default,
      dto.updated_at, dto.id,
    )
    return dto
  },

  delete(id: string): boolean {
    const result = voiceProfileStatements.deleteById.run(id)
    return (result as { changes: number }).changes > 0
  },
}
