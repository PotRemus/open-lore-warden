import { randomUUID } from 'node:crypto'
import { playerStatements } from '@/db/statements/player.statements'
import { CreatePlayer, UpdatePlayer } from '@open-lore-warden/domain'

export interface PlayerDto {
  id: string
  campaign_id: string
  display_name: string
  email: string | null
  is_host: number
  preferences_json: string | null
  created_at: string
  updated_at: string
}

// TODO repository : not use
export const playerDbRepository = {
  create(input: CreatePlayer): PlayerDto {
    const now = new Date().toISOString()
    const dto: PlayerDto = {
      id: randomUUID(),
      campaign_id: input.campaignId,
      display_name: input.displayName,
      email: input.email ?? null,
      is_host: input.isHost ? 1 : 0,
      preferences_json: input.preferencesJson ?? null,
      created_at: now,
      updated_at: now,
    }
    playerStatements.insert.run(
      dto.id, dto.campaign_id, dto.display_name, dto.email,
      dto.is_host, dto.preferences_json, dto.created_at, dto.updated_at,
    )
    return dto
  },

  findById(id: string): PlayerDto | undefined {
    const row = playerStatements.findById.get(id)
    if (!row) return undefined
    return row as unknown as PlayerDto
  },

  findByCampaignId(campaignId: string): PlayerDto[] {
    return playerStatements.findByCampaignId.all(campaignId).map(
      (row) => row as unknown as PlayerDto,
    )
  },

  update(id: string, input: UpdatePlayer): PlayerDto | undefined {
    const existing = playerDbRepository.findById(id)
    if (!existing) return undefined
    const dto: PlayerDto = {
      ...existing,
      display_name: input.displayName ?? existing.display_name,
      email: input.email !== undefined ? input.email : existing.email,
      is_host: input.isHost !== undefined ? Number(input.isHost) : existing.is_host,
      preferences_json: input.preferencesJson !== undefined ? input.preferencesJson : existing.preferences_json,
      updated_at: new Date().toISOString(),
    }
    playerStatements.update.run(
      dto.display_name, dto.email, dto.is_host, dto.preferences_json, dto.updated_at, dto.id,
    )
    return dto
  },

  delete(id: string): boolean {
    const result = playerStatements.deleteById.run(id)
    return (result as { changes: number }).changes > 0
  },
}
