<script setup lang="ts">
import { CampaignImportResult, fetchEntityImageGenJob, fetchImportResult, fetchScenarioRegenerationJob, fetchScenarioRegenerationJobResult, startEntityImageGeneration, startScenarioRegeneration } from '@/api/scenario-import-api-client';
import { ImageGenState, ScenarioRegenerationState } from '@/components/import/types';
import { useModelStore } from '@/stores/model.store';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import TitlePage from '@/components/layouts/TitlePage.vue'
import ImportResultView from '@/components/import/ImportResultView.vue'

const route = useRoute()
const router = useRouter()
const campaignId = route.params.campaignId as string
const importResult = ref<CampaignImportResult | null>(null)
const imageGenStates = ref<Record<string, ImageGenState>>({})
const scenarioRegenStates = ref<Record<string, ScenarioRegenerationState>>({})
const modelStore = useModelStore()
const imagePollingTimers = new Map<string, ReturnType<typeof setInterval>>()
const scenarioRegenPollingTimers = new Map<string, ReturnType<typeof setInterval>>()

const regenerationLocked = computed(() =>
  Object.values(scenarioRegenStates.value).some((state) => state.status === 'generating'),
)

async function onGenerateImage(itemId: string) {
  if (!importResult.value?.importId) return
  await modelStore.startModel('image')
  await generateImage(itemId)
  await modelStore.stopModel('image')
}

async function onGenerateAllImages() {
  if (!importResult.value?.importId) return
  await modelStore.startModel('image')
  for (const scenario of importResult.value.scenarios) {
    for (const loc of scenario.locations) {
      if (!loc.imagePath) await generateImage(loc.id)
    }
    for (const npc of scenario.npcs) {
      if (!npc.imagePath) await generateImage(npc.id)
    }
  }
  await modelStore.stopModel('image')
}

async function generateImage(itemId: string) {
  if (!importResult.value?.importId) return
  const current = imageGenStates.value[itemId]
  if (current?.status === 'generating') return

  imageGenStates.value = {
    ...imageGenStates.value,
    [itemId]: { status: 'generating' },
  }

  try {
    const { genJobId } = await startEntityImageGeneration(importResult.value.importId, itemId)
    imageGenStates.value = {
      ...imageGenStates.value,
      [itemId]: { status: 'generating', genJobId },
    }
    await startImagePolling(itemId, genJobId)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur de génération.'
    imageGenStates.value = {
      ...imageGenStates.value,
      [itemId]: { status: 'error', error: msg },
    }
  }
}

function startImagePolling(itemId: string, genJobId: string) {
  const existing = imagePollingTimers.get(itemId)
  if (existing) clearInterval(existing)
  return new Promise<void>((resolve, reject) => {
    const timer = setInterval(async () => {
      if (!importResult.value?.importId) return
      try {
        const genJob = await fetchEntityImageGenJob(importResult.value.importId, genJobId)
        if (genJob.status === 'done') {
          clearInterval(timer)
          imagePollingTimers.delete(itemId)
          imageGenStates.value = {
            ...imageGenStates.value,
            [itemId]: { status: 'done', genJobId, cacheBust: Date.now().toString() },
          }
          // Recharge le résultat pour récupérer les imagePath mis à jour
          if (importResult.value?.importId) await loadResult(importResult.value.importId)
          resolve()
        } else if (genJob.status === 'error') {
          clearInterval(timer)
          imagePollingTimers.delete(itemId)
          imageGenStates.value = {
            ...imageGenStates.value,
            [itemId]: {
              status: 'error',
              genJobId,
              error: genJob.error ?? 'Erreur de génération.',
            },
          }
          reject(new Error(genJob.error ?? 'Erreur de génération.'))
        }
      } catch {
      // Silently retry on next tick
      }
    }, 2000)
    imagePollingTimers.set(itemId, timer)
  })
}

