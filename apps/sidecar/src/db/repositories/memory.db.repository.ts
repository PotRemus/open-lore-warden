import { randomUUID } from 'node:crypto'
import { memoryStatements } from '@/db/statements/memory.statements'
import { CreateMemory } from '@open-lore-warden/domain'

export interface MemoryDto {
  id: string
  campaign_id: string
  entity_type: string
  entity_id: string | null
  memory_type: string
  content: string
  importance: number
  source_turn_id: string | null
  created_at: string
}

export const memoryDbRepository = {
  create(input: CreateMemory): MemoryDto {
    const dto: MemoryDto = {
      id: randomUUID(),
      campaign_id: input.campaignId,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      memory_type: input.memoryType,
      content: input.content,
      importance: input.importance ?? 1,
      source_turn_id: input.sourceTurnId ?? null,
      created_at: new Date().toISOString(),
    }
    memoryStatements.insert.run(
      dto.id, dto.campaign_id, dto.entity_type, dto.entity_id, dto.memory_type,
      dto.content, dto.importance, dto.source_turn_id, dto.created_at,
    )
    return dto
  },

  findById(id: string): MemoryDto | undefined {
    const row = memoryStatements.findById.get(id)
    if (!row) return undefined
    return row as unknown as MemoryDto
  },

  findByCampaignId(campaignId: string): MemoryDto[] {
    return memoryStatements.findByCampaignId.all(campaignId) as unknown as MemoryDto[]
  },

  findByCampaignAndEntity(campaignId: string, entityType: string, entityId: string): MemoryDto[] {
    return memoryStatements.findByCampaignAndEntity.all(campaignId, entityType, entityId) as unknown as MemoryDto[]
  },

  delete(id: string): boolean {
    const result = memoryStatements.deleteById.run(id)
    return (result as { changes: number }).changes > 0
  },
}
