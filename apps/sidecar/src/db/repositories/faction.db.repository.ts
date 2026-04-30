import { randomUUID } from 'node:crypto'
import { factionStatements } from '@/db/statements/faction.statements'
import { CreateFaction, UpdateFaction } from '@open-lore-warden/domain'

export interface FactionDto {
  id: string
  campaign_id: string
  name: string
  type: string | null
  description: string | null
  reputation_score: number
  goals_json: string | null
  status: string
  created_at: string
  updated_at: string
}

export const factionDbRepository = {
  create(input: CreateFaction): FactionDto {
    const now = new Date().toISOString()
    const dto: FactionDto = {
      id: randomUUID(),
      campaign_id: input.campaignId,
      name: input.name,
      type: input.type ?? null,
      description: input.description ?? null,
      reputation_score: input.reputationScore ?? 0,
      goals_json: input.goalsJson ?? null,
      status: input.status ?? 'active',
      created_at: now,
      updated_at: now,
    }
    factionStatements.insert.run(
      dto.id, dto.campaign_id, dto.name, dto.type, dto.description,
      dto.reputation_score, dto.goals_json, dto.status, dto.created_at, dto.updated_at,
    )
    return dto
  },

  findById(id: string): FactionDto | undefined {
    const row = factionStatements.findById.get(id)
    if (!row) return undefined
    return row as unknown as FactionDto
  },

  findByCampaignId(campaignId: string): FactionDto[] {
    return factionStatements.findByCampaignId.all(campaignId).map(
      (row) => row as unknown as FactionDto,
    )
  },

  update(id: string, input: UpdateFaction): FactionDto | undefined {
    const existing = factionDbRepository.findById(id)
    if (!existing) return undefined
    const dto: FactionDto = {
      ...existing,
      name: input.name ?? existing.name,
      type: input.type !== undefined ? input.type : existing.type,
      description: input.description !== undefined ? input.description : existing.description,
      reputation_score: input.reputationScore !== undefined ? input.reputationScore : existing.reputation_score,
      goals_json: input.goalsJson !== undefined ? input.goalsJson : existing.goals_json,
      status: input.status ?? existing.status,
      updated_at: new Date().toISOString(),
    } 
    factionStatements.update.run(
      dto.name, dto.type, dto.description, dto.reputation_score,
      dto.goals_json, dto.status, dto.updated_at, dto.id,
    )
    return dto
  },

  delete(id: string): boolean {
    const result = factionStatements.deleteById.run(id)
    return (result as { changes: number }).changes > 0
  },
}
