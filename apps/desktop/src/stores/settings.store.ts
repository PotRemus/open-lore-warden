import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AppSettings {
  sidecarHost: string
  sidecarPort: number
  llmHost: string
  llmPort: number
  sdHost: string
  sdPort: number
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useSettingsStore = defineStore('settings', () => {
  const sidecarHost = ref('127.0.0.1')
  const sidecarPort = ref(3000)
  const llmHost = ref('127.0.0.1')
  const llmPort = ref(8080)
  const sdHost = ref('127.0.0.1')
  const sdPort = ref(8081)

  /** URL de base du sidecar, recalculée réactivement. */
  const sidecarBaseUrl = computed(() => `http://${sidecarHost.value}:${sidecarPort.value}`)

  /**
   * Charge les settings depuis le backend Tauri et hydrate le store.
   * En mode dev Vite (sans Tauri), conserve silencieusement les valeurs par défaut.
   */
  async function init(): Promise<void> {
    try {
      const loaded = await invoke<AppSettings>('get_settings')
      sidecarHost.value = loaded.sidecarHost
      sidecarPort.value = loaded.sidecarPort
      llmHost.value = loaded.llmHost
      llmPort.value = loaded.llmPort
      sdHost.value = loaded.sdHost
      sdPort.value = loaded.sdPort
    } catch {
      // Contexte non-Tauri (dev Vite seul) — on garde les défauts.
    }
  }

  /** Persiste les settings via la commande Tauri `save_settings` et met à jour le store. */
  async function saveSettings(s: AppSettings): Promise<void> {
    await invoke('save_settings', { settings: s })
    sidecarHost.value = s.sidecarHost
    sidecarPort.value = s.sidecarPort
    llmHost.value = s.llmHost
    llmPort.value = s.llmPort
    sdHost.value = s.sdHost
    sdPort.value = s.sdPort
  }

  /** Redémarre l'application via la commande Tauri `restart_app`. */
  async function restartApp(): Promise<void> {
    await invoke('restart_app')
  }

  return {
    sidecarHost,
    sidecarPort,
    llmHost,
    llmPort,
    sdHost,
    sdPort,
    sidecarBaseUrl,
    init,
    saveSettings,
    restartApp,
  }
})

// ── Helper standalone pour les API clients ────────────────────────────────────

/** URL de base du sidecar, lisible en dehors des composants Vue. */
export function getSidecarBaseUrl(): string {
  return useSettingsStore().sidecarBaseUrl
}
