import { randomUUID } from 'node:crypto'
import { itemStatements } from '@/db/statements/item.statements'
import { CreateItem, UpdateItem } from '@open-lore-warden/domain'

export interface ItemDto {
  id: string
  campaign_id: string
  name: string
  item_type: string
  rarity: string | null
  stackable: number
  equippable: number
  weight: number | null
  value_amount: number | null
  value_currency: string | null
  description: string | null
  effects_json: string | null
  image_asset_id: string | null
  created_at: string
  updated_at: string
}

export const itemDbRepository = {
  create(input: CreateItem): ItemDto {
    const now = new Date().toISOString()
    const dto: ItemDto = {
      id: randomUUID(),
      campaign_id: input.campaignId,
      name: input.name,
      item_type: input.itemType,
      rarity: input.rarity ?? null,
      stackable: input.stackable ? 1 : 0,
      equippable: input.equippable ? 1 : 0,
      weight: input.weight ?? null,
      value_amount: input.valueAmount ?? null,
      value_currency: input.valueCurrency ?? null,
      description: input.description ?? null,
      effects_json: input.effectsJson ?? null,
      image_asset_id: input.imageAssetId ?? null,
      created_at: now,
      updated_at: now,
    }
    itemStatements.insert.run(
      dto.id, dto.campaign_id, dto.name, dto.item_type, dto.rarity,
      dto.stackable, dto.equippable, dto.weight, dto.value_amount,
      dto.value_currency, dto.description, dto.effects_json,
      dto.image_asset_id, dto.created_at, dto.updated_at,
    )
    return dto
  },

  findById(id: string): ItemDto | undefined {
    const row = itemStatements.findById.get(id)
    if (!row) return undefined
    return row as unknown as ItemDto
  },

  findByCampaignId(campaignId: string): ItemDto[] {
    return itemStatements.findByCampaignId.all(campaignId).map(
      (row) => row as unknown as ItemDto,
    )
  },

  update(id: string, input: UpdateItem): ItemDto | undefined {
    const existing = itemDbRepository.findById(id)
    if (!existing) return undefined
    const dto: ItemDto = {
      ...existing,
      name: input.name ?? existing.name,
      item_type: input.itemType ?? existing.item_type,
      rarity: input.rarity !== undefined ? input.rarity : existing.rarity,
      stackable: input.stackable !== undefined ? Number(input.stackable) : existing.stackable,
      equippable: input.equippable !== undefined ? Number(input.equippable) : existing.equippable,
      weight: input.weight !== undefined ? input.weight : existing.weight,
      value_amount: input.valueAmount !== undefined ? input.valueAmount : existing.value_amount,
      value_currency: input.valueCurrency !== undefined ? input.valueCurrency : existing.value_currency,
      description: input.description !== undefined ? input.description : existing.description,
      effects_json: input.effectsJson !== undefined ? input.effectsJson : existing.effects_json,
      image_asset_id: input.imageAssetId !== undefined ? input.imageAssetId : existing.image_asset_id,
      updated_at: new Date().toISOString(),
    }
    itemStatements.update.run(
      dto.name, dto.item_type, dto.rarity, dto.stackable, dto.equippable,
      dto.weight, dto.value_amount, dto.value_currency, dto.description,
      dto.effects_json, dto.image_asset_id, dto.updated_at, dto.id,
    )
    return dto
  },

  delete(id: string): boolean {
    const result = itemStatements.deleteById.run(id)
    return (result as { changes: number }).changes > 0
  },
}
