<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PublicGameSystemDescriptor } from '@open-lore-warden/rules-engine'

const props = defineProps<{
  gameSystems: PublicGameSystemDescriptor[]
  loading: boolean
}>()

const emit = defineEmits<{
  submit: [payload: { file: File; gameSystemId: string }]
}>()

const selectedFile = ref<File | null>(null)
const selectedGameSystemId = ref('')
const isDragging = ref(false)

const canSubmit = computed(
  () => selectedFile.value !== null && selectedGameSystemId.value !== '' && !props.loading,
)

const systemLabels: Record<string, string> = {
  'generic': 'Générique (système libre)',
  'dnd-5e': 'Dungeons & Dragons 5e',
  'coc-7e': 'L\'Appel de Cthulhu 7e',
  'fate-core': 'Fate Core',
  'pbta': 'Powered by the Apocalypse',
  'yze': 'Year Zero Engine',
}

function systemLabel(id: string): string {
  return systemLabels[id] ?? id
}

function onFileInput(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files?.[0]) selectedFile.value = input.files[0]
}

function onDrop(event: DragEvent) {
  isDragging.value = false
  const file = event.dataTransfer?.files[0]
  if (file?.type === 'application/pdf') {
    selectedFile.value = file
  }
}

function onDragOver(event: DragEvent) {
  event.preventDefault()
  isDragging.value = true
}

function onDragLeave() {
  isDragging.value = false
}

function onSubmit() {
  if (!canSubmit.value || !selectedFile.value) return
  emit('submit', { file: selectedFile.value, gameSystemId: selectedGameSystemId.value })
}
</script>

<template>
  <div class="upload-form">
    <!-- Système de jeu -->
    <div class="field">
      <label class="field-label">Système de jeu</label>
      <select
        v-model="selectedGameSystemId"
        class="field-select"
        :disabled="loading"
      >
        <option value="">— Choisir un système —</option>
        <option v-for="s in gameSystems" :key="s.id" :value="s.id">
          {{ systemLabel(s.id) }}
        </option>
      </select>
    </div>

    <!-- Zone drag & drop -->
    <div class="field">
      <label class="field-label">Fichier PDF</label>
      <label
        class="drop-zone"
        :class="{ 'drop-zone--dragging': isDragging, 'drop-zone--filled': selectedFile }"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop.prevent="onDrop"
      >
        <input
          type="file"
          accept="application/pdf"
          class="file-input"
          :disabled="loading"
          @change="onFileInput"
        />
        <template v-if="selectedFile">
          <span class="material-symbols-outlined drop-icon drop-icon--filled">picture_as_pdf</span>
          <span class="drop-filename">{{ selectedFile.name }}</span>
          <span class="drop-hint">Cliquez ou déposez un autre fichier pour remplacer</span>
        </template>
        <template v-else>
          <span class="material-symbols-outlined drop-icon">upload_file</span>
          <span class="drop-label">Déposez votre PDF ici</span>
          <span class="drop-hint">ou cliquez pour parcourir</span>
        </template>
      </label>
    </div>

    <!-- Bouton submit -->
    <button
      class="btn-submit"
      :class="{ 'btn-submit--disabled': !canSubmit }"
      :disabled="!canSubmit"
      @click="onSubmit"
    >
      <span v-if="loading" class="btn-spinner" />
      <span v-else class="material-symbols-outlined">auto_stories</span>
      {{ loading ? 'Envoi en cours…' : 'Importer le scénario' }}
    </button>
  </div>
</template>

<style scoped>
.upload-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
  border: 1px solid var(--color-outline-variant);
  border-radius: var(--radius-xl);
  padding: 2rem;
  background: var(--color-surface-container);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field-label {
  font-family: var(--font-label);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-on-surface);
  opacity: 0.6;
}

.field-select {
  appearance: none;
  background: var(--color-surface-container);
  border: 1px solid var(--color-outline-variant);
  border-radius: var(--radius-xl);
  color: var(--color-on-surface);
  font-family: var(--font-body);
  font-size: 0.875rem;
  padding: 0.625rem 1rem;
  cursor: pointer;
  transition: border-color 0.15s;
}

.field-select:focus {
  outline: none;
  border-color: var(--color-primary);
}

.field-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Zone drop */
.drop-zone {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 2rem 1.5rem;
  background: var(--color-surface-container);
  border: 2px dashed var(--color-outline-variant);
  border-radius: var(--radius-xl);
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s;
  text-align: center;
}

.drop-zone:hover,
.drop-zone--dragging {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 6%, var(--color-surface-container));
}

.drop-zone--filled {
  border-style: solid;
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface-container));
}

.file-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
  height: 100%;
}

.drop-icon {
  font-size: 2.5rem;
  color: var(--color-on-surface);
  opacity: 0.4;
}

.drop-icon--filled {
  opacity: 1;
  color: var(--color-primary);
}

.drop-label {
  font-family: var(--font-body);
  font-size: 0.9375rem;
  color: var(--color-on-surface);
}

.drop-filename {
  font-family: var(--font-body);
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-on-surface);
  word-break: break-all;
}

.drop-hint {
  font-family: var(--font-body);
  font-size: 0.75rem;
  color: var(--color-on-surface);
  opacity: 0.5;
}

/* Bouton submit */
.btn-submit {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: var(--color-primary);
  color: var(--color-on-primary);
  border: none;
  border-radius: var(--radius-xl);
  font-family: var(--font-label);
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  align-self: flex-start;
}

.btn-submit:hover:not(.btn-submit--disabled) {
  opacity: 0.9;
}

.btn-submit--disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Spinner bouton */
.btn-spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid var(--color-on-primary);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
