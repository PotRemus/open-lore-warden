import { z } from 'zod'

export const TurnRefSchema = z.object({
  id: z.string().min(1),
  playerInput: z.string().min(1),
  createdAt: z.string(),
})

export type TurnRef = z.infer<typeof TurnRefSchema>

export const MemorySchema = z.object({
  id: z.string().min(1),
  campaignId: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.string().optional(),
  memoryType: z.string().min(1),
  content: z.string(),
  importance: z.number().int(),
  sourceTurnId: z.string().optional(),
  createdAt: z.string(),
  sourceTurn: TurnRefSchema.optional(),
})

export type Memory = z.infer<typeof MemorySchema>

export const CreateMemorySchema = z.object({
  campaignId: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.string().optional(),
  memoryType: z.string().min(1),
  content: z.string(),
  importance: z.number().int().optional(),
  sourceTurnId: z.string().optional(),
})

export type CreateMemory = z.infer<typeof CreateMemorySchema>
