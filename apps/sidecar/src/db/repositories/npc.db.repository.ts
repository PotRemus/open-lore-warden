import { randomUUID } from 'node:crypto'
import { npcStatements } from '@/db/statements/npc.statements'
import { CreateNpc, UpdateNpc } from '@open-lore-warden/domain'

export interface NpcDto {
  id: string
  campaign_id: string
  name: string
  faction_id: string | null
  location_id: string | null
  voice_profile_id: string | null
  summary: string | null
  disposition: string | null
  secret_notes: string | null
  created_at: string
  updated_at: string
}

export const npcDbRepository = {
  create(input: CreateNpc): NpcDto {
    const now = new Date().toISOString()
    const dto: NpcDto = {
      id: randomUUID(),
      campaign_id: input.campaignId,
      name: input.name,
      faction_id: input.factionId ?? null,
      location_id: input.locationId ?? null,
      voice_profile_id: input.voiceProfileId ?? null,
      summary: input.summary ?? null,
      disposition: input.disposition ?? null,
      secret_notes: input.secretNotes ?? null,
      created_at: now,
      updated_at: now,
    }
    npcStatements.insert.run(
      dto.id, dto.campaign_id, dto.name, dto.faction_id, dto.location_id,
      dto.voice_profile_id, dto.summary, dto.disposition, dto.secret_notes,
      dto.created_at, dto.updated_at,
    )
    return dto
  },

  findById(id: string): NpcDto | undefined {
    const row = npcStatements.findById.get(id)
    if (!row) return undefined
    return row as unknown as NpcDto
  },

  findByCampaignId(campaignId: string): NpcDto[] {
    return npcStatements.findByCampaignId.all(campaignId) as unknown as NpcDto[]
  },

  update(id: string, input: UpdateNpc): NpcDto | undefined {
    const existing = npcDbRepository.findById(id)
    if (!existing) return undefined
    const updated: NpcDto = {
      ...existing,
      name: input.name ?? existing.name,
      faction_id: input.factionId !== undefined ? (input.factionId ?? null) : existing.faction_id,
      location_id: input.locationId !== undefined ? (input.locationId ?? null) : existing.location_id,
      voice_profile_id: input.voiceProfileId !== undefined ? (input.voiceProfileId ?? null) : existing.voice_profile_id,
      summary: input.summary !== undefined ? (input.summary ?? null) : existing.summary,
      disposition: input.disposition !== undefined ? (input.disposition ?? null) : existing.disposition,
      secret_notes: input.secretNotes !== undefined ? (input.secretNotes ?? null) : existing.secret_notes,
      updated_at: new Date().toISOString(),
    }
    npcStatements.update.run(
      updated.name, updated.faction_id, updated.location_id, updated.voice_profile_id,
      updated.summary, updated.disposition, updated.secret_notes, updated.updated_at, updated.id,
    )
    return updated
  },

  delete(id: string): boolean {
    const result = npcStatements.deleteById.run(id)
    return (result as { changes: number }).changes > 0
  },
}
