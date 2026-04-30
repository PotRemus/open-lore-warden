import { z } from 'zod'

export const ImageAssetSchema = z.object({
  id: z.string().min(1),
  campaignId: z.string().optional(),
  assetType: z.string().min(1),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  title: z.string().optional(),
  filePath: z.string().min(1),
  mimeType: z.string().optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  promptText: z.string().optional(),
  sourceType: z.string().min(1),
  metadataJson: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type ImageAsset = z.infer<typeof ImageAssetSchema>

export const CreateImageAssetSchema = z.object({
  campaignId: z.string().optional(),
  assetType: z.string().min(1),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  title: z.string().optional(),
  filePath: z.string().min(1),
  mimeType: z.string().optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  promptText: z.string().optional(),
  sourceType: z.string().min(1).optional(),
})

export type CreateImageAsset = z.infer<typeof CreateImageAssetSchema>

export const UpdateImageAssetSchema = z.object({
  assetType: z.string().min(1).optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  title: z.string().optional(),
  filePath: z.string().min(1).optional(),
  mimeType: z.string().optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  promptText: z.string().optional(),
  sourceType: z.string().min(1).optional(),
  metadataJson: z.string().optional(),
})

export type UpdateImageAsset = z.infer<typeof UpdateImageAssetSchema>
