import { characterDbRepository, CharacterDto } from '@/db/repositories/character.db.repository'
import { inventoryItemDbRepository, InventoryItemDto } from '@/db/repositories/inventory-item.db.repository'
import { itemDbRepository, ItemDto } from '@/db/repositories/item.db.repository'
import type { Character, CreateCharacter, Item, OwnedItem, UpdateCharacter } from '@open-lore-warden/domain'

function toCharacter(dto: CharacterDto): Character {
  const inventoryItems = inventoryItemDbRepository.findByOwner('character', dto.id)
  return {
    id: dto.id,
    campaignId: dto.campaign_id,
    name: dto.name,
    role: dto.role,
    statsJson: dto.stats_json,
    statusJson: dto.status_json ?? undefined,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    inventory: inventoryItems.flatMap((inv) => {
      const item = itemDbRepository.findById(inv.item_id)
      if (!item) return []
      return [toInventoryItem(inv, item)]
    }),
  }
}

function toInventoryItem(inventoryItemDto: InventoryItemDto, itemDto: ItemDto): OwnedItem {
  const result: OwnedItem = {
    id: inventoryItemDto.id,
    campaignId: inventoryItemDto.campaign_id,
    itemId: inventoryItemDto.item_id,
    isEquipped: inventoryItemDto.is_equipped ? true : false,
    ownerId: inventoryItemDto.owner_id,
    ownerType: inventoryItemDto.owner_type,
    quantity: inventoryItemDto.quantity,
    slot: inventoryItemDto.slot ?? undefined,
    conditionText: inventoryItemDto.condition_text ?? undefined,
    notes: inventoryItemDto.notes ?? undefined,
    createdAt: inventoryItemDto.created_at,
    updatedAt: inventoryItemDto.updated_at,
    item: toItem(itemDto),
  }
  return result
}

function toItem(dto: ItemDto): Item {
  const result: Item = {
    id: dto.id,
    campaignId: dto.campaign_id,
    name: dto.name,
    itemType: dto.item_type,
    rarity: dto.rarity ?? undefined,
    stackable: dto.stackable ? true : false,
    equippable: dto.equippable ? true : false,
    weight: dto.weight ?? undefined,
    valueAmount: dto.value_amount ?? undefined,
    valueCurrency: dto.value_currency ?? undefined,
    description: dto.description ?? undefined,
    effectsJson: dto.effects_json ?? undefined,
    imageAssetId: dto.image_asset_id ?? undefined,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  }
  return result
}

export const characterRepository = {
  create(input: CreateCharacter): Character {
    return toCharacter(characterDbRepository.create(input))
  },

  findById(id: string): Character | undefined {
    const dto = characterDbRepository.findById(id)
    if (!dto) return undefined
    return toCharacter(dto)
  },

  findByCampaignId(campaignId: string): Character[] {
    return characterDbRepository.findByCampaignId(campaignId).map(toCharacter)
  },

  update(id: string, input: UpdateCharacter): Character | undefined {
    const dto = characterDbRepository.update(id, input)
    if (!dto) return undefined
    return toCharacter(dto)
  },

  delete(id: string): boolean {
    return characterDbRepository.delete(id)
  },
}
