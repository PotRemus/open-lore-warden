import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'

export type SdStatus =
  | { type: 'idle' }
  | { type: 'downloading'; downloaded: number; total: number }
  | { type: 'extracting' }
  | { type: 'downloadingModel'; downloaded: number; total: number }
  | { type: 'starting' }
  | { type: 'ready' }
  | { type: 'stopped' }
  | { type: 'error'; message: string }

export interface SdLora {
  filename: string
  strength: number
}

export interface SdConfig {
  width: number
  height: number
  sampling: string
  steps: number
  loras: SdLora[]
  gpu: boolean
}

const SD_STATUS_EVENT = 'sd-status'

export async function getSdStatus(): Promise<SdStatus> {
  return invoke<SdStatus>('get_sd_status')
}

export async function getSdConfig(): Promise<SdConfig | null> {
  return invoke<SdConfig | null>('get_sd_config')
}

export async function startSdServer(): Promise<void> {
  return invoke<void>('start_sd_server')
}

export async function stopSdServer(): Promise<void> {
  return invoke<void>('stop_sd_server')
}

export function onSdStatus(cb: (status: SdStatus) => void): Promise<UnlistenFn> {
  return listen<SdStatus>(SD_STATUS_EVENT, (event) => cb(event.payload))
}

export function downloadPercent(status: Extract<SdStatus, { type: 'downloading' }>): number {
  if (status.total === 0) return 0
  return Math.round((status.downloaded / status.total) * 100)
}

export function downloadModelPercent(status: Extract<SdStatus, { type: 'downloadingModel' }>): number {
  if (status.total === 0) return 0
  return Math.round((status.downloaded / status.total) * 100)
}
