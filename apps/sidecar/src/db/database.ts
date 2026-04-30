import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { config } from '@/config/index'

mkdirSync(config.DATA_DIR, { recursive: true })

const dbPath = path.join(config.DATA_DIR, 'mj.db')

export const db = new DatabaseSync(dbPath)
