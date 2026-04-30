// Renames the pkg-built binary to the Tauri sidecar naming convention
// and moves it to src-tauri/binaries/.
// Run after `pnpm run build:binary`.

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ext = process.platform === 'win32' ? '.exe' : ''
const targetTriple = execSync('rustc --print host-tuple').toString().trim()

if (!targetTriple) {
  console.error('Failed to determine Rust target triple')
  process.exit(1)
}

const binariesDir = path.resolve(__dirname, '..', 'desktop', 'src-tauri', 'binaries')
fs.mkdirSync(binariesDir, { recursive: true })

const src = path.join(__dirname, `sidecar${ext}`)
const dest = path.join(binariesDir, `sidecar-${targetTriple}${ext}`)

fs.renameSync(src, dest)
console.log(`Binary moved: ${dest}`)
