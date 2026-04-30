import { db } from '@/db/database'

export const inventoryItemStatements = {
  get insert() {
    return db.prepare(
      `INSERT INTO inventory_items (id, campaign_id, item_id, owner_type, owner_id, quantity, is_equipped, slot, condition_text, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
  },
  get findById() {
    return db.prepare('SELECT * FROM inventory_items WHERE id = ?')
  },
  get findByCampaignId() {
    return db.prepare('SELECT * FROM inventory_items WHERE campaign_id = ? ORDER BY created_at DESC')
  },
  get findByOwner() {
    return db.prepare('SELECT * FROM inventory_items WHERE owner_type = ? AND owner_id = ? ORDER BY created_at ASC')
  },
  get update() {
    return db.prepare(
      `UPDATE inventory_items
       SET quantity = ?, is_equipped = ?, slot = ?, condition_text = ?, notes = ?, updated_at = ?
       WHERE id = ?`,
    )
  },
  get deleteById() {
    return db.prepare('DELETE FROM inventory_items WHERE id = ?')
  },
}
