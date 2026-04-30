import { z } from 'zod'

export const CampaignFlagSchema = z.object({
  id: z.string().min(1),
  campaignId: z.string().min(1),
  scopeType: z.string().min(1),
  scopeId: z.string().optional(),
  key: z.string().min(1),
  value: z.string().optional(),
  valueType: z.string().min(1),
  updatedAt: z.string(),
})

export type CampaignFlag = z.infer<typeof CampaignFlagSchema>

export const SetCampaignFlagSchema = z.object({
  campaignId: z.string().min(1),
  scopeType: z.string().min(1).optional(),
  scopeId: z.string().optional(),
  key: z.string().min(1),
  value: z.string().optional(),
  valueType: z.string().min(1).optional(),
})

export type SetCampaignFlag = z.infer<typeof SetCampaignFlagSchema>
