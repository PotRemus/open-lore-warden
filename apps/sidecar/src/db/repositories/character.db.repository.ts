import { randomUUID } from 'node:crypto'
import { characterStatements } from '@/db/statements/character.statements'
import type { CreateCharacter, UpdateCharacter } from '@open-lore-warden/domain'

export interface CharacterDto {
  id: string
  campaign_id: string
  name: string
  role: string
  /** JSON blob carrying all system-specific stats (HP, level, sanity, stress, skills…). */
  stats_json: string
  status_json: string | null
  created_at: string
  updated_at: string
}

export const characterDbRepository = {
  create(input: CreateCharacter): CharacterDto {
    const now = new Date().toISOString()
    const dto: CharacterDto = {
      id: randomUUID(),
      campaign_id: input.campaignId,
      name: input.name,
      role: input.role,
      stats_json: input.statsJson,
      status_json: input.statusJson ?? null,
      created_at: now,
      updated_at: now,
    }
    characterStatements.insert.run(
      dto.id,
      dto.campaign_id,
      dto.name,
      dto.role,
      dto.stats_json,
      dto.status_json,
      dto.created_at,
      dto.updated_at,
    )
    return dto
  },

  findById(id: string): CharacterDto | undefined {
    const row = characterStatements.findById.get(id)
    if (!row) return undefined
    return row as unknown as CharacterDto
  },

  findByCampaignId(campaignId: string): CharacterDto[] {
    return characterStatements.findByCampaignId.all(campaignId) as unknown as CharacterDto[]
  },

  update(id: string, input: UpdateCharacter): CharacterDto | undefined {
    const existing = characterDbRepository.findById(id)
    if (!existing) return undefined
    const updated: CharacterDto = {
      ...existing,
      name: input.name ?? existing.name,
      role: input.role ?? existing.role,
      stats_json: input.statsJson ?? existing.stats_json,
      status_json: input.statusJson !== undefined ? (input.statusJson ?? null) : existing.status_json,
      updated_at: new Date().toISOString(),
    }
    characterStatements.update.run(
      updated.name,
      updated.role,
      updated.stats_json,
      updated.status_json,
      updated.updated_at,
      updated.id,
    )
    return updated
  },

  delete(id: string): boolean {
    const result = characterStatements.deleteById.run(id)
    return (result as { changes: number }).changes > 0
  },
}
