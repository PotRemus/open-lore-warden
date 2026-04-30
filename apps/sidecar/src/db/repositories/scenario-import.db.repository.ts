import { randomUUID } from 'node:crypto'
import { scenarioImportStatements } from '@/db/statements/scenario-import.statements'
import { CreateScenarioImport, UpdateScenarioImport } from '@open-lore-warden/domain'

export interface ScenarioImportDto {
  id: string
  campaign_id: string | null
  source_type: string
  source_path: string
  original_filename: string | null
  status: string
  detected_title: string | null
  raw_text_path: string | null
  normalized_json_path: string | null
  validation_report_json: string | null
  error_message: string | null
  started_at: string
  finished_at: string | null
  created_at: string
  updated_at: string
}

// TODO repository : not use
export const scenarioImportDbRepository = {
  create(input: CreateScenarioImport): ScenarioImportDto {
    const now = new Date().toISOString()
    const dto: ScenarioImportDto = {
      id: randomUUID(),
      campaign_id: input.campaignId ?? null,
      source_type: input.sourceType,
      source_path: input.sourcePath,
      original_filename: input.originalFilename ?? null,
      status: input.status ?? 'pending',
      detected_title: null,
      raw_text_path: null,
      normalized_json_path: null,
      validation_report_json: null,
      error_message: null,
      started_at: now,
      finished_at: null,
      created_at: now,
      updated_at: now,
    }
    scenarioImportStatements.insert.run(
      dto.id, dto.campaign_id, dto.source_type, dto.source_path, dto.original_filename,
      dto.status, dto.detected_title, dto.raw_text_path, dto.normalized_json_path,
      dto.validation_report_json, dto.error_message, dto.started_at,
      dto.finished_at, dto.created_at, dto.updated_at,
    )
    return dto
  },

  findById(id: string): ScenarioImportDto | undefined {
    const row = scenarioImportStatements.findById.get(id)
    if (!row) return undefined
    return row as unknown as ScenarioImportDto
  },

  findByCampaignId(campaignId: string): ScenarioImportDto[] {
    return scenarioImportStatements.findByCampaignId.all(campaignId).map(
      (row) => row as unknown as ScenarioImportDto,
    )
  },

  update(id: string, input: UpdateScenarioImport): ScenarioImportDto | undefined {
    const existing = scenarioImportDbRepository.findById(id)
    if (!existing) return undefined
    const dto: ScenarioImportDto = {
      ...existing,
      status: input.status ?? existing.status,
      detected_title: input.detectedTitle !== undefined ? input.detectedTitle : existing.detected_title,
      raw_text_path: input.rawTextPath !== undefined ? input.rawTextPath : existing.raw_text_path,
      normalized_json_path: input.normalizedJsonPath !== undefined ? input.normalizedJsonPath : existing.normalized_json_path,
      validation_report_json: input.validationReportJson !== undefined ? input.validationReportJson : existing.validation_report_json,
      error_message: input.errorMessage !== undefined ? input.errorMessage : existing.error_message,
      finished_at: input.finishedAt !== undefined ? input.finishedAt : existing.finished_at,
      updated_at: new Date().toISOString(),
    }
    scenarioImportStatements.update.run(
      dto.status, dto.detected_title, dto.raw_text_path, dto.normalized_json_path,
      dto.validation_report_json, dto.error_message, dto.finished_at,
      dto.updated_at, dto.id,
    )
    return dto
  },

  delete(id: string): boolean {
    const result = scenarioImportStatements.deleteById.run(id)
    return (result as { changes: number }).changes > 0
  },
}
