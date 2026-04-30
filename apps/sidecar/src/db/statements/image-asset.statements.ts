import { db } from '@/db/database'

export const imageAssetStatements = {
  get insert() {
    return db.prepare(
      `INSERT INTO image_assets (id, campaign_id, asset_type, entity_type, entity_id, title, file_path, mime_type, width, height, prompt_text, source_type, metadata_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
  },
  get findById() {
    return db.prepare('SELECT * FROM image_assets WHERE id = ?')
  },
  get findByCampaignId() {
    return db.prepare('SELECT * FROM image_assets WHERE campaign_id = ? ORDER BY created_at DESC')
  },
  get findByEntity() {
    return db.prepare('SELECT * FROM image_assets WHERE campaign_id = ? AND entity_type = ? AND entity_id = ? ORDER BY created_at DESC')
  },
  get update() {
    return db.prepare(
      `UPDATE image_assets
       SET asset_type = ?, entity_type = ?, entity_id = ?, title = ?, file_path = ?, mime_type = ?, width = ?, height = ?, prompt_text = ?, source_type = ?, metadata_json = ?, updated_at = ?
       WHERE id = ?`,
    )
  },
  get deleteById() {
    return db.prepare('DELETE FROM image_assets WHERE id = ?')
  },
}
