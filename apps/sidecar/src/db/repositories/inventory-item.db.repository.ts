import { randomUUID } from 'node:crypto'
import { inventoryItemStatements } from '@/db/statements/inventory-item.statements'
import { CreateInventoryItem, UpdateInventoryItem } from '@open-lore-warden/domain'

export interface InventoryItemDto {
  id: string
  campaign_id: string
  item_id: string
  owner_type: string
  owner_id: string
  quantity: number
  is_equipped: number
  slot: string | null
  condition_text: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export const inventoryItemDbRepository = {
  create(input: CreateInventoryItem): InventoryItemDto {
    const now = new Date().toISOString()
    const dto: InventoryItemDto = {
      id: randomUUID(),
      campaign_id: input.campaignId,
      item_id: input.itemId,
      owner_type: input.ownerType,
      owner_id: input.ownerId,
      quantity: input.quantity ?? 1,
      is_equipped: input.isEquipped ? 1 : 0,
      slot: input.slot ?? null,
      condition_text: input.conditionText ?? null,
      notes: input.notes ?? null,
      created_at: now,
      updated_at: now,
    }
    inventoryItemStatements.insert.run(
      dto.id, dto.campaign_id, dto.item_id, dto.owner_type, dto.owner_id,
      dto.quantity, dto.is_equipped, dto.slot, dto.condition_text,
      dto.notes, dto.created_at, dto.updated_at,
    )
    return dto
  },

  findById(id: string): InventoryItemDto | undefined {
    const row = inventoryItemStatements.findById.get(id)
    if (!row) return undefined
    return row as unknown as InventoryItemDto
  },

  findByCampaignId(campaignId: string): InventoryItemDto[] {
    return inventoryItemStatements.findByCampaignId.all(campaignId).map(
      (row) => row as unknown as InventoryItemDto,
    )
  },

  findByOwner(ownerType: string, ownerId: string): InventoryItemDto[] {
    return inventoryItemStatements.findByOwner.all(ownerType, ownerId).map(
      (row) => row as unknown as InventoryItemDto,
    )
  },

  update(id: string, input: UpdateInventoryItem): InventoryItemDto | undefined {
    const existing = inventoryItemDbRepository.findById(id)
    if (!existing) return undefined
    const dto: InventoryItemDto = {
      ...existing,
      quantity: input.quantity ?? existing.quantity,
      is_equipped: input.isEquipped !== undefined ? (input.isEquipped ? 1 : 0) : existing.is_equipped,
      slot: input.slot !== undefined ? input.slot : existing.slot,
      condition_text: input.conditionText !== undefined ? input.conditionText : existing.condition_text,
      notes: input.notes !== undefined ? input.notes : existing.notes,
      updated_at: new Date().toISOString(),
    }
    inventoryItemStatements.update.run(
      dto.quantity, dto.is_equipped, dto.slot, dto.condition_text,
      dto.notes, dto.updated_at, dto.id,
    )
    return dto
  },

  delete(id: string): boolean {
    const result = inventoryItemStatements.deleteById.run(id)
    return (result as { changes: number }).changes > 0
  },
}