async function onRegenerateScenario(scenarioId: string) {
  if (!importResult.value?.importId) return

  if (scenarioRegenStates.value[scenarioId]?.status === 'generating') return

  if (regenerationLocked.value) {
    scenarioRegenStates.value = {
      ...scenarioRegenStates.value,
      [scenarioId]: {
        status: 'error',
        error: 'Une régénération est déjà en cours pour cet import.',
      },
    }
    return
  }

  scenarioRegenStates.value = {
    ...scenarioRegenStates.value,
    [scenarioId]: {
      status: 'generating',
      jobStatus: 'pending',
      progress: { current: 0, total: 3 },
    },
  }
  await modelStore.startModel('text')

  try {
    const { jobId } = await startScenarioRegeneration(importResult.value.importId, scenarioId)
    scenarioRegenStates.value = {
      ...scenarioRegenStates.value,
      [scenarioId]: {
        status: 'generating',
        jobId,
        jobStatus: 'pending',
        progress: { current: 0, total: 3 },
      },
    }

    startScenarioRegenerationPolling(scenarioId, jobId)
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Erreur lors de la relance de génération du scénario.'
    scenarioRegenStates.value = {
      ...scenarioRegenStates.value,
      [scenarioId]: { status: 'error', error: message },
    }
  }
}

function startScenarioRegenerationPolling(scenarioId: string, jobId: string) {
  if (!importResult.value?.importId) return
  clearScenarioRegenerationPolling(scenarioId)

  const timer = setInterval(async () => {
    try {
      const job = await fetchScenarioRegenerationJob(jobId)

      if (job.status === 'done') {
        try {
          const updatedResult = await fetchScenarioRegenerationJobResult(jobId)
          importResult.value = updatedResult

          // Les IDs d'entités du scénario régénéré changent potentiellement
          imageGenStates.value = {}

          scenarioRegenStates.value = {
            ...scenarioRegenStates.value,
            [scenarioId]: { status: 'idle' },
          }

          clearScenarioRegenerationPolling(scenarioId)
          await modelStore.stopModel('text')
        } catch {
          // Silently retry on next tick
        }
        // await startSdServer().catch(() => {})
        return
      }

      if (job.status === 'error') {
        clearScenarioRegenerationPolling(scenarioId)
        scenarioRegenStates.value = {
          ...scenarioRegenStates.value,
          [scenarioId]: {
            status: 'error',
            jobId,
            jobStatus: 'error',
            progress: job.progress,
            error: job.error ?? 'Erreur lors de la relance de génération du scénario.',
          },
        }
        await modelStore.stopModel('text')
        return
      }

      scenarioRegenStates.value = {
        ...scenarioRegenStates.value,
        [scenarioId]: {
          status: 'generating',
          jobId,
          jobStatus: job.status,
          progress: job.progress,
        },
      }
    } catch {
      // Silently retry on next tick
    }
  }, 2000)

  scenarioRegenPollingTimers.set(scenarioId, timer)
}

function clearScenarioRegenerationPolling(scenarioId: string): void {
  const timer = scenarioRegenPollingTimers.get(scenarioId)
  if (!timer) return

  clearInterval(timer)
  scenarioRegenPollingTimers.delete(scenarioId)
}

async function loadResult(campaignId: string) {
  importResult.value = await fetchImportResult(campaignId)
}

if (!campaignId) {
  router.push({
    name: 'import',
  })
}

onMounted(async () => {
  await loadResult(campaignId)
})

onUnmounted(async () => {
  await modelStore.stopModel()
})

</script>

<template>
    <div class="import-detail-page relative z-10 h-full w-full flex flex-col custom-scrollbar overflow-y-auto p-10 gap-2">
        <!-- En-tête de page -->
        <TitlePage 
        title="Import Artifacts"
        category="Campaign Logistics"
        description="Weave external lore, character sheets, and scenario metadata into the living record of your campaign. The Archive accepts .PDF and .JSON formats for automated ingestion."
        />
        <div class="grid grid-cols-12 gap-8">
            <div class="col-span-12">
                <div class="flex">
                    <RouterLink
                      class="px-3 py-1 archive-gradient text-on-primary font-bold rounded-lg flex items-center gap-3 hover:shadow-[0_0_20px_rgba(148,204,255,0.4)] transition-all"
                      :to="{ name: 'import' }">
                        <span class="material-symbols-outlined">chevron_backward</span>
                        Retour
                    </RouterLink>
                </div>

                <!-- <ImportSdStatusBar /> -->

                <ImportResultView
                    v-if="importResult"
                    class="mt-5"
                    :result="importResult"
                    :image-gen-states="imageGenStates"
                    :scenario-regen-states="scenarioRegenStates"
                    :regeneration-locked="regenerationLocked"
                    @generate-image="onGenerateImage"
                    @generate-all-images="onGenerateAllImages"
                    @regenerate-scenario="onRegenerateScenario"
                />
            </div>
        </div>
    </div>
</template>
