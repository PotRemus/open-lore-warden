<script setup lang="ts">
import { onMounted, onUnmounted, ref, useTemplateRef } from 'vue';
import { useI18n } from 'vue-i18n'
import { getLlmStatus, LlmStatus, onLlmStatus } from '@/api/llm-api-client';
import {
  getSdStatus,
  onSdStatus,
  startSdServer,
  stopSdServer,
  downloadPercent,
  downloadModelPercent,
  type SdStatus,
} from '@/api/sd-api-client';
import { pollUntilReady, type SidecarStatus } from '@/api/health-api-client';
import {
  fetchGameSystems,
  importScenarioPdf,
  fetchImportJob,
  type PublicGameSystemDescriptor,
  type ImportJobStatus,
  type ImportJobProgress,
} from '@/api/scenario-import-api-client';
import { UnlistenFn } from '@tauri-apps/api/event';
import SystemStatusCard from '@/components/tests/SystemStatusCard.vue'
import LlmStatusCard from '@/components/tests/LlmStatusCard.vue'
import CampaignList from '@/components/tests/CampaignList.vue'

const { t } = useI18n()

type BootState = 'loading' | 'connected' | 'failed'

const bootState = ref<BootState>('loading')
const sidecarStatus = ref<SidecarStatus | null>(null)

const llmStatus = ref<LlmStatus>({ type: 'idle' })
let unlistenLlm: UnlistenFn | null = null

const sdStatus = ref<SdStatus>({ type: 'idle' })
let unlistenSd: UnlistenFn | null = null

// TEST: démarrage manuel sd-server
const sdManualMode = ref(false)

async function toggleSdServer() {
  if (sdStatus.value.type === 'idle' || sdStatus.value.type === 'stopped') {
    sdManualMode.value = true
    await startSdServer()
  } else {
    await stopSdServer()
    sdManualMode.value = false
  }
}
    
/** True while the LLM is doing something that deserves a prominent overlay. */
const llmIsActive = (s: LlmStatus) =>
  s.type === 'downloading' || s.type === 'extracting'

async function boot() {
  bootState.value = 'loading'

  // Start listening to LLM events before anything else
  llmStatus.value = await getLlmStatus()
  unlistenLlm = await onLlmStatus((s) => { llmStatus.value = s })

  // Start listening to SD events
  sdStatus.value = await getSdStatus()
  unlistenSd = await onSdStatus((s) => { sdStatus.value = s })

  // Wait for the Node.js sidecar
  const status = await pollUntilReady()
  sidecarStatus.value = status
  bootState.value = status.connected ? 'connected' : 'failed'

  if (status.connected) {
    await loadGameSystems()
  }
}

onMounted(boot)
onUnmounted(() => {
  unlistenLlm?.()
  unlistenSd?.()
  stopSdServer()
  stopPolling()
})

// ── Scenario import ───────────────────────────────────────────────────────────
type ImportState = 'idle' | 'uploading' | 'polling' | 'done' | 'error'

const gameSystems = ref<PublicGameSystemDescriptor[]>([])
const selectedSystemId = ref<string>('')
const importState = ref<ImportState>('idle')
const importError = ref<string | null>(null)
const jobStatus = ref<ImportJobStatus | null>(null)
const jobProgress = ref<ImportJobProgress | null>(null)
const inputScenarioPdf = useTemplateRef('inputScenarioPdf')

// Ref import job courant
const currentImportJobId = ref<string | null>(null)

let pollInterval: ReturnType<typeof setInterval> | null = null

async function loadGameSystems() {
  try {
    gameSystems.value = await fetchGameSystems()
    if (gameSystems.value.length > 0) {
      selectedSystemId.value = gameSystems.value[0].id
    }
  } catch {
    // non-bloquant : la liste restera vide
  }
}

