import { db } from '@/db/database'

export const campaignFlagStatements = {
  get insert() {
    return db.prepare(
      `INSERT INTO campaign_flags (id, campaign_id, scope_type, scope_id, key, value, value_type, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
  },
  get upsert() {
    return db.prepare(
      `INSERT INTO campaign_flags (id, campaign_id, scope_type, scope_id, key, value, value_type, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (campaign_id, scope_type, scope_id, key)
       DO UPDATE SET value = excluded.value, value_type = excluded.value_type, updated_at = excluded.updated_at`,
    )
  },
  get findById() {
    return db.prepare('SELECT * FROM campaign_flags WHERE id = ?')
  },
  get findByCampaignId() {
    return db.prepare('SELECT * FROM campaign_flags WHERE campaign_id = ? ORDER BY scope_type ASC, key ASC')
  },
  get findByKey() {
    return db.prepare('SELECT * FROM campaign_flags WHERE campaign_id = ? AND scope_type = ? AND scope_id IS ? AND key = ?')
  },
  get deleteById() {
    return db.prepare('DELETE FROM campaign_flags WHERE id = ?')
  },
}
