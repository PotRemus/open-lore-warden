import { z } from 'zod'

export const NpcRefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  disposition: z.string().optional(),
})
export type NpcRef = z.infer<typeof NpcRefSchema>

export const LocationRefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
})
export type LocationRef = z.infer<typeof LocationRefSchema>

export const QuestRefSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  status: z.string().min(1),
  category: z.string().min(1),
})
export type QuestRef = z.infer<typeof QuestRefSchema>

export const QuestSchema = z.object({
  id: z.string().min(1),
  campaignId: z.string().min(1),
  parentQuestId: z.string().optional(),
  title: z.string().min(1),
  category: z.string().min(1),
  status: z.string().min(1),
  summary: z.string().optional(),
  description: z.string().optional(),
  giverNpcId: z.string().optional(),
  targetLocationId: z.string().optional(),
  requirementsJson: z.string().optional(),
  rewardsJson: z.string().optional(),
  progressJson: z.string().optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  giverNpc: NpcRefSchema.optional(),
  targetLocation: LocationRefSchema.optional(),
  parentQuest: QuestRefSchema.optional(),
  subQuests: z.array(QuestRefSchema),
})

export type Quest = z.infer<typeof QuestSchema>

export const CreateQuestSchema = z.object({
  campaignId: z.string().min(1),
  parentQuestId: z.string().optional(),
  title: z.string().min(1),
  category: z.string().min(1),
  status: z.string().min(1),
  summary: z.string().optional(),
  description: z.string().optional(),
  giverNpcId: z.string().optional(),
  targetLocationId: z.string().optional(),
  requirementsJson: z.string().optional(),
  rewardsJson: z.string().optional(),
})

export type CreateQuest = z.infer<typeof CreateQuestSchema>

export const UpdateQuestSchema = z.object({
  parentQuestId: z.string().optional(),
  title: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
  summary: z.string().optional(),
  description: z.string().optional(),
  giverNpcId: z.string().optional(),
  targetLocationId: z.string().optional(),
  requirementsJson: z.string().optional(),
  rewardsJson: z.string().optional(),
  progressJson: z.string().optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
})

export type UpdateQuest = z.infer<typeof UpdateQuestSchema>
