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
  <section class="scenario-card">
    <!-- En-tête scénario -->
    <header class="scenario-header">
      <div class="scenario-headline-row">
        <div class="scenario-meta">
          <span class="scenario-index">Scénario {{ scenarioIndex + 1 }}</span>
          <span v-if="scenario.sourcePages.length > 0" class="scenario-pages">
            Pages {{ scenario.sourcePages[0] }}–{{ scenario.sourcePages[scenario.sourcePages.length - 1] }}
          </span>
        </div>
        <button
          class="btn-regenerate-scenario"
          :disabled="isRegenerateButtonDisabled"
          @click="emit('regenerateScenario', scenario.id)"
        >
          <span class="material-symbols-outlined">
            {{ isRegenerating ? 'hourglass_top' : 'refresh' }}
          </span>
          {{ buttonLabel }}
        </button>
      </div>
      <h2 class="scenario-title">{{ scenario.title }}</h2>
      <p class="scenario-summary">{{ scenario.summary }}</p>
      <div v-if="isRegenerating" class="scenario-regeneration-progress">
        <div class="scenario-regeneration-progress-head">
          <span class="scenario-regeneration-step">{{ currentStepLabel }}</span>
          <span class="scenario-regeneration-percent">{{ progressPercent }}%</span>
        </div>
        <div class="scenario-regeneration-bar">
          <div class="scenario-regeneration-fill" :style="{ width: `${progressPercent}%` }" />
        </div>
      </div>
      <p v-if="regenerationError" class="scenario-regeneration-error">{{ regenerationError }}</p>
    </header>

    <!-- Section Lieux -->
    <div v-if="scenario.locations.length > 0" class="entity-section">
      <h3 class="entity-section-title">
        <span class="material-symbols-outlined section-icon">location_on</span>
        Lieux
        <span class="entity-count">{{ scenario.locations.length }}</span>
      </h3>
      <div class="entity-grid">
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
    <div v-if="scenario.npcs.length > 0" class="entity-section">
      <h3 class="entity-section-title">
        <span class="material-symbols-outlined section-icon">group</span>
        Personnages non-joueurs
        <span class="entity-count">{{ scenario.npcs.length }}</span>
      </h3>
      <div class="entity-grid">
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
      class="no-entities"
    >
      Aucun lieu ni PNJ identifié pour ce scénario.
    </p>
  </section>
</template>

<style scoped>
.scenario-card {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
  background: var(--color-surface-container-low);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-outline-variant);
}

/* En-tête */
.scenario-header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.scenario-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.scenario-headline-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.scenario-index {
  font-family: var(--font-label);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-primary);
}

.scenario-pages {
  font-family: var(--font-label);
  font-size: 0.6875rem;
  color: var(--color-on-surface);
  opacity: 0.45;
}

.scenario-title {
  font-family: var(--font-headline);
  font-size: 1.375rem;
  color: var(--color-on-surface);
  margin: 0;
}

.scenario-summary {
  font-family: var(--font-body);
  font-size: 0.9375rem;
  color: var(--color-on-surface);
  opacity: 0.75;
  line-height: 1.6;
  margin: 0;
}

.btn-regenerate-scenario {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background: transparent;
  color: var(--color-primary);
  border: 1px solid color-mix(in srgb, var(--color-primary) 35%, transparent);
  border-radius: var(--radius-lg);
  font-family: var(--font-label);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    opacity 0.15s;
}

.btn-regenerate-scenario:hover {
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  border-color: var(--color-primary);
}

.btn-regenerate-scenario:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-regenerate-scenario .material-symbols-outlined {
  font-size: 1rem;
}

.scenario-regeneration-progress {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.scenario-regeneration-progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.scenario-regeneration-step {
  font-family: var(--font-body);
  font-size: 0.8125rem;
  color: var(--color-primary);
}

.scenario-regeneration-percent {
  font-family: var(--font-label);
  font-size: 0.75rem;
  color: var(--color-primary);
}

.scenario-regeneration-bar {
  width: 100%;
  height: 0.4rem;
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--color-primary) 14%, var(--color-surface-container-highest));
  overflow: hidden;
}

.scenario-regeneration-fill {
  height: 100%;
  background: var(--color-primary);
  transition: width 0.2s ease;
}

.scenario-regeneration-error {
  margin: 0;
  font-family: var(--font-body);
  font-size: 0.8125rem;
  color: var(--color-error);
}

/* Sections entités */
.entity-section {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.entity-section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-label);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-on-surface);
  opacity: 0.55;
  margin: 0;
}

.section-icon {
  font-size: 1rem;
}

.entity-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.375rem;
  background: var(--color-surface-container-highest);
  border-radius: var(--radius-full);
  font-size: 0.6875rem;
  font-weight: 700;
}

/* Grille d'entités */
.entity-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.875rem;
}

/* Fallback */
.no-entities {
  font-family: var(--font-body);
  font-size: 0.875rem;
  color: var(--color-on-surface);
  opacity: 0.4;
  margin: 0;
  font-style: italic;
}
</style>
