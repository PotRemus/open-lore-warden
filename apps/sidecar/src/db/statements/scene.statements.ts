import { db } from '@/db/database'

export const sceneStatements = {
  get insert() {
    return db.prepare(
      `INSERT INTO scenes (id, campaign_id, location_id, name, scene_type, status, intensity, entry_conditions_json, exit_conditions_json, audio_cue_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
  },
  get findById() {
    return db.prepare('SELECT * FROM scenes WHERE id = ?')
  },
  get findByCampaignId() {
    return db.prepare('SELECT * FROM scenes WHERE campaign_id = ? ORDER BY created_at DESC')
  },
  get update() {
    return db.prepare(
      `UPDATE scenes
       SET location_id = ?, name = ?, scene_type = ?, status = ?, intensity = ?, entry_conditions_json = ?, exit_conditions_json = ?, audio_cue_id = ?, updated_at = ?
       WHERE id = ?`,
    )
  },
  get deleteById() {
    return db.prepare('DELETE FROM scenes WHERE id = ?')
  },
}
