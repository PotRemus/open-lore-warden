import { ok, err, type Result } from '@open-lore-warden/shared'

export interface InventorySlot {
  itemId: string
  quantity: number
  maxStack?: number
}

/** Check whether a character has at least `required` of an item. */
export function hasItem(slots: InventorySlot[], itemId: string, required = 1): boolean {
  const slot = slots.find((s) => s.itemId === itemId)
  return (slot?.quantity ?? 0) >= required
}

/** Attempt to consume `quantity` of an item. Returns the updated slots. */
export function consumeItem(
  slots: InventorySlot[],
  itemId: string,
  quantity = 1,
): Result<InventorySlot[]> {
  const idx = slots.findIndex((s) => s.itemId === itemId)
  if (idx === -1) return err(`Item ${itemId} not in inventory`)
  const slot = slots[idx]!
  if (slot.quantity < quantity) {
    return err(`Not enough ${itemId}: have ${slot.quantity}, need ${quantity}`)
  }
  const updated = [...slots]
  const newQty = slot.quantity - quantity
  if (newQty === 0) {
    updated.splice(idx, 1)
  } else {
    updated[idx] = { ...slot, quantity: newQty }
  }
  return ok(updated)
}

/** Add an item to inventory. Respects optional maxStack. Returns updated slots. */
export function addItem(
  slots: InventorySlot[],
  itemId: string,
  quantity = 1,
  maxStack?: number,
): Result<InventorySlot[]> {
  if (quantity <= 0) return err('Quantity must be positive')
  const updated = [...slots]
  const idx = updated.findIndex((s) => s.itemId === itemId)
  if (idx === -1) {
    updated.push({ itemId, quantity, maxStack })
  } else {
    const slot = updated[idx]!
    const newQty = slot.quantity + quantity
    if (slot.maxStack !== undefined && newQty > slot.maxStack) {
      return err(`Stack limit reached for ${itemId}: max ${slot.maxStack}`)
    }
    updated[idx] = { ...slot, quantity: newQty }
  }
  return ok(updated)
}
