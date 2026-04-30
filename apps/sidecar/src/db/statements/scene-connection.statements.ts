import { db } from '@/db/database'

export const sceneConnectionStatements = {
  get insert() {
    return db.prepare(
      `INSERT INTO scene_connections (id, campaign_id, from_scene_id, to_scene_id, connection_type, label, is_bidirectional, conditions_json, priority, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
  },
  get findById() {
    return db.prepare('SELECT * FROM scene_connections WHERE id = ?')
  },
  get findByCampaignId() {
    return db.prepare('SELECT * FROM scene_connections WHERE campaign_id = ? ORDER BY priority ASC')
  },
  get findByFromSceneId() {
    return db.prepare('SELECT * FROM scene_connections WHERE from_scene_id = ? ORDER BY priority ASC')
  },
  get deleteById() {
    return db.prepare('DELETE FROM scene_connections WHERE id = ?')
  },
}
