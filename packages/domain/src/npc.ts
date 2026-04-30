import { z } from 'zod'
import { FactionSchema } from './faction'
import { LocationSchema } from './location'
import { VoiceProfileSchema } from './voice-profile'

export const NpcSchema = z.object({
  id: z.string().min(1),
  campaignId: z.string().min(1),
  name: z.string().min(1),
  factionId: z.string().optional(),
  locationId: z.string().optional(),
  voiceProfileId: z.string().optional(),
  summary: z.string().optional(),
  disposition: z.string().optional(),
  secretNotes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  faction: FactionSchema.optional(),
  location: LocationSchema.optional(),
  voiceProfile: VoiceProfileSchema.optional(),
})

export type Npc = z.infer<typeof NpcSchema>

export const CreateNpcSchema = z.object({
  campaignId: z.string().min(1),
  name: z.string().min(1),
  factionId: z.string().optional(),
  locationId: z.string().optional(),
  voiceProfileId: z.string().optional(),
  summary: z.string().optional(),
  disposition: z.string().optional(),
  secretNotes: z.string().optional(),
})

export type CreateNpc = z.infer<typeof CreateNpcSchema>

export const UpdateNpcSchema = z.object({
  name: z.string().min(1).optional(),
  factionId: z.string().optional(),
  locationId: z.string().optional(),
  voiceProfileId: z.string().optional(),
  summary: z.string().optional(),
  disposition: z.string().optional(),
  secretNotes: z.string().optional(),
})

export type UpdateNpc = z.infer<typeof UpdateNpcSchema>