function stopPolling() {
  if (pollInterval !== null) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

/**
 * Démarre le polling du job d'import.
 * Passe à l'état 'done' quand le job est terminé.
 */

async function onScenarioPdfSelected() {
  const file = inputScenarioPdf.value?.files?.[0]
  if (!file || !selectedSystemId.value) return

  importState.value = 'uploading'
  importError.value = null
  jobStatus.value = null
  jobProgress.value = null
  currentImportJobId.value = null

  // Lance sd-server en arrière-plan (idempotent, fire-and-forget)
  startSdServer()

  let jobId: string
  try {
    const result = await importScenarioPdf(file, selectedSystemId.value)
    jobId = result.jobId
    currentImportJobId.value = jobId
  } catch (err) {
    importError.value = err instanceof Error ? err.message : t('pages.test.retry')
    importState.value = 'error'
    if (inputScenarioPdf.value) inputScenarioPdf.value.value = ''
    return
  }

  importState.value = 'polling'

  pollInterval = setInterval(async () => {
    try {
      const job = await fetchImportJob(jobId)
      jobStatus.value = job.status
      jobProgress.value = job.progress ?? null

      if (job.status === 'done') {
        stopPolling()
        importState.value = 'done'
        if (inputScenarioPdf.value) inputScenarioPdf.value.value = ''
      } else if (job.status === 'error') {
        stopPolling()
        stopSdServer()
        importError.value = job.error ?? t('pages.test.retry')
        importState.value = 'error'
        if (inputScenarioPdf.value) inputScenarioPdf.value.value = ''
      }
    } catch (err) {
      stopPolling()
      stopSdServer()
      importError.value = err instanceof Error ? err.message : t('pages.test.retry')
      importState.value = 'error'
    }
  }, 2000)
}

function resetImport() {
  stopPolling()
  stopSdServer()
  importState.value = 'idle'
  importError.value = null
  jobStatus.value = null
  jobProgress.value = null
  currentImportJobId.value = null
  if (inputScenarioPdf.value) inputScenarioPdf.value.value = ''
}
</script>

<template>
    <div class="container">

      <!-- ── LLM download overlay (shown on top of everything) ──────────────── -->
      <div v-if="llmIsActive(llmStatus)" class="llm-overlay">
        <div class="llm-overlay-card">
          <h2 class="llm-overlay-title">{{ t('pages.test.llmInit') }}</h2>
          <LlmStatusCard />
          <p class="llm-overlay-hint">{{ t('pages.test.llmInitHint') }}</p>
        </div>
      </div>

      <!-- ── Normal boot/app flow ───────────────────────────────────────────── -->
      <template v-if="bootState === 'loading'">
        <div class="boot-screen">
          <div class="spinner" />
          <p class="boot-label">{{ t('pages.test.boot') }}</p>
          <!-- Show LLM status inline during boot (non-overlay states) -->
          <LlmStatusCard v-if="!llmIsActive(llmStatus)" />
        </div>
      </template>

      <template v-else-if="bootState === 'failed'">
        <div class="diagnostic-screen">
          <div class="diagnostic-icon">⚠</div>
          <h2>{{ t('pages.test.backendUnavailable') }}</h2>
          <p>{{ t('pages.test.sidecarNotResponding') }} <code>{{ sidecarStatus?.url }}</code></p>
          <p class="error-detail">{{ sidecarStatus?.error }}</p>
          <ul class="diagnostic-hints">
            <li>{{ t('pages.test.hints.sidecarRunning') }}</li>
            <li>{{ t('pages.test.hints.portAvailable') }}</li>
            <li>{{ t('pages.test.hints.noFirewall') }}</li>
          </ul>
          <button @click="boot">{{ t('pages.test.retry') }}</button>
        </div>
      </template>

      <template v-else>
        <h1>{{ t('pages.test.title') }}</h1>
        <SystemStatusCard />
        <LlmStatusCard />
        <CampaignList />

        <!-- TEST: démarrage sd-server -->
        <section style="margin-top:1rem; display:flex; flex-direction:column; gap:0.5rem;">
          <button @click="toggleSdServer">
            {{ sdStatus.type === 'idle' || sdStatus.type === 'stopped' ? 'Démarrer sd-server' : 'Arrêter sd-server' }}
          </button>
          <div v-if="sdManualMode" class="sd-status">
            <template v-if="sdStatus.type === 'downloading'">
              <span class="spinner-sm" />
              <span>{{ t('sdStatus.downloading') }} — {{ downloadPercent(sdStatus) }}&nbsp;%</span>
            </template>
            <template v-else-if="sdStatus.type === 'extracting'">
              <span class="spinner-sm" />
              <span>{{ t('sdStatus.extracting') }}</span>
            </template>
            <template v-else-if="sdStatus.type === 'downloadingModel'">
              <span class="spinner-sm" />
              <span>{{ t('sdStatus.downloadingModel') }} — {{ downloadModelPercent(sdStatus) }}&nbsp;%</span>
            </template>
            <template v-else-if="sdStatus.type === 'starting'">
              <span class="spinner-sm" />
              <span>{{ t('sdStatus.starting') }}</span>
            </template>
            <template v-else-if="sdStatus.type === 'ready'">
              <span class="sd-status-dot sd-status-dot--ready" />
              <span>{{ t('sdStatus.ready') }}</span>
            </template>
            <template v-else-if="sdStatus.type === 'error'">
              <span class="sd-status-dot sd-status-dot--error" />
              <span>{{ t('sdStatus.error') }} — {{ sdStatus.message }}</span>
            </template>
          </div>
        </section>

        <!-- Scenario import -->
        <section class="scenario-import">
          <h2>{{ t('pages.test.importTitle') }}</h2>

          <label class="scenario-import-field">
            <span class="scenario-import-field-label">{{ t('pages.test.gameSystem') }}</span>
            <select
              v-model="selectedSystemId"
              :disabled="importState !== 'idle'"
              class="scenario-import-select"
            >
              <option value="" disabled>{{ t('pages.test.chooseSystem') }}</option>
              <option v-for="s in gameSystems" :key="s.id" :value="s.id">{{ s.id }}</option>
            </select>
          </label>

          <label class="scenario-import-field">
            <span class="scenario-import-field-label">{{ t('pages.test.pdfFile') }}</span>
            <input
              ref="inputScenarioPdf"
              type="file"
              accept=".pdf"
              :disabled="importState !== 'idle' || !selectedSystemId"
              class="scenario-import-file"
              @change="onScenarioPdfSelected"
            />
          </label>

          <div v-if="importState === 'uploading'" class="scenario-import-status">
            <span class="spinner-sm" /> {{ t('pages.test.uploading') }}
          </div>

          <div v-else-if="importState === 'polling'" class="scenario-import-status">
            <span class="spinner-sm" />
            <span>{{ t('pages.test.importing') }}</span>
            <span v-if="jobStatus" class="scenario-import-job-status">— {{ jobStatus }}</span>
            <span v-if="jobProgress" class="scenario-import-progress">{{ jobProgress.current }}/{{ jobProgress.total }}</span>
          </div>

          <p v-else-if="importState === 'done'" class="scenario-import-success">
            {{ t('pages.test.importSuccess') }}
            <button class="scenario-import-reset" @click="resetImport">{{ t('pages.test.newImport') }}</button>
          </p>

          <p v-else-if="importState === 'error'" class="scenario-import-error">
            ✗ {{ importError }}
            <button class="scenario-import-reset" @click="resetImport">{{ t('pages.test.retry') }}</button>
          </p>

          <!-- Indicateur statut SD (visible dès qu'un import est en cours) -->
          <div v-if="importState !== 'idle' && importState !== 'done'" class="sd-status">
            <template v-if="sdStatus.type === 'downloading'">
              <span class="spinner-sm" />
              <span>{{ t('sdStatus.downloading') }} — {{ downloadPercent(sdStatus) }}&nbsp;%</span>
            </template>
            <template v-else-if="sdStatus.type === 'extracting'">
              <span class="spinner-sm" />
              <span>{{ t('sdStatus.extracting') }}</span>
            </template>
            <template v-else-if="sdStatus.type === 'downloadingModel'">
              <span class="spinner-sm" />
              <span>{{ t('sdStatus.downloadingModel') }} — {{ downloadModelPercent(sdStatus) }}&nbsp;%</span>
            </template>
            <template v-else-if="sdStatus.type === 'starting'">
              <span class="spinner-sm" />
              <span>{{ t('sdStatus.starting') }}</span>
            </template>
            <template v-else-if="sdStatus.type === 'ready'">
              <span class="sd-status-dot sd-status-dot--ready" />
              <span>{{ t('sdStatus.ready') }}</span>
            </template>
            <template v-else-if="sdStatus.type === 'error'">
              <span class="sd-status-dot sd-status-dot--error" />
              <span>{{ t('sdStatus.error') }} — {{ sdStatus.message }}</span>
            </template>
          </div>
        </section>
      </template>

    </div>
</template>

<style scoped>
.container .boot-screen,
.container .diagnostic-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
}

.container .spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #e0e0e0;
  border-top-color: #396cd8;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.container .boot-label {
  color: #666;
  font-size: 0.95rem;
}

