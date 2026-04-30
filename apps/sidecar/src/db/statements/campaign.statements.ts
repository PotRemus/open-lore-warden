import { db } from '@/db/database'

export const campaignStatements = {
  get insert() {
    return db.prepare(
      `INSERT INTO campaigns (id, name, system, setting, current_scene_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
  },
  get findById() {
    return db.prepare('SELECT * FROM campaigns WHERE id = ?')
  },
  get findAll() {
    return db.prepare('SELECT * FROM campaigns ORDER BY created_at DESC')
  },
  get update() {
    return db.prepare(
      `UPDATE campaigns
       SET name = ?, system = ?, setting = ?, current_scene_id = ?, updated_at = ?
       WHERE id = ?`,
    )
  },
  get deleteById() {
    return db.prepare('DELETE FROM campaigns WHERE id = ?')
  },
}
