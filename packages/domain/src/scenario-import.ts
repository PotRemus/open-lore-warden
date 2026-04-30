import { z } from 'zod'

export const ScenarioImportSchema = z.object({
  id: z.string().min(1),
  campaignId: z.string().optional(),
  sourceType: z.string().min(1),
  sourcePath: z.string().min(1),
  originalFilename: z.string().optional(),
  status: z.string().min(1),
  detectedTitle: z.string().optional(),
  rawTextPath: z.string().optional(),
  normalizedJsonPath: z.string().optional(),
  validationReportJson: z.string().optional(),
  errorMessage: z.string().optional(),
  startedAt: z.string(),
  finishedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type ScenarioImport = z.infer<typeof ScenarioImportSchema>

export const CreateScenarioImportSchema = z.object({
  campaignId: z.string().optional(),
  sourceType: z.string().min(1),
  sourcePath: z.string().min(1),
  originalFilename: z.string().optional(),
  status: z.string().min(1).optional(),
})

export type CreateScenarioImport = z.infer<typeof CreateScenarioImportSchema>

export const UpdateScenarioImportSchema = z.object({
  status: z.string().min(1).optional(),
  detectedTitle: z.string().optional(),
  rawTextPath: z.string().optional(),
  normalizedJsonPath: z.string().optional(),
  validationReportJson: z.string().optional(),
  errorMessage: z.string().optional(),
  finishedAt: z.string().optional(),
})

export type UpdateScenarioImport = z.infer<typeof UpdateScenarioImportSchema>
