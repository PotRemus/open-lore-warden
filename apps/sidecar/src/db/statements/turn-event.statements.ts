import { db } from '@/db/database'

export const turnEventStatements = {
  get insert() {
    return db.prepare(
      `INSERT INTO turn_events (id, turn_id, campaign_id, scene_id, event_type, actor_type, actor_id, target_type, target_id, payload_json, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
  },
  get findById() {
    return db.prepare('SELECT * FROM turn_events WHERE id = ?')
  },
  get findByTurnId() {
    return db.prepare('SELECT * FROM turn_events WHERE turn_id = ? ORDER BY sort_order ASC')
  },
  get findByCampaignId() {
    return db.prepare('SELECT * FROM turn_events WHERE campaign_id = ? ORDER BY created_at DESC')
  },
  get deleteById() {
    return db.prepare('DELETE FROM turn_events WHERE id = ?')
  },
}
