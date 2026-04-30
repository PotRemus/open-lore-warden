<script setup lang="ts">
import { computed } from 'vue'
import type { CampaignImportResult } from '@open-lore-warden/domain'
import { getSidecarBaseUrl } from '@/stores/settings.store'

const props = defineProps<{
  result: CampaignImportResult
  pendingCount: number
}>()

const emit = defineEmits<{
  generateAll: []
}>()

const coverSrc = computed<string | null>(() => {
  if (!props.result.coverImagePath) return null
  return `${getSidecarBaseUrl()}${props.result.coverImagePath}`
})

const systemLabel = computed(() => {
  if (!props.result.gameSystem) return null
  const { name, edition } = props.result.gameSystem
  return edition ? `${name} — ${edition}` : name
})
</script>

<template>
  <header class="campaign-header">
    <!-- Cover image (fond pleine largeur) -->
    <img
      v-if="coverSrc"
      :src="coverSrc"
      :alt="result.title"
      class="cover-img"
    />
    <div v-else class="cover-placeholder">
      <span class="material-symbols-outlined cover-icon">auto_stories</span>
    </div>

    <!-- Calque dégradé transparent → noir -->
    <div class="cover-gradient" />

    <!-- Infos (positionnées sur la partie sombre) -->
    <div class="campaign-info">
      <div class="meta-row">
        <span v-if="result.genre" class="badge badge--primary">{{ result.genre }}</span>
        <span v-if="result.theme" class="badge badge--secondary">{{ result.theme }}</span>
        <span v-if="systemLabel" class="badge badge--neutral">{{ systemLabel }}</span>
      </div>

      <h1 class="campaign-title">{{ result.title }}</h1>

      <p class="campaign-summary">{{ result.summary }}</p>

      <p class="campaign-source">
        <span class="material-symbols-outlined source-icon">picture_as_pdf</span>
        Source : {{ result.sourceFilename }}
      </p>

      <!-- Bouton global génération images -->
      <button
        v-if="pendingCount > 0"
        class="btn-generate-all"
        @click="emit('generateAll')"
      >
        <span class="material-symbols-outlined">image</span>
        Générer toutes les images
        <span class="pending-badge">{{ pendingCount }}</span>
      </button>
      <p v-else class="all-generated">
        <span class="material-symbols-outlined">check_circle</span>
        Toutes les images ont été générées
      </p>
    </div>
  </header>
</template>

<style scoped>
.campaign-header {
  position: relative;
  min-height: 450px;
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-outline-variant);
  overflow: hidden;
}

/* Cover pleine largeur */
.cover-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
}

.cover-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface-container-high);
  z-index: 0;
}

.cover-icon {
  font-size: 4rem;
  color: #fff;
  opacity: 0.2;
}

/* Calque dégradé transparent → noir */
.cover-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, transparent 10%, var(--color-surface));
  z-index: 1;
}

/* Infos campagne — sur la partie sombre */
.campaign-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 2rem 1.75rem 1.5rem;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.badge {
  font-family: var(--font-label);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 0.25rem 0.625rem;
  border-radius: var(--radius-full);
}

.badge--primary {
  background: color-mix(in srgb, var(--color-primary) 30%, transparent);
  color: var(--color-primary);
  border: 1px solid color-mix(in srgb, var(--color-primary) 40%, transparent);
}

.badge--secondary {
  background: color-mix(in srgb, var(--color-secondary) 30%, transparent);
  color: var(--color-secondary);
  border: 1px solid color-mix(in srgb, var(--color-secondary) 40%, transparent);
}

.badge--neutral {
  background: rgba(255 255 255 / 0.3);
  color: rgba(255 255 255 / 0.75);
  border: 1px solid rgba(255 255 255 / 0.2);
}

.campaign-title {
  font-family: var(--font-headline);
  font-size: 2rem;
  color: #fff;
  margin: 0;
  line-height: 1.2;
  text-shadow: 0 2px 12px rgba(0 0 0 / 0.6);
}

.campaign-summary {
  font-family: var(--font-body);
  font-size: 0.9375rem;
  color: rgba(255 255 255 / 0.8);
  line-height: 1.6;
  margin: 0;
}

.campaign-source {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-family: var(--font-body);
  font-size: 0.75rem;
  color: rgba(255 255 255 / 0.45);
  margin: 0;
}

.source-icon {
  font-size: 1rem;
}

/* Bouton génération globale */
.btn-generate-all {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  align-self: flex-start;
  padding: 0.625rem 1.25rem;
  background: var(--color-primary);
  color: var(--color-on-primary);
  border: none;
  border-radius: var(--radius-xl);
  font-family: var(--font-label);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  margin-top: 0.25rem;
}

.btn-generate-all:hover {
  opacity: 0.9;
}

.pending-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.375rem;
  background: var(--color-on-primary);
  color: var(--color-primary);
  border-radius: var(--radius-full);
  font-size: 0.6875rem;
  font-weight: 700;
}

.all-generated {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-family: var(--font-body);
  font-size: 0.875rem;
  color: var(--color-primary);
  margin: 0;
  margin-top: 0.25rem;
}
</style>
