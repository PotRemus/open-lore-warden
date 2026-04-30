import { db } from '@/db/database'

export const factionStatements = {
  get insert() {
    return db.prepare(
      `INSERT INTO factions (id, campaign_id, name, type, description, reputation_score, goals_json, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
  },
  get findById() {
    return db.prepare('SELECT * FROM factions WHERE id = ?')
  },
  get findByCampaignId() {
    return db.prepare('SELECT * FROM factions WHERE campaign_id = ? ORDER BY name ASC')
  },
  get update() {
    return db.prepare(
      `UPDATE factions
       SET name = ?, type = ?, description = ?, reputation_score = ?, goals_json = ?, status = ?, updated_at = ?
       WHERE id = ?`,
    )
  },
  get deleteById() {
    return db.prepare('DELETE FROM factions WHERE id = ?')
  },
}
