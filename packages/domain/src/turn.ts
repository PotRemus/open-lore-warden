import { z } from 'zod'
import { SceneSchema } from './scene'
import { TurnEventSchema } from './turn-event'

export const TurnSchema = z.object({
  id: z.string().min(1),
  campaignId: z.string().min(1),
  sceneId: z.string().min(1),
  playerInput: z.string().min(1),
  intentJson: z.string().optional(),
  rulesResultJson: z.string(),
  narrationText: z.string(),
  mediaPlanJson: z.string().optional(),
  createdAt: z.string(),
  scene: SceneSchema.optional(),
  events: z.array(TurnEventSchema),
})

export type Turn = z.infer<typeof TurnSchema>

export const CreateTurnSchema = z.object({
  campaignId: z.string().min(1),
  sceneId: z.string().min(1),
  playerInput: z.string().min(1),
  intentJson: z.string().optional(),
  rulesResultJson: z.string(),
  narrationText: z.string(),
  mediaPlanJson: z.string().optional(),
})

export type CreateTurn = z.infer<typeof CreateTurnSchema>
