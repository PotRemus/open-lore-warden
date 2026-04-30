import { db } from '@/db/database'

export const voiceProfileStatements = {
  get insert() {
    return db.prepare(
      `INSERT INTO voice_profiles (id, campaign_id, name, provider, voice_key, language, gender_hint, style_hint, speed, pitch, sample_path, is_default, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
  },
  get findById() {
    return db.prepare('SELECT * FROM voice_profiles WHERE id = ?')
  },
  get findByCampaignId() {
    return db.prepare('SELECT * FROM voice_profiles WHERE campaign_id = ? ORDER BY name ASC')
  },
  get findGlobal() {
    return db.prepare('SELECT * FROM voice_profiles WHERE campaign_id IS NULL ORDER BY name ASC')
  },
  get update() {
    return db.prepare(
      `UPDATE voice_profiles
       SET name = ?, provider = ?, voice_key = ?, language = ?, gender_hint = ?, style_hint = ?, speed = ?, pitch = ?, sample_path = ?, is_default = ?, updated_at = ?
       WHERE id = ?`,
    )
  },
  get deleteById() {
    return db.prepare('DELETE FROM voice_profiles WHERE id = ?')
  },
}
