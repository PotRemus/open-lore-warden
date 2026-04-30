import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'

export type LlmStatus =
  | { type: 'idle' }
  | { type: 'downloading'; downloaded: number; total: number }
  | { type: 'extracting' }
  | { type: 'starting' }
  | { type: 'ready' }
  | { type: 'error'; message: string }

const LLM_STATUS_EVENT = 'llm-status'

export async function getLlmStatus(): Promise<LlmStatus> {
  return invoke<LlmStatus>('get_llm_status')
}

export async function startLlmServer(): Promise<void> {
  return invoke<void>('start_llm_server')
}

export async function stopLlmServer(): Promise<void> {
  return invoke<void>('stop_llm_server')
}

export function onLlmStatus(cb: (status: LlmStatus) => void): Promise<UnlistenFn> {
  return listen<LlmStatus>(LLM_STATUS_EVENT, (event) => cb(event.payload))
}

export function downloadPercent(status: Extract<LlmStatus, { type: 'downloading' }>): number {
  if (status.total === 0) return 0
  return Math.round((status.downloaded / status.total) * 100)
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}
