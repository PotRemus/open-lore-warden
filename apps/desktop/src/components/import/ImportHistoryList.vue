<script setup lang="ts">
import type { ImportSummary } from '@open-lore-warden/domain'

defineProps<{
  imports: ImportSummary[]
  loading: boolean
  loadingImportId: string | null
}>()

const emit = defineEmits<{
  open: [importId: string]
}>()
</script>

<template>
  <section class="bg-surface-container p-8 rounded-xl relative shadow-xl overflow-hidden border border-outline-variant/10">
    <div class="absolute top-0 left-0 w-1 h-full bg-secondary/50"></div>
    <div class="flex justify-between items-end mb-8">
      <h3 class="font-headline text-2xl flex items-center gap-2">
        <span class="material-symbols-outlined title-icon">history</span>
        Campagnes importées
        <span v-if="imports.length > 0" class="flex items-center justify-center rounded-full bg-surface-container-high p-1.5 w-7 h-7">{{ imports.length }}</span>
      </h3>
    </div>

    <!-- Chargement initial -->
    <div v-if="loading" class="history-loading">
      <span class="loading-spinner" />
      <span class="loading-label">Chargement…</span>
    </div>

    <!-- Liste vide -->
    <p v-else-if="imports.length === 0" class="history-empty">
      <span class="material-symbols-outlined empty-icon">inbox</span>
      Aucun scénario importé pour l'instant.
    </p>

    <!-- Liste -->
    <ul v-else class="import-list">
      <li v-for="item in imports" :key="item.id" class="import-item">
        <!-- Badges + titre -->
        <div class="item-main">
          <div class="item-badges">
            <span v-if="item.genre" class="badge badge--genre">{{ item.genre }}</span>
            <span v-if="item.theme" class="badge badge--theme">{{ item.theme }}</span>
          </div>
          <p class="item-title">{{ item.title }}</p>
          <p class="item-summary">{{ item.summary }}</p>
        </div>

        <!-- Bouton Éditer -->
        <button
          class="btn-edit"
          :class="{ 'btn-edit--loading': loadingImportId === item.id }"
          :disabled="loadingImportId !== null"
          @click="emit('open', item.id)"
        >
          <span v-if="loadingImportId === item.id" class="btn-spinner" />
          <span v-else class="material-symbols-outlined">edit</span>
          {{ loadingImportId === item.id ? 'Chargement…' : 'Éditer' }}
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.history {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

/* Titre de section */
/* .history-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-label);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-on-surface);
  opacity: 0.55;
  margin: 0;
} */

/* .title-icon {
  font-size: 1rem;
} */

/* .count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.375rem;
  background: var(--color-surface-container-high);
  border-radius: var(--radius-full);
  font-size: 0.6875rem;
  font-weight: 700;
  opacity: 1;
} */

/* États chargement / vide */
.history-loading {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 1rem 0;
}

.loading-spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid color-mix(in srgb, var(--color-primary) 30%, transparent);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.loading-label {
  font-family: var(--font-body);
  font-size: 0.875rem;
  color: var(--color-on-surface);
  opacity: 0.5;
}

.history-empty {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-body);
  font-size: 0.875rem;
  color: var(--color-on-surface);
  opacity: 0.4;
  margin: 0;
  padding: 0.5rem 0;
  font-style: italic;
}

.empty-icon {
  font-size: 1.125rem;
}

/* Liste */
.import-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Entrée */
.import-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.875rem 1rem;
  background: var(--color-surface-container);
  border: 1px solid var(--color-outline-variant);
  border-radius: var(--radius-xl);
  transition: border-color 0.15s;
}

.import-item:hover {
  border-color: color-mix(in srgb, var(--color-primary) 40%, var(--color-outline-variant));
}

/* Contenu principal */
.item-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.item-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-bottom: 0.125rem;
}

.badge {
  font-family: var(--font-label);
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-full);
}

.badge--genre {
  background: color-mix(in srgb, var(--color-primary) 15%, transparent);
  color: var(--color-primary);
  border: 1px solid color-mix(in srgb, var(--color-primary) 28%, transparent);
}

.badge--theme {
  background: color-mix(in srgb, var(--color-secondary) 15%, transparent);
  color: var(--color-secondary);
  border: 1px solid color-mix(in srgb, var(--color-secondary) 28%, transparent);
}

.item-title {
  font-family: var(--font-body);
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-on-surface);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-summary {
  font-family: var(--font-body);
  font-size: 0.8125rem;
  color: var(--color-on-surface);
  opacity: 0.6;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.5;
}

/* Bouton Éditer */
.btn-edit {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  flex-shrink: 0;
  padding: 0.5rem 1rem;
  background: transparent;
  color: var(--color-primary);
  border: 1px solid color-mix(in srgb, var(--color-primary) 40%, transparent);
  border-radius: var(--radius-xl);
  font-family: var(--font-label);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    opacity 0.15s;
}

.btn-edit:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  border-color: var(--color-primary);
}

.btn-edit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-edit--loading {
  opacity: 0.7;
}

.btn-edit .material-symbols-outlined {
  font-size: 1rem;
}

/* Spinner dans le bouton */
.btn-spinner {
  display: inline-block;
  width: 0.875rem;
  height: 0.875rem;
  border: 2px solid color-mix(in srgb, var(--color-primary) 30%, transparent);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
