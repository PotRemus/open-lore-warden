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

const progressPercent = computed<number | null>(() => {
  if (!props.job?.progress) return null
  const { current, total } = props.job.progress
  if (total === 0) return null
  return Math.round((current / total) * 100)
})
</script>

<template>
  <div class="pipeline">
    <p class="pipeline-title">Traitement du scénario en cours…</p>

    <!-- Étapes -->
    <ol class="steps">
      <li
        v-for="step in steps"
        :key="step.status"
        class="step"
        :class="`step--${getStepState(step.status)}`"
      >
        <!-- Icône / indicateur -->
        <div class="step-indicator">
          <span v-if="getStepState(step.status) === 'done'" class="material-symbols-outlined step-check">
            check
          </span>
          <span v-else-if="getStepState(step.status) === 'active'" class="step-spinner" />
          <span v-else class="step-dot" />
        </div>

        <!-- Connecteur vertical -->
        <div v-if="step.status !== 'done'" class="step-connector" />

        <!-- Contenu -->
        <div class="step-content">
          <span class="material-symbols-outlined step-icon">{{ step.icon }}</span>
          <div class="step-text">
            <span class="step-label">{{ step.label }}</span>
            <span v-if="getStepState(step.status) === 'active'" class="step-status">
              En cours…
            </span>
          </div>
        </div>
      </li>
    </ol>

    <!-- Barre de progression -->
    <div v-if="progressPercent !== null" class="progress-bar-wrap">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: `${progressPercent}%` }" />
      </div>
      <span class="progress-label">{{ progressPercent }}&thinsp;%</span>
    </div>
  </div>
</template>

<style scoped>
.pipeline {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding: 2rem;
  background: var(--color-surface-container);
  border-radius: var(--radius-xl);
  max-width: 480px;
  width: 100%;
}

.pipeline-title {
  font-family: var(--font-headline);
  font-size: 1.125rem;
  color: var(--color-on-surface);
  margin: 0;
}

/* Liste d'étapes */
.steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.step {
  display: grid;
  grid-template-columns: 2rem 1px 1fr;
  grid-template-rows: auto auto;
  column-gap: 0.875rem;
  align-items: start;
}

/* Indicateur (cercle, spinner, check) */
.step-indicator {
  grid-column: 1;
  grid-row: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: var(--color-surface-container-high);
  border: 2px solid var(--color-outline-variant);
  transition:
    background 0.2s,
    border-color 0.2s;
}

.step--active .step-indicator {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 15%, var(--color-surface-container-high));
}

.step--done .step-indicator {
  border-color: var(--color-primary);
  background: var(--color-primary);
}

/* Connecteur vertical entre étapes */
.step-connector {
  grid-column: 2;
  grid-row: 1 / 3;
  width: 1px;
  min-height: 2.5rem;
  background: var(--color-outline-variant);
  margin: 2rem auto 0;
}

.step--done .step-connector {
  background: var(--color-primary);
  opacity: 0.5;
}

/* Contenu texte */
.step-content {
  grid-column: 3;
  grid-row: 1;
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.375rem 0 0.75rem;
}

.step-icon {
  font-size: 1.25rem;
  color: var(--color-on-surface);
  opacity: 0.35;
  transition: opacity 0.2s, color 0.2s;
}

.step--active .step-icon,
.step--done .step-icon {
  opacity: 1;
  color: var(--color-primary);
}

.step-text {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.step-label {
  font-family: var(--font-body);
  font-size: 0.9375rem;
  color: var(--color-on-surface);
  opacity: 0.5;
  transition: opacity 0.2s;
}

.step--active .step-label,
.step--done .step-label {
  opacity: 1;
}

.step-status {
  font-family: var(--font-body);
  font-size: 0.75rem;
  color: var(--color-primary);
}

/* Icônes dans l'indicateur */
.step-check {
  font-size: 1.1rem;
  color: var(--color-on-primary);
}

.step-dot {
  display: inline-block;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--color-outline-variant);
}

/* Spinner */
.step-spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid var(--color-primary);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Barre de progression */
.progress-bar-wrap {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: var(--color-surface-container-high);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: var(--radius-full);
  transition: width 0.4s ease;
}

.progress-label {
  font-family: var(--font-label);
  font-size: 0.75rem;
  color: var(--color-on-surface);
  opacity: 0.6;
  min-width: 2.5rem;
  text-align: right;
}
</style>
