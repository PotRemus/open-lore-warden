import { campaignFlagDbRepository, CampaignFlagDto } from '@/db/repositories/campaign-flag.db.repository'
import { campaignDbRepository as CampaignDbRepo, CampaignDto } from '@/db/repositories/campaign.db.repository'
import { sceneRepository } from '@/repositories/scene.repository'
import type { Campaign, CampaignFlag, CreateCampaign, SetCampaignFlag, UpdateCampaign } from '@open-lore-warden/domain'

function toCampaign(campaign: CampaignDto): Campaign {
  return {
    id: campaign.id,
    name: campaign.name,
    system: campaign.system,
    setting: campaign.setting ?? undefined,
    createdAt: campaign.created_at,
    updatedAt: campaign.updated_at,
    currentScene: campaign.current_scene_id
      ? sceneRepository.findById(campaign.current_scene_id)
      : undefined,
  }
}

function toCampaignFlag(dto: CampaignFlagDto): CampaignFlag {
  const result: CampaignFlag = {
    id: dto.id,
    campaignId: dto.campaign_id,
    scopeType: dto.scope_type,
    scopeId: dto.scope_id ?? undefined,
    key: dto.key,
    value: dto.value ?? undefined,
    valueType: dto.value_type,
    updatedAt: dto.updated_at,
  }
  return result
}

export const campaignRepository = {
  create(input: CreateCampaign): Campaign {
    return toCampaign(CampaignDbRepo.create(input))
  },

  findById(id: string): Campaign | undefined {
    const campaign = CampaignDbRepo.findById(id)
    if (!campaign) return undefined
    return toCampaign(campaign)
  },

  findAll(): Campaign[] {
    return CampaignDbRepo.findAll().map(toCampaign)
  },

  update(id: string, input: UpdateCampaign): Campaign | undefined {
    const campaign = CampaignDbRepo.update(id, input)
    if (!campaign) return undefined
    return toCampaign(campaign)
  },

  delete(id: string): boolean {
    return CampaignDbRepo.delete(id)
  },

  setFlag(input: SetCampaignFlag): CampaignFlag {
    const flag = campaignFlagDbRepository.set({
      campaignId: input.campaignId,
      key: input.key,
      value: input.value,
      valueType: 'string',
      scopeType: input.scopeType,
      scopeId: input.scopeId,
    })
    
    return toCampaignFlag(flag)
  },
}
