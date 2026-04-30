import { z } from 'zod'

export const VoiceProfileSchema = z.object({
  id: z.string().min(1),
  campaignId: z.string().optional(),
  name: z.string().min(1),
  provider: z.string().min(1),
  voiceKey: z.string().min(1),
  language: z.string().min(1),
  genderHint: z.string().optional(),
  styleHint: z.string().optional(),
  speed: z.number(),
  pitch: z.number(),
  samplePath: z.string().optional(),
  isDefault: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type VoiceProfile = z.infer<typeof VoiceProfileSchema>

export const CreateVoiceProfileSchema = z.object({
  campaignId: z.string().optional(),
  name: z.string().min(1),
  provider: z.string().min(1),
  voiceKey: z.string().min(1),
  language: z.string().min(1).optional(),
  genderHint: z.string().optional(),
  styleHint: z.string().optional(),
  speed: z.number().optional(),
  pitch: z.number().optional(),
  samplePath: z.string().optional(),
  isDefault: z.boolean().optional(),
})

export type CreateVoiceProfile = z.infer<typeof CreateVoiceProfileSchema>

export const UpdateVoiceProfileSchema = z.object({
  name: z.string().min(1).optional(),
  provider: z.string().min(1).optional(),
  voiceKey: z.string().min(1).optional(),
  language: z.string().min(1).optional(),
  genderHint: z.string().optional(),
  styleHint: z.string().optional(),
  speed: z.number().optional(),
  pitch: z.number().optional(),
  samplePath: z.string().optional(),
  isDefault: z.boolean().optional(),
})

export type UpdateVoiceProfile = z.infer<typeof UpdateVoiceProfileSchema>
