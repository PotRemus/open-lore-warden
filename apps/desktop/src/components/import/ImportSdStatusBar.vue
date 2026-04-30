<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import {
  getSdStatus,
  onSdStatus,
  downloadPercent,
  downloadModelPercent,
  type SdStatus,
} from '@/api/sd-api-client'
import { formatBytes } from '@/api/llm-api-client'
import type { UnlistenFn } from '@tauri-apps/api/event'

const status = ref<SdStatus>({ type: 'idle' })
let unlisten: UnlistenFn | null = null

onMounted(async () => {
  try {
    status.value = await getSdStatus()
    unlisten = await onSdStatus((s) => {
      status.value = s
    })
  } catch {
    // Hors contexte Tauri (dev Vite) — on reste sur l'état idle
  }
})

onUnmounted(() => {
  unlisten?.()
})
</script>

<template>
  <div class="sd-bar" :class="`sd-bar--${status.type}`">
    <span class="material-symbols-outlined bar-icon">image</span>

    <!-- Idle / stopped -->
    <template v-if="status.type === 'idle' || status.type === 'stopped'">
      <span class="bar-label">Générateur d'images en attente…</span>
    </template>

    <!-- Téléchargement sd-server -->
    <template v-else-if="status.type === 'downloading'">
      <span class="bar-spinner" />
      <div class="bar-body">
        <span class="bar-label">Téléchargement de sd-server…</span>
        <div class="bar-progress">
          <div class="bar-fill" :style="{ width: `${downloadPercent(status)}%` }" />
        </div>
        <span class="bar-meta">
          {{ formatBytes(status.downloaded) }} / {{ formatBytes(status.total) }}
          &nbsp;({{ downloadPercent(status) }}&thinsp;%)
        </span>
      </div>
    </template>

    <!-- Extraction binaire -->
    <template v-else-if="status.type === 'extracting'">
      <span class="bar-spinner" />
      <span class="bar-label">Extraction du binaire sd-server…</span>
    </template>

    <!-- Téléchargement du modèle SD (~4 Go) -->
    <template v-else-if="status.type === 'downloadingModel'">
      <span class="bar-spinner" />
      <div class="bar-body">
        <span class="bar-label">Téléchargement du modèle SD&thinsp;(~4&thinsp;Go)…</span>
        <div class="bar-progress">
          <div class="bar-fill" :style="{ width: `${downloadModelPercent(status)}%` }" />
        </div>
        <span class="bar-meta">
          {{ formatBytes(status.downloaded) }} / {{ formatBytes(status.total) }}
          &nbsp;({{ downloadModelPercent(status) }}&thinsp;%)
        </span>
      </div>
    </template>

    <!-- Démarrage / chargement du modèle -->
    <template v-else-if="status.type === 'starting'">
      <span class="bar-spinner" />
      <span class="bar-label">Chargement du modèle SD…</span>
    </template>

    <!-- Prêt -->
    <template v-else-if="status.type === 'ready'">
      <span class="bar-dot bar-dot--ready" />
      <span class="bar-label">Générateur d'images prêt</span>
    </template>

    <!-- Erreur -->
    <template v-else-if="status.type === 'error'">
      <span class="bar-dot bar-dot--error" />
      <div class="bar-body">
        <span class="bar-label">Erreur du générateur d'images</span>
        <span class="bar-meta bar-meta--error">{{ status.message }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.sd-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 1rem;
  background: var(--color-surface-container);
  border: 1px solid var(--color-outline-variant);
  border-radius: var(--radius-xl);
  transition: border-color 0.2s, background 0.2s;
}

.sd-bar--ready {
  background: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface-container));
  border-color: color-mix(in srgb, var(--color-primary) 35%, transparent);
}

.sd-bar--error {
  background: color-mix(in srgb, var(--color-error) 8%, var(--color-surface-container));
  border-color: color-mix(in srgb, var(--color-error) 35%, transparent);
}

.sd-bar--downloading,
.sd-bar--downloadingModel,
.sd-bar--extracting,
.sd-bar--starting {
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

.sd-bar--ready .bar-icon {
  color: var(--color-primary);
  opacity: 1;
}

.sd-bar--error .bar-icon {
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