.container .diagnostic-icon {
  font-size: 2.5rem;
}

.scenario-import {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.scenario-import-field {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.scenario-import-field-label {
  min-width: 110px;
  font-size: 0.9rem;
  color: #444;
}

.scenario-import-select {
  padding: 0.25rem 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.9rem;
  min-width: 180px;
}

.scenario-import-select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.scenario-import-file {
  max-width: 260px;
  font-size: 0.9rem;
}

.scenario-import-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #555;
}

.scenario-import-job-status {
  color: #396cd8;
}

.scenario-import-progress {
  color: #888;
  font-size: 0.82rem;
}

.scenario-import-success {
  color: #2a9d2a;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0;
}

.scenario-import-error {
  color: #c0392b;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0;
}

.scenario-import-reset {
  font-size: 0.82rem;
  padding: 0.15rem 0.5rem;
  cursor: pointer;
}

.spinner-sm {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid #e0e0e0;
  border-top-color: #396cd8;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

.container .diagnostic-screen h2 {
  margin: 0;
  color: #c0392b;
}

.container .error-detail {
  color: #e74c3c;
  font-size: 0.85rem;
  font-family: monospace;
}

.container .diagnostic-hints {
  text-align: left;
  font-size: 0.85rem;
  color: #555;
  background: #f8f8f8;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 0.75rem 1.25rem;
}

/* ── LLM download/extraction overlay ────────────────────────────────────── */
.container .llm-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
}

.container .llm-overlay-card {
  background: #fff;
  border-radius: 12px;
  padding: 2rem 2.5rem;
  max-width: 480px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
}

.container .llm-overlay-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
}

.container .llm-overlay-hint {
  margin: 0;
  font-size: 0.82rem;
  color: #888;
  line-height: 1.5;
}

/* ── SD status indicator ─────────────────────────────────────────────────── */
.sd-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.82rem;
  color: #777;
  padding-top: 0.25rem;
  border-top: 1px solid #f0f0f0;
}

.sd-status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.sd-status-dot--ready {
  background: #2a9d2a;
}

.sd-status-dot--error {
  background: #c0392b;
}
</style>
