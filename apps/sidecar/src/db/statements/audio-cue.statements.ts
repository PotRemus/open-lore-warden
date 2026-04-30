import { db } from '@/db/database'

export const audioCueStatements = {
  get insert() {
    return db.prepare(
      `INSERT INTO audio_cues (id, campaign_id, name, cue_type, category, file_path, loop, default_volume, fade_in_ms, fade_out_ms, tags_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
  },
  get findById() {
    return db.prepare('SELECT * FROM audio_cues WHERE id = ?')
  },
  get findByCampaignId() {
    return db.prepare('SELECT * FROM audio_cues WHERE campaign_id = ? ORDER BY name ASC')
  },
  get findGlobal() {
    return db.prepare('SELECT * FROM audio_cues WHERE campaign_id IS NULL ORDER BY name ASC')
  },
  get update() {
    return db.prepare(
      `UPDATE audio_cues
       SET name = ?, cue_type = ?, category = ?, file_path = ?, loop = ?, default_volume = ?, fade_in_ms = ?, fade_out_ms = ?, tags_json = ?, updated_at = ?
       WHERE id = ?`,
    )
  },
  get deleteById() {
    return db.prepare('DELETE FROM audio_cues WHERE id = ?')
  },
}
