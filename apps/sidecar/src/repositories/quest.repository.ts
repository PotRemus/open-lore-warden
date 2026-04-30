import { questDbRepository, QuestDto } from '@/db/repositories/quest.db.repository'
import { npcDbRepository } from '@/db/repositories/npc.db.repository'
import { locationDbRepository } from '@/db/repositories/location.db.repository'
import type { Quest, CreateQuest, UpdateQuest, QuestRef, NpcRef, LocationRef } from '@open-lore-warden/domain'

function toQuestRef(dto: QuestDto): QuestRef {
  return {
    id: dto.id,
    title: dto.title,
    status: dto.status,
    category: dto.category,
  }
}

function toQuest(dto: QuestDto): Quest {
  let giverNpc: NpcRef | undefined
  if (dto.giver_npc_id) {
    const npc = npcDbRepository.findById(dto.giver_npc_id)
    if (npc) giverNpc = {
      id: npc.id,
      name: npc.name,
      disposition: npc.disposition ?? undefined,
    }
  }

  let targetLocation: LocationRef | undefined
  if (dto.target_location_id) {
    const location = locationDbRepository.findById(dto.target_location_id)
    if (location) targetLocation = { 
      id: location.id, 
      name: location.name, 
      type: location.type, 
    }
  }

  let parentQuest: QuestRef | undefined
  if (dto.parent_quest_id) {
    const parent = questDbRepository.findById(dto.parent_quest_id)
    if (parent) parentQuest = toQuestRef(parent)
  }

  const subQuests = questDbRepository
    .findByCampaignId(dto.campaign_id)
    .filter((q) => q.parent_quest_id === dto.id)
    .map(toQuestRef)
    .filter((q): q is NonNullable<typeof q> => q !== undefined)

  return {
    id: dto.id,
    campaignId: dto.campaign_id,
    parentQuestId: dto.parent_quest_id ?? undefined,
    title: dto.title,
    category: dto.category,
    status: dto.status,
    summary: dto.summary ?? undefined,
    description: dto.description ?? undefined,
    giverNpcId: dto.giver_npc_id ?? undefined,
    targetLocationId: dto.target_location_id ?? undefined,
    requirementsJson: dto.requirements_json ?? undefined,
    rewardsJson: dto.rewards_json ?? undefined,
    progressJson: dto.progress_json ?? undefined,
    startedAt: dto.started_at ?? undefined,
    completedAt: dto.completed_at ?? undefined,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    giverNpc,
    targetLocation,
    parentQuest,
    subQuests,
  }
}

export const questRepository = {
  create(input: CreateQuest): Quest {
    return toQuest(questDbRepository.create(input))
  },

  findById(id: string): Quest | undefined {
    const dto = questDbRepository.findById(id)
    if (!dto) return undefined
    return toQuest(dto)
  },

  findByCampaignId(campaignId: string): Quest[] {
    return questDbRepository.findByCampaignId(campaignId).map(toQuest)
  },

  update(id: string, input: UpdateQuest): Quest | undefined {
    const dto = questDbRepository.update(id, input)
    if (!dto) return undefined
    return toQuest(dto)
  },

  delete(id: string): boolean {
    return questDbRepository.delete(id)
  },
}

