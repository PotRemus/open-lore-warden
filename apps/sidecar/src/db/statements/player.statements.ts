import { db } from '@/db/database'

export const playerStatements = {
  get insert() {
    return db.prepare(
      `INSERT INTO players (id, campaign_id, display_name, email, is_host, preferences_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
  },
  get findById() {
    return db.prepare('SELECT * FROM players WHERE id = ?')
  },
  get findByCampaignId() {
    return db.prepare('SELECT * FROM players WHERE campaign_id = ? ORDER BY display_name ASC')
  },
  get update() {
    return db.prepare(
      `UPDATE players
       SET display_name = ?, email = ?, is_host = ?, preferences_json = ?, updated_at = ?
       WHERE id = ?`,
    )
  },
  get deleteById() {
    return db.prepare('DELETE FROM players WHERE id = ?')
  },
}
