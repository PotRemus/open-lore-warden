import { z } from 'zod'

export const EncounterSchema = z.object({
  id: z.string().min(1),
  campaignId: z.string().min(1),
  sceneId: z.string().min(1),
  name: z.string().min(1),
  encounterType: z.string().min(1),
  status: z.string().min(1),
  difficulty: z.string().optional(),
  summary: z.string().optional(),
  setupJson: z.string().optional(),
  resolutionJson: z.string().optional(),
  startedAt: z.string().optional(),
  endedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Encounter = z.infer<typeof EncounterSchema>

export const CreateEncounterSchema = z.object({
  campaignId: z.string().min(1),
  sceneId: z.string().min(1),
  name: z.string().min(1),
  encounterType: z.string().min(1),
  status: z.string().min(1).optional(),
  difficulty: z.string().optional(),
  summary: z.string().optional(),
  setupJson: z.string().optional(),
})

export type CreateEncounter = z.infer<typeof CreateEncounterSchema>

export const UpdateEncounterSchema = z.object({
  name: z.string().min(1).optional(),
  encounterType: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
  difficulty: z.string().optional(),
  summary: z.string().optional(),
  setupJson: z.string().optional(),
  resolutionJson: z.string().optional(),
  startedAt: z.string().optional(),
  endedAt: z.string().optional(),
})

export type UpdateEncounter = z.infer<typeof UpdateEncounterSchema>
