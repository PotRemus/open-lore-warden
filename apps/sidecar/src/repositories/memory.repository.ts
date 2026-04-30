import { memoryDbRepository, MemoryDto } from '@/db/repositories/memory.db.repository'
import { turnDbRepository } from '@/db/repositories/turn.db.repository'
import type { Memory, CreateMemory } from '@open-lore-warden/domain'

function toMemory(dto: MemoryDto): Memory {
  let sourceTurn: Memory['sourceTurn']
  if (dto.source_turn_id) {
    const turn = turnDbRepository.findById(dto.source_turn_id)
    if (turn) sourceTurn = { id: turn.id, playerInput: turn.player_input, createdAt: turn.created_at }
  }
  return {
    id: dto.id,
    campaignId: dto.campaign_id,
    entityType: dto.entity_type,
    entityId: dto.entity_id ?? undefined,
    memoryType: dto.memory_type,
    content: dto.content,
    importance: dto.importance,
    sourceTurnId: dto.source_turn_id ?? undefined,
    createdAt: dto.created_at,
    sourceTurn,
  }
}

export const memoryRepository = {
  create(input: CreateMemory): Memory {
    return toMemory(memoryDbRepository.create(input))
  },

  findById(id: string): Memory | undefined {
    const dto = memoryDbRepository.findById(id)
    if (!dto) return undefined
    return toMemory(dto)
  },

  findByCampaignId(campaignId: string): Memory[] {
    return memoryDbRepository.findByCampaignId(campaignId).map(toMemory)
  },

  findByCampaignAndEntity(campaignId: string, entityType: string, entityId: string): Memory[] {
    return memoryDbRepository.findByCampaignAndEntity(campaignId, entityType, entityId).map(toMemory)
  },

  delete(id: string): boolean {
    return memoryDbRepository.delete(id)
  },
}
