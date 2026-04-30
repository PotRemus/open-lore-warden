import { db } from '@/db/database'

export const questStatements = {
  get insert() {
    return db.prepare(
      `INSERT INTO quests (id, campaign_id, parent_quest_id, title, category, status, summary, description, giver_npc_id, target_location_id, requirements_json, rewards_json, progress_json, started_at, completed_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
  },
  get findById() {
    return db.prepare('SELECT * FROM quests WHERE id = ?')
  },
  get findByCampaignId() {
    return db.prepare('SELECT * FROM quests WHERE campaign_id = ? ORDER BY created_at DESC')
  },
  get update() {
    return db.prepare(
      `UPDATE quests
       SET parent_quest_id = ?, title = ?, category = ?, status = ?, summary = ?, description = ?, giver_npc_id = ?, target_location_id = ?, requirements_json = ?, rewards_json = ?, progress_json = ?, started_at = ?, completed_at = ?, updated_at = ?
       WHERE id = ?`,
    )
  },
  get deleteById() {
    return db.prepare('DELETE FROM quests WHERE id = ?')
  },
}
