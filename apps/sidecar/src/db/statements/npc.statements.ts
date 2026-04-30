import { db } from '@/db/database'

export const npcStatements = {
  get insert() {
    return db.prepare(
      `INSERT INTO npcs (id, campaign_id, name, faction_id, location_id, voice_profile_id, summary, disposition, secret_notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
  },
  get findById() {
    return db.prepare('SELECT * FROM npcs WHERE id = ?')
  },
  get findByCampaignId() {
    return db.prepare('SELECT * FROM npcs WHERE campaign_id = ? ORDER BY name ASC')
  },
  get update() {
    return db.prepare(
      `UPDATE npcs
       SET name = ?, faction_id = ?, location_id = ?, voice_profile_id = ?, summary = ?, disposition = ?, secret_notes = ?, updated_at = ?
       WHERE id = ?`,
    )
  },
  get deleteById() {
    return db.prepare('DELETE FROM npcs WHERE id = ?')
  },
}
