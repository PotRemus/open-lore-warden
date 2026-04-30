import { randomUUID } from 'node:crypto'
import { campaignStatements } from '@/db/statements/campaign.statements'
import { CreateCampaign, UpdateCampaign } from '@open-lore-warden/domain'

export interface CampaignDto {
    id: string,
    name: string,
    system: string,
    setting: string | null,
    current_scene_id: string | null,
    created_at: string,
    updated_at: string,
}

export const campaignDbRepository = {
  create(createCampaign: CreateCampaign): CampaignDto {
    const now = new Date().toISOString()
    const result: CampaignDto = {
      id: randomUUID(),
      name: createCampaign.name,
      system: createCampaign.system,
      setting: createCampaign.setting || null,
      current_scene_id: null,
      created_at: now,
      updated_at: now,
    }
    campaignStatements.insert.run(
      result.id,
      result.name,
      result.system,
      result.setting,
      result.current_scene_id,
      result.created_at,
      result.updated_at,
    )
    return result
  },

  findById(id: string): CampaignDto | undefined {
    const row = campaignStatements.findById.get(id)
    if (!row) return undefined
    const dto = row as unknown as CampaignDto
    return dto
  },

  findAll(): CampaignDto[] {
    return campaignStatements.findAll.all().map((row) => {
        const dto = row as unknown as CampaignDto
        return dto
    })
  },

  update(id: string, updateCampaign: UpdateCampaign): CampaignDto | undefined {
    const existing = campaignDbRepository.findById(id)
    if (!existing) return undefined

    const updated: CampaignDto = {
      ...existing,
      current_scene_id: updateCampaign.currentScene
        ? updateCampaign.currentScene.id
        : existing.current_scene_id,
      updated_at: new Date().toISOString(),
    }

    campaignStatements.update.run(
      updated.name,
      updated.system,
      updated.setting,
      updated.current_scene_id,
      updated.updated_at,
      updated.id,
    )

    return updated
  },

  delete(id: string): boolean {
    const result = campaignStatements.deleteById.run(id)
    return (result as { changes: number }).changes > 0
  },
}
