import { db } from '@/db/database'

export const encounterStatements = {
  get insert() {
    return db.prepare(
      `INSERT INTO encounters (id, campaign_id, scene_id, name, encounter_type, status, difficulty, summary, setup_json, resolution_json, started_at, ended_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
  },
  get findById() {
    return db.prepare('SELECT * FROM encounters WHERE id = ?')
  },
  get findByCampaignId() {
    return db.prepare('SELECT * FROM encounters WHERE campaign_id = ? ORDER BY created_at DESC')
  },
  get findBySceneId() {
    return db.prepare('SELECT * FROM encounters WHERE scene_id = ? ORDER BY created_at ASC')
  },
  get update() {
    return db.prepare(
      `UPDATE encounters
       SET name = ?, encounter_type = ?, status = ?, difficulty = ?, summary = ?, setup_json = ?, resolution_json = ?, started_at = ?, ended_at = ?, updated_at = ?
       WHERE id = ?`,
    )
  },
  get deleteById() {
    return db.prepare('DELETE FROM encounters WHERE id = ?')
  },
}
