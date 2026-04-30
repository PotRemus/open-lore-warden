import { randomUUID } from 'node:crypto'
import { audioCueStatements } from '@/db/statements/audio-cue.statements'
import { CreateAudioCue, UpdateAudioCue } from '@open-lore-warden/domain'

export interface AudioCueDto {
  id: string
  campaign_id: string | null
  name: string
  cue_type: string
  category: string | null
  file_path: string
  loop: number
  default_volume: number
  fade_in_ms: number
  fade_out_ms: number
  tags_json: string | null
  created_at: string
  updated_at: string
}

export const audioCueDbRepository = {
  create(input: CreateAudioCue): AudioCueDto {
    const now = new Date().toISOString()
    const dto: AudioCueDto = {
      id: randomUUID(),
      campaign_id: input.campaignId ?? null,
      name: input.name,
      cue_type: input.cueType,
      category: input.category ?? null,
      file_path: input.filePath,
      loop: input.loop ? 1 : 0,
      default_volume: input.defaultVolume ?? 1.0,
      fade_in_ms: input.fadeInMs ?? 0,
      fade_out_ms: input.fadeOutMs ?? 0,
      tags_json: input.tagsJson ?? null,
      created_at: now,
      updated_at: now,
    }
    audioCueStatements.insert.run(
      dto.id, dto.campaign_id, dto.name, dto.cue_type, dto.category,
      dto.file_path, dto.loop, dto.default_volume, dto.fade_in_ms,
      dto.fade_out_ms, dto.tags_json, dto.created_at, dto.updated_at,
    )
    return dto
  },

  findById(id: string): AudioCueDto | undefined {
    const row = audioCueStatements.findById.get(id)
    if (!row) return undefined
    return row as unknown as AudioCueDto
  },

  findByCampaignId(campaignId: string): AudioCueDto[] {
    return audioCueStatements.findByCampaignId.all(campaignId).map(
      (row) => row as unknown as AudioCueDto,
    )
  },

  findGlobal(): AudioCueDto[] {
    return audioCueStatements.findGlobal.all().map(
      (row) => row as unknown as AudioCueDto,
    )
  },

  update(id: string, input: UpdateAudioCue): AudioCueDto | undefined {
    const existing = audioCueDbRepository.findById(id)
    if (!existing) return undefined
    const dto: AudioCueDto = {
      ...existing,
      name: input.name ?? existing.name,
      cue_type: input.cueType ?? existing.cue_type,
      category: input.category !== undefined ? input.category : existing.category,
      file_path: input.filePath ?? existing.file_path,
      loop: input.loop !== undefined ? Number(input.loop) : existing.loop,
      default_volume: input.defaultVolume ?? existing.default_volume,
      fade_in_ms: input.fadeInMs ?? existing.fade_in_ms,
      fade_out_ms: input.fadeOutMs ?? existing.fade_out_ms,
      tags_json: input.tagsJson !== undefined ? input.tagsJson : existing.tags_json,
      updated_at: new Date().toISOString(),
    }
    audioCueStatements.update.run(
      dto.name, dto.cue_type, dto.category, dto.file_path, dto.loop,
      dto.default_volume, dto.fade_in_ms, dto.fade_out_ms, dto.tags_json,
      dto.updated_at, dto.id,
    )
    return dto
  },

  delete(id: string): boolean {
    const result = audioCueStatements.deleteById.run(id)
    return (result as { changes: number }).changes > 0
  },
}
