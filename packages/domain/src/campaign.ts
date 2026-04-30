import { z } from 'zod'
import { SceneSchema } from './scene'

export const CampaignSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  system: z.string().min(1),
  setting: z.string().optional(),
  currentSceneId: z.string().optional(),
  createdAt: z.iso.date(),
  updatedAt: z.iso.date(),
  currentScene: SceneSchema.optional(),
})

export type Campaign = z.infer<typeof CampaignSchema>

export const CreateCampaignSchema = z.object({
  name: z.string().min(1),
  system: z.string().min(1),
  setting: z.string().optional(),
})

export type CreateCampaign = z.infer<typeof CreateCampaignSchema>

export const UpdateCampaignSchema = z.object({
  currentScene: SceneSchema.optional(),
})

export type UpdateCampaign = z.infer<typeof UpdateCampaignSchema>
