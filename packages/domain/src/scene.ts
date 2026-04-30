import { z } from 'zod'
import { LocationSchema } from './location'
import { AudioCueSchema } from './audio-cue'
import { SceneConnectionSchema } from './scene-connection'
import { EncounterSchema } from './encounter'

export const SceneSchema = z.object({
  id: z.string().min(1),
  campaignId: z.string().min(1),
  locationId: z.string().optional(),
  name: z.string().min(1),
  sceneType: z.string().min(1),
  status: z.string().min(1),
  intensity: z.string().optional(),
  entryConditionsJson: z.string().optional(),
  exitConditionsJson: z.string().optional(),
  audioCueId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  location: LocationSchema.optional(),
  audioCue: AudioCueSchema.optional(),
  connections: z.array(SceneConnectionSchema),
  encounters: z.array(EncounterSchema),
})

export type Scene = z.infer<typeof SceneSchema>

export const CreateSceneSchema = z.object({
  campaignId: z.string().min(1),
  locationId: z.string().optional(),
  name: z.string().min(1),
  sceneType: z.string().min(1),
  status: z.string().min(1),
  intensity: z.string().optional(),
  entryConditionsJson: z.string().optional(),
  exitConditionsJson: z.string().optional(),
  audioCueId: z.string().optional(),
})

export type CreateScene = z.infer<typeof CreateSceneSchema>

export const UpdateSceneSchema = z.object({
  locationId: z.string().optional(),
  name: z.string().min(1).optional(),
  sceneType: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
  intensity: z.string().optional(),
  entryConditionsJson: z.string().optional(),
  exitConditionsJson: z.string().optional(),
  audioCueId: z.string().optional(),
})

export type UpdateScene = z.infer<typeof UpdateSceneSchema>
