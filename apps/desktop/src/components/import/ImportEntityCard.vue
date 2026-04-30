<script setup lang="ts">
import { computed } from 'vue'
import type { ImportLocation, ImportNpcProfile } from '@open-lore-warden/domain'
import type { ImageGenState } from './types'
import { getSidecarBaseUrl } from '@/stores/settings.store'

const props = defineProps<{
  entity: ImportLocation | ImportNpcProfile
  entityType: 'location' | 'npc'
  genState?: ImageGenState
}>()

const emit = defineEmits<{
  generateImage: []
}>()

const npcEntity = computed(() =>
  props.entityType === 'npc' ? (props.entity as ImportNpcProfile) : null,
)

const imageSrc = computed<string | null>(() => {
  if (!props.entity.imagePath) return null
  const base = `${getSidecarBaseUrl()}${props.entity.imagePath}`
  return props.genState?.cacheBust ? `${base}?t=${props.genState.cacheBust}` : base
})

const isGenerating = computed(() => props.genState?.status === 'generating')
const hasError = computed(() => props.genState?.status === 'error')
const hasImage = computed(() => !!props.entity.imagePath)
const canGenerate = computed(() => !isGenerating.value)
const isRegenerate = computed(() => hasImage.value && !hasError.value)

const placeholderIcon = computed(() =>
  props.entityType === 'npc' ? 'person' : 'location_on',
)
</script>

<template>
  <article class="entity-card">
    <!-- Zone image -->
    <div class="image-zone">
      <!-- Image générée -->
      <img
        v-if="imageSrc"
        :src="imageSrc"
        :alt="entity.name"
        class="entity-img"
      />
      <!-- Overlay de regénération sur image existante -->
      <div v-if="imageSrc && isGenerating" class="image-regen-overlay">
        <span class="gen-spinner" />
        <span class="gen-label">Génération…</span>
      </div>
      <!-- Génération en cours (sans image existante) -->
      <div v-else-if="!imageSrc && isGenerating" class="image-placeholder image-placeholder--generating">
        <span class="gen-spinner" />
        <span class="gen-label">Génération…</span>
      </div>
      <!-- Placeholder -->
      <div v-else class="image-placeholder">
        <span class="material-symbols-outlined placeholder-icon">{{ placeholderIcon }}</span>
      </div>

      <!-- Badge type -->
      <span class="type-badge">
        {{ entityType === 'npc' ? 'PNJ' : 'Lieu' }}
      </span>
    </div>

    <!-- Contenu texte -->
    <div class="entity-body">
      <p class="entity-name">{{ entity.name }}</p>
      <p v-if="npcEntity" class="entity-role">{{ npcEntity.role }}</p>
      <p class="entity-desc">{{ entity.description }}</p>
    </div>

    <!-- Actions -->
    <div v-if="canGenerate || hasError" class="entity-actions">
      <button class="btn-gen" @click="emit('generateImage')">
        <span class="material-symbols-outlined">{{ (!isRegenerate && !hasError) ? 'image' : 'refresh' }}</span>
        {{ hasError ? 'Réessayer' : (isRegenerate ? 'Regénérer' : 'Générer l\'image') }}
      </button>
      <p v-if="hasError && genState?.error" class="gen-error">{{ genState.error }}</p>
    </div>
  </article>
</template>

<style scoped>
.entity-card {
  display: flex;
  flex-direction: column;
  background: var(--color-surface-container-high);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-outline-variant);
  overflow: hidden;
  transition: border-color 0.15s;
}

.entity-card:hover {
  border-color: color-mix(in srgb, var(--color-primary) 40%, var(--color-outline-variant));
}

/* Zone image */
.image-zone {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 4;
  overflow: hidden;
  background: var(--color-surface-container);
}

.entity-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.image-placeholder--generating {
  background: color-mix(in srgb, var(--color-primary) 6%, var(--color-surface-container));
}

/* Overlay de regénération sur image existante */
.image-regen-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: color-mix(in srgb, var(--color-surface) 60%, transparent);
  backdrop-filter: blur(2px);
}

.placeholder-icon {
  font-size: 2.5rem;
  color: var(--color-on-surface);
  opacity: 0.2;
}

/* Spinner génération */
.gen-spinner {
  display: inline-block;
  width: 1.75rem;
  height: 1.75rem;
  border: 2px solid color-mix(in srgb, var(--color-primary) 30%, transparent);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.gen-label {
  font-family: var(--font-label);
  font-size: 0.75rem;
  color: var(--color-primary);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Badge type */
.type-badge {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  font-family: var(--font-label);
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--color-surface) 75%, transparent);
  color: var(--color-on-surface);
  backdrop-filter: blur(4px);
}

/* Texte */
.entity-body {
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.entity-name {
  font-family: var(--font-body);
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-on-surface);
  margin: 0;
}

.entity-role {
  font-family: var(--font-body);
  font-size: 0.75rem;
  color: var(--color-primary);
  margin: 0;
  font-style: italic;
}

.entity-desc {
  font-family: var(--font-body);
  font-size: 0.8125rem;
  color: var(--color-on-surface);
  opacity: 0.65;
  margin: 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Actions */
.entity-actions {
  padding: 0.625rem 0.75rem;
  border-top: 1px solid var(--color-outline-variant);
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.btn-gen {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background: transparent;
  color: var(--color-primary);
  border: 1px solid color-mix(in srgb, var(--color-primary) 40%, transparent);
  border-radius: var(--radius-lg);
  font-family: var(--font-label);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s;
  width: 100%;
  justify-content: center;
}

.btn-gen:hover {
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  border-color: var(--color-primary);
}

.btn-gen .material-symbols-outlined {
  font-size: 1rem;
}

.gen-error {
  font-family: var(--font-body);
  font-size: 0.6875rem;
  color: var(--color-error);
  margin: 0;
}
</style>
