<script setup lang="ts">
import { computed } from 'vue'
import type { ImportJob, ImportJobStatus } from '@open-lore-warden/domain'

const props = defineProps<{
  job: ImportJob | null
}>()

type StepState = 'pending' | 'active' | 'done'

type ImportPipelineStatus = ImportJobStatus | 'llm_starting'

interface PipelineStep {
  status: ImportPipelineStatus
  label: string
  icon: string
}

const steps: PipelineStep[] = [
  { status: 'llm_starting', label: 'Démarrage du modèle LLM', icon: 'psychology' },
  { status: 'extracting', label: 'Extraction du contenu', icon: 'description' },
  { status: 'classifying', label: 'Classification du scénario', icon: 'category' },
  { status: 'generating_campaign', label: 'Génération de la campagne', icon: 'auto_stories' },
  { status: 'generating_scenario', label: 'Génération des scénarios', icon: 'menu_book' },
  { status: 'done', label: 'Terminé', icon: 'check_circle' },
]

const statusOrder: ImportPipelineStatus[] = [
  // 'pending',
  'llm_starting',
  'extracting',
  'classifying',
  'generating_campaign',
  'generating_scenario',
  'done',
]

function getStepState(stepStatus: ImportPipelineStatus): StepState {
  if (!props.job) return 'active'
  if (props.job.status === 'pending') return 'pending'
  const currentIdx = statusOrder.indexOf(props.job.status)
  const stepIdx = statusOrder.indexOf(stepStatus)
  if (currentIdx > stepIdx) return 'done'
  if (currentIdx === stepIdx) return 'active'
  return 'pending'
}

function indicatorClasses(state: StepState): string {
  const base =
    'col-start-1 row-start-1 flex items-center justify-center size-8 rounded-full border-2 transition-[background,border-color] duration-200'
  if (state === 'done') return `${base} border-primary bg-primary`
  if (state === 'active')
    return `${base} border-primary bg-[color-mix(in_srgb,var(--color-primary)_15%,var(--color-surface-container-high))]`
  return `${base} border-outline-variant bg-surface-container-high`
}

function connectorClasses(state: StepState): string {
  const base = 'col-start-2 row-start-1 row-end-3 w-px min-h-10 mt-8 mx-auto'
  if (state === 'done') return `${base} bg-primary opacity-50`
  return `${base} bg-outline-variant`
}

function iconClasses(state: StepState): string {
  const base = 'material-symbols-outlined text-xl transition-[opacity,color] duration-200'
  if (state === 'active' || state === 'done') return `${base} opacity-100 text-primary`
  return `${base} opacity-35 text-on-surface`
}

function labelClasses(state: StepState): string {
  const base = 'font-body text-[0.9375rem] text-on-surface transition-opacity duration-200'
  if (state === 'active' || state === 'done') return `${base} opacity-100`
  return `${base} opacity-50`
}

const progressPercent = computed<number | null>(() => {
  if (!props.job?.progress) return null
  const { current, total } = props.job.progress
  if (total === 0) return null
  return Math.round((current / total) * 100)
})
</script>

<template>
  <div class="olw-import-processing-pipeline flex flex-col gap-8 p-8 bg-surface-container rounded-xl max-w-120 w-full">
    <p class="font-headline text-lg text-on-surface m-0">Traitement du scénario en cours…</p>

    <!-- Étapes -->
    <ol class="list-none m-0 p-0 flex flex-col">
      <li
        v-for="step in steps"
        :key="step.status"
        class="grid grid-cols-[2rem_1px_1fr] grid-rows-[auto_auto] gap-x-3.5 items-start"
      >
        <!-- Icône / indicateur -->
        <div :class="indicatorClasses(getStepState(step.status))">
          <span v-if="getStepState(step.status) === 'done'" class="material-symbols-outlined text-[1.1rem] text-on-primary">
            check
          </span>
          <span
            v-else-if="getStepState(step.status) === 'active'"
            class="inline-block size-4 border-2 border-primary border-t-transparent rounded-full animate-[spin_0.7s_linear_infinite]"
          />
          <span v-else class="inline-block size-2 rounded-full bg-outline-variant" />
        </div>

        <!-- Connecteur vertical -->
        <div v-if="step.status !== 'done'" :class="connectorClasses(getStepState(step.status))" />

        <!-- Contenu -->
        <div class="col-start-3 row-start-1 flex items-center gap-2.5 pt-1.5 pb-3">
          <span :class="iconClasses(getStepState(step.status))">{{ step.icon }}</span>
          <div class="flex flex-col gap-0.5">
            <span :class="labelClasses(getStepState(step.status))">{{ step.label }}</span>
            <span v-if="getStepState(step.status) === 'active'" class="font-body text-xs text-primary">
              En cours…
            </span>
          </div>
        </div>
      </li>
    </ol>

    <!-- Barre de progression -->
    <div v-if="progressPercent !== null" class="flex items-center gap-3">
      <div class="flex-1 h-1 bg-surface-container-high rounded-full overflow-hidden">
        <div
          class="h-full bg-primary rounded-full transition-[width] duration-400 ease-in-out"
          :style="{ width: `${progressPercent}%` }"
        />
      </div>
      <span class="font-label text-xs text-on-surface opacity-60 min-w-10 text-right">{{ progressPercent }}&thinsp;%</span>
    </div>
  </div>
</template>

