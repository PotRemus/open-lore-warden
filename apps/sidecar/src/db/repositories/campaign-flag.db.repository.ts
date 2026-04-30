import { randomUUID } from 'node:crypto'
import { campaignFlagStatements } from '@/db/statements/campaign-flag.statements'
import { SetCampaignFlag } from '@open-lore-warden/domain'

export interface CampaignFlagDto {
  id: string
  campaign_id: string
  scope_type: string
  scope_id: string | null
  key: string
  value: string | null
  value_type: string
  updated_at: string
}

export const campaignFlagDbRepository = {
  set(input: SetCampaignFlag): CampaignFlagDto {
    const now = new Date().toISOString()
    const dto: CampaignFlagDto = {
      id: randomUUID(),
      campaign_id: input.campaignId,
      scope_type: input.scopeType ?? 'campaign',
      scope_id: input.scopeId ?? null,
      key: input.key,
      value: input.value ?? null,
      value_type: input.valueType ?? 'string',
      updated_at: now,
    }
    campaignFlagStatements.upsert.run(
      dto.id, dto.campaign_id, dto.scope_type, dto.scope_id,
      dto.key, dto.value, dto.value_type, dto.updated_at,
    )
    return dto
  },

  findById(id: string): CampaignFlagDto | undefined {
    const row = campaignFlagStatements.findById.get(id)
    if (!row) return undefined
    return row as unknown as CampaignFlagDto
  },

  findByCampaignId(campaignId: string): CampaignFlagDto[] {
    return campaignFlagStatements.findByCampaignId.all(campaignId).map(
      (row) => row as unknown as CampaignFlagDto,
    )
  },

  findByKey(campaignId: string, scopeType: string, scopeId: string | null, key: string): CampaignFlagDto | undefined {
    const row = campaignFlagStatements.findByKey.get(campaignId, scopeType, scopeId, key)
    if (!row) return undefined
    return row as unknown as CampaignFlagDto
  },

  delete(id: string): boolean {
    const result = campaignFlagStatements.deleteById.run(id)
    return (result as { changes: number }).changes > 0
  },
}
