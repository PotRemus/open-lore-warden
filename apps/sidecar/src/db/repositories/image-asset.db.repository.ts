import { randomUUID } from 'node:crypto'
import { imageAssetStatements } from '@/db/statements/image-asset.statements'
import { CreateImageAsset, UpdateImageAsset } from '@open-lore-warden/domain'

export interface ImageAssetDto {
  id: string
  campaign_id: string | null
  asset_type: string
  entity_type: string | null
  entity_id: string | null
  title: string | null
  file_path: string
  mime_type: string | null
  width: number | null
  height: number | null
  prompt_text: string | null
  source_type: string
  metadata_json: string | null
  created_at: string
  updated_at: string
}

// TODO repository : not use
export const imageAssetDbRepository = {
  create(input: CreateImageAsset): ImageAssetDto {
    const now = new Date().toISOString()
    const dto: ImageAssetDto = {
      id: randomUUID(),
      campaign_id: input.campaignId ?? null,
      asset_type: input.assetType,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      title: input.title ?? null,
      file_path: input.filePath,
      mime_type: input.mimeType ?? null,
      width: input.width ?? null,
      height: input.height ?? null,
      prompt_text: input.promptText ?? null,
      source_type: input.sourceType ?? 'generated',
      metadata_json: null,
      created_at: now,
      updated_at: now,
    }
    imageAssetStatements.insert.run(
      dto.id, dto.campaign_id, dto.asset_type, dto.entity_type, dto.entity_id,
      dto.title, dto.file_path, dto.mime_type, dto.width, dto.height,
      dto.prompt_text, dto.source_type, dto.metadata_json, dto.created_at, dto.updated_at,
    )
    return dto
  },

  findById(id: string): ImageAssetDto | undefined {
    const row = imageAssetStatements.findById.get(id)
    if (!row) return undefined
    return row as unknown as ImageAssetDto
  },

  findByCampaignId(campaignId: string): ImageAssetDto[] {
    return imageAssetStatements.findByCampaignId.all(campaignId).map(
      (row) => row as unknown as ImageAssetDto,
    )
  },

  findByEntity(campaignId: string, entityType: string, entityId: string): ImageAssetDto[] {
    return imageAssetStatements.findByEntity.all(campaignId, entityType, entityId).map(
      (row) => row as unknown as ImageAssetDto,
    )
  },

  update(id: string, input: UpdateImageAsset): ImageAssetDto | undefined {
    const existing = imageAssetDbRepository.findById(id)
    if (!existing) return undefined
    const dto: ImageAssetDto = {
      ...existing,
      asset_type: input.assetType ?? existing.asset_type,
      entity_type: input.entityType !== undefined ? input.entityType : existing.entity_type,
      entity_id: input.entityId !== undefined ? input.entityId : existing.entity_id,
      title: input.title !== undefined ? input.title : existing.title,
      file_path: input.filePath ?? existing.file_path,
      mime_type: input.mimeType !== undefined ? input.mimeType : existing.mime_type,
      width: input.width !== undefined ? input.width : existing.width,
      height: input.height !== undefined ? input.height : existing.height,
      prompt_text: input.promptText !== undefined ? input.promptText : existing.prompt_text,
      source_type: input.sourceType ?? existing.source_type,
      metadata_json: input.metadataJson !== undefined ? input.metadataJson : existing.metadata_json,
      updated_at: new Date().toISOString(),
    }
    imageAssetStatements.update.run(
      dto.asset_type, dto.entity_type, dto.entity_id, dto.title, dto.file_path,
      dto.mime_type, dto.width, dto.height, dto.prompt_text, dto.source_type,
      dto.metadata_json, dto.updated_at, dto.id,
    )
    return dto
  },

  delete(id: string): boolean {
    const result = imageAssetStatements.deleteById.run(id)
    return (result as { changes: number }).changes > 0
  },
}
