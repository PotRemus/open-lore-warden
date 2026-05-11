<script setup lang="ts">
import { computed } from 'vue'
import type { ScenarioResult } from '@open-lore-warden/domain'
import type { ImageGenState, ScenarioRegenerationState } from './types'
import ImportEntityCard from './ImportEntityCard.vue'

const props = defineProps<{
  scenario: ScenarioResult
  scenarioIndex: number
  imageGenStates: Record<string, ImageGenState>
  scenarioRegenerationState?: ScenarioRegenerationState
  regenerationLocked: boolean
}>()

const emit = defineEmits<{
  generateImage: [itemId: string]
  regenerateScenario: [scenarioId: string]
}>()

const isRegenerating = computed(
  () => props.scenarioRegenerationState?.status === 'generating',
)

const isRegenerationBlocked = computed(
  () => props.regenerationLocked && !isRegenerating.value,
)

const isRegenerateButtonDisabled = computed(
  () => isRegenerating.value || isRegenerationBlocked.value,
)

const buttonLabel = computed(() => {
  if (isRegenerating.value) return 'Regénération…'
  if (isRegenerationBlocked.value) return 'Régénération en cours'
  return 'Relancer la génération'
})

const stepLabelByStatus: Record<NonNullable<ScenarioRegenerationState['jobStatus']>, string> = {
  pending: 'Initialisation',
  loading_artifacts: 'Chargement des artefacts',
  generating_scenario: 'Génération du scénario',
  writing_campaign: 'Mise à jour du fichier',
  done: 'Terminé',
  error: 'Erreur',
}

const currentStepLabel = computed(() => {
  const status = props.scenarioRegenerationState?.jobStatus
  return status ? stepLabelByStatus[status] : 'Initialisation'
})

const progressPercent = computed<number>(() => {
  const progress = props.scenarioRegenerationState?.progress
  if (!progress || progress.total <= 0) return 0
  return Math.round((progress.current / progress.total) * 100)
})

const regenerationError = computed(() =>
  props.scenarioRegenerationState?.status === 'error'
    ? props.scenarioRegenerationState.error
    : undefined,
)
</script>

<template>
  <section class="olw-import-scenario-card flex flex-col gap-6 p-6 bg-surface-container-low rounded-xl border border-outline-variant">
    <!-- En-tête scénario -->
    <header class="flex flex-col gap-2">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div class="flex items-center gap-3">
          <span class="font-label text-[0.6875rem] font-bold tracking-[0.08em] uppercase text-primary">
            Scénario {{ scenarioIndex + 1 }}
          </span>
          <span v-if="scenario.sourcePages.length > 0" class="font-label text-[0.6875rem] text-on-surface opacity-45">
            Pages {{ scenario.sourcePages[0] }}–{{ scenario.sourcePages[scenario.sourcePages.length - 1] }}
          </span>
        </div>
        <button
          class="inline-flex items-center gap-[0.375rem] px-3 py-[0.375rem] bg-transparent text-primary border border-[color-mix(in_srgb,var(--color-primary)_35%,transparent)] rounded-lg font-label text-xs font-semibold cursor-pointer transition-[background,border-color,opacity] duration-150 hover:bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] hover:border-primary disabled:opacity-60 disabled:cursor-not-allowed"
          :disabled="isRegenerateButtonDisabled"
          @click="emit('regenerateScenario', scenario.id)"
        >
          <span class="material-symbols-outlined text-base">
            {{ isRegenerating ? 'hourglass_top' : 'refresh' }}
          </span>
          {{ buttonLabel }}
        </button>
      </div>
      <h2 class="font-headline text-[1.375rem] text-on-surface m-0">{{ scenario.title }}</h2>
      <p class="font-body text-[0.9375rem] text-on-surface opacity-75 leading-[1.6] m-0">{{ scenario.summary }}</p>
      <div v-if="isRegenerating" class="flex flex-col gap-[0.4rem]">
        <div class="flex items-center justify-between gap-3">
          <span class="font-body text-[0.8125rem] text-primary">{{ currentStepLabel }}</span>
          <span class="font-label text-xs text-primary">{{ progressPercent }}%</span>
        </div>
        <div class="w-full h-[0.4rem] rounded-full bg-[color-mix(in_srgb,var(--color-primary)_14%,var(--color-surface-container-highest))] overflow-hidden">
          <div
            class="h-full bg-primary transition-[width] duration-200 ease-in-out"
            :style="{ width: `${progressPercent}%` }"
          />
        </div>
      </div>
      <p v-if="regenerationError" class="m-0 font-body text-[0.8125rem] text-error">{{ regenerationError }}</p>
    </header>

    <!-- Section Lieux -->
    <div v-if="scenario.locations.length > 0" class="flex flex-col gap-[0.875rem]">
      <h3 class="flex items-center gap-2 font-label text-xs font-bold tracking-[0.06em] uppercase text-on-surface opacity-55 m-0">
        <span class="material-symbols-outlined text-base">location_on</span>
        Lieux
        <span class="inline-flex items-center justify-center min-w-5 h-5 px-[0.375rem] bg-surface-container-highest rounded-full text-[0.6875rem] font-bold">
          {{ scenario.locations.length }}
        </span>
      </h3>
      <div class="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-[0.875rem]">
        <ImportEntityCard
          v-for="loc in scenario.locations"
          :key="loc.id"
          :entity="loc"
          entity-type="location"
          :gen-state="imageGenStates[loc.id]"
          @generate-image="emit('generateImage', loc.id)"
        />
      </div>
    </div>

    <!-- Section PNJ -->
    <div v-if="scenario.npcs.length > 0" class="flex flex-col gap-[0.875rem]">
      <h3 class="flex items-center gap-2 font-label text-xs font-bold tracking-[0.06em] uppercase text-on-surface opacity-55 m-0">
        <span class="material-symbols-outlined text-base">group</span>
        Personnages non-joueurs
        <span class="inline-flex items-center justify-center min-w-5 h-5 px-[0.375rem] bg-surface-container-highest rounded-full text-[0.6875rem] font-bold">
          {{ scenario.npcs.length }}
        </span>
      </h3>
      <div class="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-[0.875rem]">
        <ImportEntityCard
          v-for="npc in scenario.npcs"
          :key="npc.id"
          :entity="npc"
          entity-type="npc"
          :gen-state="imageGenStates[npc.id]"
          @generate-image="emit('generateImage', npc.id)"
        />
      </div>
    </div>

    <!-- Fallback si aucune entité -->
    <p
      v-if="scenario.locations.length === 0 && scenario.npcs.length === 0"
      class="font-body text-sm text-on-surface opacity-40 m-0 italic"
    >
      Aucun lieu ni PNJ identifié pour ce scénario.
    </p>
  </section>
</template>
