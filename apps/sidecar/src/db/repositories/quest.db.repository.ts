import { randomUUID } from 'node:crypto'
import { questStatements } from '@/db/statements/quest.statements'
import { CreateQuest, UpdateQuest } from '@open-lore-warden/domain'

export interface QuestDto {
  id: string
  campaign_id: string
  parent_quest_id: string | null
  title: string
  category: string
  status: string
  summary: string | null
  description: string | null
  giver_npc_id: string | null
  target_location_id: string | null
  requirements_json: string | null
  rewards_json: string | null
  progress_json: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export const questDbRepository = {
  create(input: CreateQuest): QuestDto {
    const now = new Date().toISOString()
    const dto: QuestDto = {
      id: randomUUID(),
      campaign_id: input.campaignId,
      parent_quest_id: input.parentQuestId ?? null,
      title: input.title,
      category: input.category,
      status: input.status,
      summary: input.summary ?? null,
      description: input.description ?? null,
      giver_npc_id: input.giverNpcId ?? null,
      target_location_id: input.targetLocationId ?? null,
      requirements_json: input.requirementsJson ?? null,
      rewards_json: input.rewardsJson ?? null,
      progress_json: null,
      started_at: null,
      completed_at: null,
      created_at: now,
      updated_at: now,
    }
    questStatements.insert.run(
      dto.id, dto.campaign_id, dto.parent_quest_id, dto.title, dto.category,
      dto.status, dto.summary, dto.description, dto.giver_npc_id,
      dto.target_location_id, dto.requirements_json, dto.rewards_json,
      dto.progress_json, dto.started_at, dto.completed_at, dto.created_at, dto.updated_at,
    )
    return dto
  },

  findById(id: string): QuestDto | undefined {
    const row = questStatements.findById.get(id)
    if (!row) return undefined
    return row as unknown as QuestDto
  },

  findByCampaignId(campaignId: string): QuestDto[] {
    return questStatements.findByCampaignId.all(campaignId) as unknown as QuestDto[]
  },

  update(id: string, input: UpdateQuest): QuestDto | undefined {
    const existing = questDbRepository.findById(id)
    if (!existing) return undefined
    const updated: QuestDto = {
      ...existing,
      parent_quest_id: input.parentQuestId !== undefined ? (input.parentQuestId ?? null) : existing.parent_quest_id,
      title: input.title ?? existing.title,
      category: input.category ?? existing.category,
      status: input.status ?? existing.status,
      summary: input.summary !== undefined ? (input.summary ?? null) : existing.summary,
      description: input.description !== undefined ? (input.description ?? null) : existing.description,
      giver_npc_id: input.giverNpcId !== undefined ? (input.giverNpcId ?? null) : existing.giver_npc_id,
      target_location_id: input.targetLocationId !== undefined ? (input.targetLocationId ?? null) : existing.target_location_id,
      requirements_json: input.requirementsJson !== undefined ? (input.requirementsJson ?? null) : existing.requirements_json,
      rewards_json: input.rewardsJson !== undefined ? (input.rewardsJson ?? null) : existing.rewards_json,
      progress_json: input.progressJson !== undefined ? (input.progressJson ?? null) : existing.progress_json,
      started_at: input.startedAt !== undefined ? (input.startedAt ?? null) : existing.started_at,
      completed_at: input.completedAt !== undefined ? (input.completedAt ?? null) : existing.completed_at,
      updated_at: new Date().toISOString(),
    }
    questStatements.update.run(
      updated.parent_quest_id, updated.title, updated.category, updated.status, updated.summary,
      updated.description, updated.giver_npc_id, updated.target_location_id,
      updated.requirements_json, updated.rewards_json, updated.progress_json,
      updated.started_at, updated.completed_at, updated.updated_at, updated.id,
    )
    return updated
  },

  delete(id: string): boolean {
    const result = questStatements.deleteById.run(id)
    return (result as { changes: number }).changes > 0
  },
}

