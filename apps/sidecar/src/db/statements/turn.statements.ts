import { db } from '@/db/database'

export const turnStatements = {
  get insert() {
    return db.prepare(
      `INSERT INTO turns (id, campaign_id, scene_id, player_input, intent_json, rules_result_json, narration_text, media_plan_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
  },
  get findById() {
    return db.prepare('SELECT * FROM turns WHERE id = ?')
  },
  get findByCampaignId() {
    return db.prepare('SELECT * FROM turns WHERE campaign_id = ? ORDER BY created_at DESC')
  },
  get findBySceneId() {
    return db.prepare('SELECT * FROM turns WHERE scene_id = ? ORDER BY created_at ASC')
  },
  get deleteById() {
    return db.prepare('DELETE FROM turns WHERE id = ?')
  },
}
