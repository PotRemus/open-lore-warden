import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchImportJob, type ImportJob } from '@/api/scenario-import-api-client'
import { useModelStore } from './model.store'

// ── Types ──────────────────────────────────────────────────────────────────────

export type ImportPageState = 'idle' | 'uploading' | 'processing' | 'done' | 'error'

// ── Store ─────────────────────────────────────────────────────────────────────

export const useImportStore = defineStore('import', () => {
  const modelStore = useModelStore()
  const pageState = ref<ImportPageState>('idle')
  const currentJobId = ref<string | null>(null)
  const currentJob = ref<ImportJob | null>(null)
  const errorMessage = ref('')
  let jobPollingTimer: ReturnType<typeof setInterval> | null = null

  /** Remet le store à l'état initial (bouton "Retour" ou "Réessayer"). */
  function reset() {
    pageState.value = 'idle'
    currentJobId.value = null
    currentJob.value = null
    errorMessage.value = ''
    stopJobPolling()
  }

  function startJobImport(jobId: string) {
    currentJobId.value = jobId
    startJobPolling(jobId)
  }

  function startJobPolling(jobId: string) {
    stopJobPolling()
    jobPollingTimer = setInterval(async () => {
    try {
      const job = await fetchImportJob(jobId)
      currentJob.value = job
      if (job.status === 'done') {
        stopJobPolling()
        pageState.value = 'done'
      } else if (job.status === 'error') {
        stopJobPolling()
        errorMessage.value = job.error ?? 'Erreur lors de l\'import.'
        pageState.value = 'error'
      }
    } catch (err) {
      stopJobPolling()
      errorMessage.value = err instanceof Error ? err.message : 'Erreur de connexion au sidecar.'
      pageState.value = 'error'
    }
  }, 2000)
}

async function stopJobPolling() {
  if (jobPollingTimer !== null) {
    clearInterval(jobPollingTimer)
    jobPollingTimer = null
    await modelStore.stopModel('text')
  }
}

  return {
    pageState,
    currentJobId,
    currentJob,
    errorMessage,
    reset,
    startJobImport,
  }
})
