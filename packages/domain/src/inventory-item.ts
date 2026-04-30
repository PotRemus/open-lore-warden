import { z } from 'zod'

export const InventoryItemSchema = z.object({
  id: z.string().min(1),
  campaignId: z.string().min(1),
  itemId: z.string().min(1),
  ownerType: z.string().min(1),
  ownerId: z.string().min(1),
  quantity: z.number().int(),
  isEquipped: z.boolean(),
  slot: z.string().optional(),
  conditionText: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type InventoryItem = z.infer<typeof InventoryItemSchema>

export const CreateInventoryItemSchema = z.object({
  campaignId: z.string().min(1),
  itemId: z.string().min(1),
  ownerType: z.string().min(1),
  ownerId: z.string().min(1),
  quantity: z.number().int().optional(),
  isEquipped: z.boolean().optional(),
  slot: z.string().optional(),
  conditionText: z.string().optional(),
  notes: z.string().optional(),
})

export type CreateInventoryItem = z.infer<typeof CreateInventoryItemSchema>

export const UpdateInventoryItemSchema = z.object({
  quantity: z.number().int().optional(),
  isEquipped: z.boolean().optional(),
  slot: z.string().optional(),
  conditionText: z.string().optional(),
  notes: z.string().optional(),
})

export type UpdateInventoryItem = z.infer<typeof UpdateInventoryItemSchema>
