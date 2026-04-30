<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useModelStore } from '@/stores/model.store';
import { storeToRefs } from 'pinia';

const modelStore = useModelStore()

const { modelStatus, modelType, downloadPercent, totalDownloadBytes, downloadBytes } = storeToRefs(modelStore)

onMounted(async () => {
  await modelStore.onListenModel()
})

onUnmounted(() => {
  modelStore.unListenModel()
})
</script>
<template>
  <div
    v-if="modelType != ''" 
    class="model-bar" :class="`model-bar--${modelStatus.type}`">
    <span class="material-symbols-outlined bar-icon">
        <template v-if="modelType === 'text'">
            psychology
        </template>
        <template v-else-if="modelType === 'image'">
            image
        </template>
    </span>

    <!-- Idle / stopped -->
    <template v-if="modelStatus.type === 'idle' || modelStatus.type === 'stopped'">
      <span class="bar-label">Générateur d'images en attente…</span>
    </template>

    <!-- Téléchargement server -->
    <template v-else-if="modelStatus.type === 'downloading'">
      <span class="bar-spinner" />
      <div class="bar-body">
        <span class="bar-label">Téléchargement de server…</span>
        <div class="bar-progress">
          <div class="bar-fill" :style="{ width: `${downloadPercent}%` }" />
        </div>
        <span class="bar-meta">
          {{ downloadBytes }} / {{ totalDownloadBytes }}
          &nbsp;({{ downloadPercent }}&thinsp;%)
        </span>
      </div>
    </template>

    <!-- Extraction binaire -->
    <template v-else-if="modelStatus.type === 'extracting'">
      <span class="bar-spinner" />
      <span class="bar-label">Extraction du binaire server…</span>
    </template>

    <!-- Téléchargement du modèle (~4 Go) -->
    <template v-else-if="modelStatus.type === 'downloadingModel'">
      <span class="bar-spinner" />
      <div class="bar-body">
        <span class="bar-label">Téléchargement du modèle &thinsp;(~4&thinsp;Go)…</span>
        <div class="bar-progress">
          <div class="bar-fill" :style="{ width: `${downloadPercent}%` }" />
        </div>
        <span class="bar-meta">
          {{ downloadBytes }} / {{ totalDownloadBytes }}
          &nbsp;({{ downloadPercent }}&thinsp;%)
        </span>
      </div>
    </template>

    <!-- Démarrage / chargement du modèle -->
    <template v-else-if="modelStatus.type === 'starting'">
      <span class="bar-spinner" />
      <span class="bar-label">Chargement du modèle …</span>
    </template>

    <!-- Prêt -->
    <template v-else-if="modelStatus.type === 'ready'">
      <span class="bar-dot bar-dot--ready" />
      <span class="bar-label">Générateur d'images prêt</span>
    </template>

    <!-- Erreur -->
    <template v-else-if="modelStatus.type === 'error'">
      <span class="bar-dot bar-dot--error" />
      <div class="bar-body">
        <span class="bar-label">Erreur du générateur d'images</span>
        <span class="bar-meta bar-meta--error">{{ modelStatus.message }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.model-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 1rem;
  background: var(--color-surface-container);
  border: 1px solid var(--color-outline-variant);
  border-radius: var(--radius-xl);
  transition: border-color 0.2s, background 0.2s;
}

.model-bar--ready {
  background: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface-container));
  border-color: color-mix(in srgb, var(--color-primary) 35%, transparent);
}

.model-bar--error {
  background: color-mix(in srgb, var(--color-error) 8%, var(--color-surface-container));
  border-color: color-mix(in srgb, var(--color-error) 35%, transparent);
}

.model-bar--downloading,
.model-bar--downloadingModel,
.model-bar--extracting,
.model-bar--starting {
  background: color-mix(in srgb, var(--color-secondary) 8%, var(--color-surface-container));
  border-color: color-mix(in srgb, var(--color-secondary) 30%, transparent);
}

/* Icône de gauche */
.bar-icon {
  font-size: 1.125rem;
  color: var(--color-on-surface);
  opacity: 0.5;
  flex-shrink: 0;
}

.model-bar--ready .bar-icon {
  color: var(--color-primary);
  opacity: 1;
}

.model-bar--error .bar-icon {
  color: var(--color-error);
  opacity: 1;
}

/* Conteneur texte + progression */
.bar-body {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
}

.bar-label {
  font-family: var(--font-body);
  font-size: 0.875rem;
  color: var(--color-on-surface);
  white-space: nowrap;
}

.bar-meta {
  font-family: var(--font-label);
  font-size: 0.75rem;
  color: var(--color-on-surface);
  opacity: 0.55;
}

.bar-meta--error {
  opacity: 1;
  color: var(--color-error);
}

/* Barre de progression */
.bar-progress {
  height: 3px;
  background: var(--color-surface-container-high);
  border-radius: var(--radius-full);
  overflow: hidden;
  min-width: 160px;
  max-width: 260px;
}

.bar-fill {
  height: 100%;
  background: var(--color-secondary);
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
}

/* Indicateur rond (ready / error) */
.bar-dot {
  display: inline-block;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  flex-shrink: 0;
}

.bar-dot--ready {
  background: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 25%, transparent);
}

.bar-dot--error {
  background: var(--color-error);
}

/* Spinner */
.bar-spinner {
  display: inline-block;
  width: 0.875rem;
  height: 0.875rem;
  border: 2px solid color-mix(in srgb, var(--color-secondary) 30%, transparent);
  border-top-color: var(--color-secondary);
  border-radius: 50%;
  flex-shrink: 0;
  animation: spin 0.75s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
