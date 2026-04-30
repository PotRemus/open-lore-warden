import { z } from 'zod'

export const PlayerSchema = z.object({
  id: z.string().min(1),
  campaignId: z.string().min(1),
  displayName: z.string().min(1),
  email: z.string().optional(),
  isHost: z.boolean(),
  preferencesJson: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Player = z.infer<typeof PlayerSchema>

export const CreatePlayerSchema = z.object({
  campaignId: z.string().min(1),
  displayName: z.string().min(1),
  email: z.string().optional(),
  isHost: z.boolean().optional(),
  preferencesJson: z.string().optional(),
})

export type CreatePlayer = z.infer<typeof CreatePlayerSchema>

export const UpdatePlayerSchema = z.object({
  displayName: z.string().min(1).optional(),
  email: z.string().optional(),
  isHost: z.boolean().optional(),
  preferencesJson: z.string().optional(),
})

export type UpdatePlayer = z.infer<typeof UpdatePlayerSchema>
