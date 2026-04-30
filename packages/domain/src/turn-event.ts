import { z } from 'zod'

export const TurnEventSchema = z.object({
  id: z.string().min(1),
  turnId: z.string().min(1),
  campaignId: z.string().min(1),
  sceneId: z.string().optional(),
  eventType: z.string().min(1),
  actorType: z.string().optional(),
  actorId: z.string().optional(),
  targetType: z.string().optional(),
  targetId: z.string().optional(),
  payloadJson: z.string(),
  sortOrder: z.number().int(),
  createdAt: z.string(),
})

export type TurnEvent = z.infer<typeof TurnEventSchema>

export const CreateTurnEventSchema = z.object({
  turnId: z.string().min(1),
  campaignId: z.string().min(1),
  sceneId: z.string().optional(),
  eventType: z.string().min(1),
  actorType: z.string().optional(),
  actorId: z.string().optional(),
  targetType: z.string().optional(),
  targetId: z.string().optional(),
  payloadJson: z.string(),
  sortOrder: z.number().int().optional(),
})

export type CreateTurnEvent = z.infer<typeof CreateTurnEventSchema>
