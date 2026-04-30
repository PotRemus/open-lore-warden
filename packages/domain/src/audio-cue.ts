import { z } from 'zod'

export const AudioCueSchema = z.object({
  id: z.string().min(1),
  campaignId: z.string().optional(),
  name: z.string().min(1),
  cueType: z.string().min(1),
  category: z.string().optional(),
  filePath: z.string().min(1),
  loop: z.boolean(),
  defaultVolume: z.number(),
  fadeInMs: z.number().int(),
  fadeOutMs: z.number().int(),
  tagsJson: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type AudioCue = z.infer<typeof AudioCueSchema>

export const CreateAudioCueSchema = z.object({
  campaignId: z.string().optional(),
  name: z.string().min(1),
  cueType: z.string().min(1),
  category: z.string().optional(),
  filePath: z.string().min(1),
  loop: z.boolean().optional(),
  defaultVolume: z.number().optional(),
  fadeInMs: z.number().int().optional(),
  fadeOutMs: z.number().int().optional(),
  tagsJson: z.string().optional(),
})

export type CreateAudioCue = z.infer<typeof CreateAudioCueSchema>

export const UpdateAudioCueSchema = z.object({
  name: z.string().min(1).optional(),
  cueType: z.string().min(1).optional(),
  category: z.string().optional(),
  filePath: z.string().min(1).optional(),
  loop: z.boolean().optional(),
  defaultVolume: z.number().optional(),
  fadeInMs: z.number().int().optional(),
  fadeOutMs: z.number().int().optional(),
  tagsJson: z.string().optional(),
})

export type UpdateAudioCue = z.infer<typeof UpdateAudioCueSchema>
