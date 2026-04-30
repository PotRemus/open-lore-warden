<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import {
  fetchGameSystems,
  fetchImports,
  importScenarioPdf,
} from '@/api/scenario-import-api-client'
import type { ImportSummary, PublicGameSystemDescriptor } from '@/api/scenario-import-api-client'
import { useImportStore } from '@/stores/import.store'
import ImportUploadForm from '@/components/import/ImportUploadForm.vue'
import ImportHistoryList from '@/components/import/ImportHistoryList.vue'
import ImportProcessingPipeline from '@/components/import/ImportProcessingPipeline.vue'
import { useModelStore } from '@/stores/model.store'
import TitlePage from '@/components/layouts/TitlePage.vue'
import { useRouter } from 'vue-router'

const router = useRouter()
// ─── Store (état persisté entre navigations) ──────────────────────────────────

const importStore = useImportStore()
const modelStore = useModelStore()
const { pageState, currentJob, errorMessage } =
  storeToRefs(importStore)

// ─── État local (non persisté) ────────────────────────────────────────────────

const gameSystems = ref<PublicGameSystemDescriptor[]>([])
const imports = ref<ImportSummary[]>([])
const importsLoading = ref(false)
const loadingImportId = ref<string | null>(null)

// ─── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(async () => {
  // Charge toujours les données de contexte
  importsLoading.value = true
  const [systemsResult, importsResult] = await Promise.allSettled([
    fetchGameSystems(),
    fetchImports(),
  ])
  if (systemsResult.status === 'fulfilled') gameSystems.value = systemsResult.value
  if (importsResult.status === 'fulfilled') imports.value = importsResult.value
  importsLoading.value = false

  // // Reprise selon l'état persisté dans le store
  // if (pageState.value === 'uploading') {
  //   // L'upload HTTP était en vol au moment de la navigation — il est perdu
  //   importStore.reset()
  // }
})

// ─── Upload & polling job ─────────────────────────────────────────────────────

async function onUploadSubmit(payload: { file: File; gameSystemId: string }) {
  pageState.value = 'uploading'
  errorMessage.value = ''
  try {
    pageState.value = 'processing'
    await modelStore.startModel('text')
    const { jobId } = await importScenarioPdf(payload.file, payload.gameSystemId)
    // currentJobId.value = jobId
    importStore.startJobImport(jobId)
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Erreur lors de l\'upload.'
    pageState.value = 'error'
  }
}

async function onOpenImport(importId: string) {
  router.push({ name: 'import-result', params: { campaignId: importId } })
}

// ─── Réinitialisation ─────────────────────────────────────────────────────────

function onReset() {
  // stopJobPolling()
  importStore.reset()

  // Rafraîchit la liste pour inclure l'import éventuellement terminé
  importsLoading.value = true
  fetchImports()
    .then((list) => { imports.value = list })
    .catch(() => { /* non-bloquant */ })
    .finally(() => { importsLoading.value = false })
}
</script>

<template>
  <div class="import-page relative z-10 h-full w-full flex flex-col custom-scrollbar overflow-y-auto p-10 gap-2">
    <!-- En-tête de page -->
    <TitlePage 
      title="Import Artifacts"
      category="Campaign Logistics"
      description="Weave external lore, character sheets, and scenario metadata into the living record of your campaign. The Archive accepts .PDF and .JSON formats for automated ingestion."
    />
    <div class="grid grid-cols-12 gap-8">
       <!-- Étape 1 : formulaire upload (idle + uploading) -->
      <template v-if="pageState === 'idle' || pageState === 'uploading'">
        <div class="col-span-12 xl:col-span-8 space-y-8">
          <ImportHistoryList
                :imports="imports"
                :loading="importsLoading"
                :loading-import-id="loadingImportId"
                @open="onOpenImport"
              />
          
        </div>
        <div class="col-span-12 xl:col-span-4 space-y-6">
          <ImportUploadForm
            :game-systems="gameSystems"
            :loading="pageState === 'uploading'"
            @submit="onUploadSubmit"
          />
        </div>
      </template>

      <!-- Étape 2 : traitement en cours -->
      <div v-else-if="pageState === 'processing'" class="col-span-12 xl:col-span-8 space-y-8">
        <ImportProcessingPipeline :job="currentJob" />
      </div>

      <!-- État d'erreur -->
      <div v-else-if="pageState === 'error'" class="col-span-12 xl:col-span-8 space-y-8">
        <div class="error-card">
          <span class="material-symbols-outlined error-icon">error</span>
          <div class="error-content">
            <p class="error-title">L'import a échoué</p>
            <p class="error-message">{{ errorMessage }}</p>
          </div>
          <button class="btn-retry" @click="onReset">
            <span class="material-symbols-outlined">refresh</span>
            Réessayer
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* .import-page {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding: 2rem;
  height: 100%;
  width: 100%;
  overflow-y: auto;
} */

/* Conteneurs d'étapes */
.step-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/*.step-container--result {
  max-width: 900px;
}*/

/* Barre d'outils résultat */
.result-toolbar {
  display: flex;
  justify-content: flex-start;
}

.btn-new-import {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  background: transparent;
  color: var(--color-on-surface);
  border: 1px solid var(--color-outline-variant);
  border-radius: var(--radius-xl);
  font-family: var(--font-label);
  font-size: 0.8125rem;
  cursor: pointer;
  opacity: 0.7;
  transition:
    opacity 0.15s,
    border-color 0.15s;
}

.btn-new-import:hover {
  opacity: 1;
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.btn-new-import .material-symbols-outlined {
  font-size: 1.125rem;
}

/* Carte d'erreur */
.error-card {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  background: color-mix(in srgb, var(--color-error) 8%, var(--color-surface-container));
  border: 1px solid color-mix(in srgb, var(--color-error) 35%, transparent);
  border-radius: var(--radius-xl);
  max-width: 560px;
}

.error-icon {
  font-size: 1.75rem;
  color: var(--color-error);
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.error-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.error-title {
  font-family: var(--font-body);
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-on-surface);
  margin: 0;
}

.error-message {
  font-family: var(--font-body);
  font-size: 0.875rem;
  color: var(--color-on-surface);
  opacity: 0.7;
  margin: 0;
}

.btn-retry {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  flex-shrink: 0;
  padding: 0.5rem 1rem;
  background: var(--color-error-container);
  color: var(--color-on-error-container);
  border: none;
  border-radius: var(--radius-xl);
  font-family: var(--font-label);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  align-self: center;
}

.btn-retry:hover {
  opacity: 0.9;
}

.btn-retry .material-symbols-outlined {
  font-size: 1.125rem;
}
</style>
