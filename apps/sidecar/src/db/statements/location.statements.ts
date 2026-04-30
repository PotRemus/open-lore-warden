import { db } from '@/db/database'

export const locationStatements = {
  get insert() {
    return db.prepare(
      `INSERT INTO locations (id, campaign_id, parent_location_id, name, type, description_public, description_gm, tags_json, danger_level, image_asset_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
  },
  get findById() {
    return db.prepare('SELECT * FROM locations WHERE id = ?')
  },
  get findByCampaignId() {
    return db.prepare('SELECT * FROM locations WHERE campaign_id = ? ORDER BY name ASC')
  },
  get update() {
    return db.prepare(
      `UPDATE locations
       SET parent_location_id = ?, name = ?, type = ?, description_public = ?, description_gm = ?, tags_json = ?, danger_level = ?, image_asset_id = ?, updated_at = ?
       WHERE id = ?`,
    )
  },
  get deleteById() {
    return db.prepare('DELETE FROM locations WHERE id = ?')
  },
}
