import { db } from '@/db/database'

export const characterStatements = {
  get insert() {
    return db.prepare(
      `INSERT INTO characters (id, campaign_id, name, role, stats_json, status_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
  },
  get findById() {
    return db.prepare('SELECT * FROM characters WHERE id = ?')
  },
  get findByCampaignId() {
    return db.prepare('SELECT * FROM characters WHERE campaign_id = ? ORDER BY name ASC')
  },
  get update() {
    return db.prepare(
      `UPDATE characters
       SET name = ?, role = ?, stats_json = ?, status_json = ?, updated_at = ?
       WHERE id = ?`,
    )
  },
  get deleteById() {
    return db.prepare('DELETE FROM characters WHERE id = ?')
  },
}
