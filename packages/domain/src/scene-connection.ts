import { z } from 'zod'

export const SceneConnectionSchema = z.object({
  id: z.string().min(1),
  campaignId: z.string().min(1),
  fromSceneId: z.string().min(1),
  toSceneId: z.string().min(1),
  connectionType: z.string().min(1),
  label: z.string().optional(),
  isBidirectional: z.boolean(),
  conditionsJson: z.string().optional(),
  priority: z.number().int(),
  createdAt: z.string(),
})

export type SceneConnection = z.infer<typeof SceneConnectionSchema>

export const CreateSceneConnectionSchema = z.object({
  campaignId: z.string().min(1),
  fromSceneId: z.string().min(1),
  toSceneId: z.string().min(1),
  connectionType: z.string().min(1),
  label: z.string().optional(),
  isBidirectional: z.boolean().optional(),
  conditionsJson: z.string().optional(),
  priority: z.number().int().optional(),
})

export type CreateSceneConnection = z.infer<typeof CreateSceneConnectionSchema>
