import { db } from '@/db/database'

export const scenarioImportStatements = {
  get insert() {
    return db.prepare(
      `INSERT INTO scenario_imports (id, campaign_id, source_type, source_path, original_filename, status, detected_title, raw_text_path, normalized_json_path, validation_report_json, error_message, started_at, finished_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
  },
  get findById() {
    return db.prepare('SELECT * FROM scenario_imports WHERE id = ?')
  },
  get findByCampaignId() {
    return db.prepare('SELECT * FROM scenario_imports WHERE campaign_id = ? ORDER BY created_at DESC')
  },
  get update() {
    return db.prepare(
      `UPDATE scenario_imports
       SET status = ?, detected_title = ?, raw_text_path = ?, normalized_json_path = ?, validation_report_json = ?, error_message = ?, finished_at = ?, updated_at = ?
       WHERE id = ?`,
    )
  },
  get deleteById() {
    return db.prepare('DELETE FROM scenario_imports WHERE id = ?')
  },
}
