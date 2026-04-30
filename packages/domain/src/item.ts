import { z } from 'zod'

export const ItemSchema = z.object({
  id: z.string().min(1),
  campaignId: z.string().min(1),
  name: z.string().min(1),
  itemType: z.string().min(1),
  rarity: z.string().optional(),
  stackable: z.boolean(),
  equippable: z.boolean(),
  weight: z.number().optional(),
  valueAmount: z.number().int().optional(),
  valueCurrency: z.string().optional(),
  description: z.string().optional(),
  effectsJson: z.string().optional(),
  imageAssetId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Item = z.infer<typeof ItemSchema>

export const CreateItemSchema = z.object({
  campaignId: z.string().min(1),
  name: z.string().min(1),
  itemType: z.string().min(1),
  rarity: z.string().optional(),
  stackable: z.boolean().optional(),
  equippable: z.boolean().optional(),
  weight: z.number().optional(),
  valueAmount: z.number().int().optional(),
  valueCurrency: z.string().optional(),
  description: z.string().optional(),
  effectsJson: z.string().optional(),
  imageAssetId: z.string().optional(),
})

export type CreateItem = z.infer<typeof CreateItemSchema>

export const UpdateItemSchema = z.object({
  name: z.string().min(1).optional(),
  itemType: z.string().min(1).optional(),
  rarity: z.string().optional(),
  stackable: z.boolean().optional(),
  equippable: z.boolean().optional(),
  weight: z.number().optional(),
  valueAmount: z.number().int().optional(),
  valueCurrency: z.string().optional(),
  description: z.string().optional(),
  effectsJson: z.string().optional(),
  imageAssetId: z.string().optional(),
})

export type UpdateItem = z.infer<typeof UpdateItemSchema>
