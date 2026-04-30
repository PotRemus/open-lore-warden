import { db } from '@/db/database'

export const memoryStatements = {
  get insert() {
    return db.prepare(
      `INSERT INTO memories (id, campaign_id, entity_type, entity_id, memory_type, content, importance, source_turn_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
  },
  get findById() {
    return db.prepare('SELECT * FROM memories WHERE id = ?')
  },
  get findByCampaignId() {
    return db.prepare('SELECT * FROM memories WHERE campaign_id = ? ORDER BY created_at DESC')
  },
  get findByCampaignAndEntity() {
    return db.prepare('SELECT * FROM memories WHERE campaign_id = ? AND entity_type = ? AND entity_id = ? ORDER BY importance DESC, created_at DESC')
  },
  get deleteById() {
    return db.prepare('DELETE FROM memories WHERE id = ?')
  },
}
