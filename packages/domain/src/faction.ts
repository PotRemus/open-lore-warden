import { z } from 'zod'

export const FactionSchema = z.object({
  id: z.string().min(1),
  campaignId: z.string().min(1),
  name: z.string().min(1),
  type: z.string().optional(),
  description: z.string().optional(),
  reputationScore: z.number().int(),
  goalsJson: z.string().optional(),
  status: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Faction = z.infer<typeof FactionSchema>

export const CreateFactionSchema = z.object({
  campaignId: z.string().min(1),
  name: z.string().min(1),
  type: z.string().optional(),
  description: z.string().optional(),
  reputationScore: z.number().int().optional(),
  goalsJson: z.string().optional(),
  status: z.string().min(1).optional(),
})

export type CreateFaction = z.infer<typeof CreateFactionSchema>

export const UpdateFactionSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.string().optional(),
  description: z.string().optional(),
  reputationScore: z.number().int().optional(),
  goalsJson: z.string().optional(),
  status: z.string().min(1).optional(),
})

export type UpdateFaction = z.infer<typeof UpdateFactionSchema>
