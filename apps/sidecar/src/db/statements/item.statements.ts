import { db } from '@/db/database'

export const itemStatements = {
  get insert() {
    return db.prepare(
      `INSERT INTO items (id, campaign_id, name, item_type, rarity, stackable, equippable, weight, value_amount, value_currency, description, effects_json, image_asset_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
  },
  get findById() {
    return db.prepare('SELECT * FROM items WHERE id = ?')
  },
  get findByCampaignId() {
    return db.prepare('SELECT * FROM items WHERE campaign_id = ? ORDER BY name ASC')
  },
  get update() {
    return db.prepare(
      `UPDATE items
       SET name = ?, item_type = ?, rarity = ?, stackable = ?, equippable = ?, weight = ?, value_amount = ?, value_currency = ?, description = ?, effects_json = ?, image_asset_id = ?, updated_at = ?
       WHERE id = ?`,
    )
  },
  get deleteById() {
    return db.prepare('DELETE FROM items WHERE id = ?')
  },
}
