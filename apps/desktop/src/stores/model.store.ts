import { getLlmStatus, onLlmStatus, startLlmServer, stopLlmServer } from '@/api/llm-api-client';
import { getSdStatus, onSdStatus, startSdServer, stopSdServer } from '@/api/sd-api-client';
import { defineStore } from 'pinia'
import { computed, ref } from 'vue';
import type { UnlistenFn } from '@tauri-apps/api/event'

// ── Types ──────────────────────────────────────────────────────────────────────

export type ModelStatus =
  | { type: 'idle' }
  | { type: 'downloading'; downloaded: number; total: number }
  | { type: 'extracting' }
  | { type: 'downloadingModel'; downloaded: number; total: number }
  | { type: 'starting' }
  | { type: 'ready' }
  | { type: 'stopped' }
  | { type: 'error'; message: string }

export type ModelType = 'image' | 'text' | ''
// ── Store ─────────────────────────────────────────────────────────────────────
let sdListen: UnlistenFn | undefined = undefined
let llmListen: UnlistenFn | undefined = undefined

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export const useModelStore = defineStore('model', () => {

  const modelStatus = ref<ModelStatus>({ type: 'idle' })
  const modelType = ref<ModelType>('')

  async function onListenModel() {
    if (!sdListen) {
      sdListen = await onSdStatus((status) => {
        if (modelType.value == 'image') {
          modelStatus.value = status
          if (status.type === 'error') {
            startReject?.(new Error(status.message))
            startReject = undefined
            startResolve = undefined
          } else if (status.type === 'ready') {
            startResolve?.(true)
            startResolve = undefined
            startReject = undefined
          }
        }
      })
    }

    if (!llmListen) {
      llmListen = await onLlmStatus((status) => {
        if (modelType.value == 'text') {
          modelStatus.value = status
          if (status.type === 'error') {
            startReject?.(new Error(status.message))
            startReject = undefined
            startResolve = undefined
          } else if (status.type === 'ready') {
            startResolve?.(true)
            startResolve = undefined
            startReject = undefined
          }
        }
      })
    }
  }

  function unListenModel() {
    sdListen?.()
    llmListen?.()
  }

  const downloaded = computed(() => {
    let result = 0;
    if (modelStatus.value.type === 'downloading' || modelStatus.value.type === 'downloadingModel') {
      result = modelStatus.value.downloaded
    }
    return result
  })

  const totalDownloaded = computed(() => {
    let result = 0;
    if (modelStatus.value.type === 'downloading' || modelStatus.value.type === 'downloadingModel') {
      result = modelStatus.value.total
    }
    return result
  })

  const downloadPercent = computed(() => {
    let result = 0;
    if (modelStatus.value.type === 'downloading' || modelStatus.value.type === 'downloadingModel') {
      result = Math.round((downloaded.value / totalDownloaded.value) * 100)
    }
    return result
  })

  const downloadBytes = computed(() => {
    const result = formatBytes(downloaded.value);
    return result
  })

  const totalDownloadBytes = computed(() => {
    const result = formatBytes(totalDownloaded.value);
    return result
  })

  async function startModel(type: ModelType) {
    if (modelType.value != type) {
      if (modelType.value == 'text') {
        await stopLlmServer()
      } else if (modelType.value == 'image') {
        await stopSdServer()
      }
      modelStatus.value = { type: 'idle' }
      if (type === 'text') {
        modelStatus.value = await getLlmStatus();
      } else if (type === 'image') {
        modelStatus.value = await getSdStatus();
      }
      modelType.value = type
      if (type && modelStatus.value.type != 'ready') {
        await startModelSync(type)
      }
    }
  }

  let startResolve: ((value: boolean) => void) | undefined = undefined
  let startReject: ((reason?: unknown) => void) | undefined = undefined
  async function startModelSync(type: ModelType) {
    if (startReject) {
      startReject(new Error('Démarrage annulé'))
      startReject = undefined
      startResolve = undefined
    }
    if (modelStatus.value.type == 'idle'
      || modelStatus.value.type == 'error'
      || modelStatus.value.type == 'stopped') {
      return new Promise<boolean>((resolve, reject) => {
        startResolve = resolve
        startReject = reject
        if (type === 'text') {
          startLlmServer()
        } else if (type === 'image') {
          startSdServer()
        }
      })
    }
  }

  async function stopModel(type?: ModelType) {
    if (!type && modelType.value) {
      if (modelType.value === 'text') {
        await stopLlmServer()
      } else if (modelType.value === 'image') {
        await stopSdServer()
      }
    } else if (type && modelType.value == type) {
      if (type === 'text') {
        await stopLlmServer()
      } else if (type === 'image') {
        await stopSdServer()
      }
    }
    modelType.value = ''
  }
  return {
    modelStatus,
    modelType,
    onListenModel,
    unListenModel,
    downloadPercent,
    downloadBytes,
    totalDownloadBytes,
    stopModel,
    startModel,
  }
})
