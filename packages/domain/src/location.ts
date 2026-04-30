import { z } from 'zod'

export const LocationSchema = z.object({
  id: z.string().min(1),
  campaignId: z.string().min(1),
  parentLocationId: z.string().optional(),
  name: z.string().min(1),
  type: z.string().min(1),
  descriptionPublic: z.string().optional(),
  descriptionGm: z.string().optional(),
  tagsJson: z.string().optional(),
  dangerLevel: z.number().int(),
  imageAssetId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Location = z.infer<typeof LocationSchema>

export const CreateLocationSchema = z.object({
  campaignId: z.string().min(1),
  parentLocationId: z.string().optional(),
  name: z.string().min(1),
  type: z.string().min(1),
  descriptionPublic: z.string().optional(),
  descriptionGm: z.string().optional(),
  tagsJson: z.string().optional(),
  dangerLevel: z.number().int().optional(),
  imageAssetId: z.string().optional(),
})

export type CreateLocation = z.infer<typeof CreateLocationSchema>

export const UpdateLocationSchema = z.object({
  parentLocationId: z.string().optional(),
  name: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  descriptionPublic: z.string().optional(),
  descriptionGm: z.string().optional(),
  tagsJson: z.string().optional(),
  dangerLevel: z.number().int().optional(),
  imageAssetId: z.string().optional(),
})

export type UpdateLocation = z.infer<typeof UpdateLocationSchema>
