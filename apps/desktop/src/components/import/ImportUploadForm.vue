<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PublicGameSystemDescriptor } from '@open-lore-warden/rules-engine'
import Select from '@/volt/Select.vue'
import Button from '@/volt/Button.vue'
import ProgressSpinner from '@/volt/ProgressSpinner.vue'

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
  'brp': 'Basic Roleplaying',
  'dnd-5e': 'Dungeons & Dragons 5e',
  'coc-7e': 'L\'Appel de Cthulhu 7e',
  'fate-core': 'Fate Core',
  'pbta': 'Powered by the Apocalypse',
  'savage-worlds': 'Savage Worlds',
  'yze': 'Year Zero Engine',
}

const systemDescriptions: Record<string, string> = {
  'generic': 'Cadre neutre pour importer un scénario sans règles imposées.',
  'brp': 'Système percentile classique axé sur les compétences et la progression réaliste.',
  'dnd-5e': 'Fantasy héroïque centrée sur les classes, combats et sorts.',
  'coc-7e': 'Horreur lovecraftienne fondée sur l\'enquête et la fragilité mentale.',
  'fate-core': 'Système narratif souple basé sur les aspects et la fiction.',
  'pbta': 'Jeu propulsé par des moves, conséquences et fiction partagée.',
  'savage-worlds': 'Système pulp rapide et explosif orienté action, atouts et relances.',
  'yze': 'Moteur de survie et tension utilisant des poignées de dés.',
}

const gameSystemOptions = computed(() =>
  props.gameSystems.map((s) => ({
    label: systemLabels[s.id] ?? s.id,
    value: s.id,
    description: systemDescriptions[s.id] ?? 'Description du système non disponible.',
  })),
)

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
  <form
    :class="[
      'olw-import-upload-form', 
      'flex',
      'flex-col',
      'gap-6',
      'w-full',
      'border',
      'border-outline-variant',
      'rounded-xl',
      'p-8',
      'bg-surface-container'
    ]"
    @submit="onSubmit">
    <!-- Système de jeu -->
    <div
      :class="[
        'flex',
        'flex-col',
        'gap-2'
      ]">
      <label 
        :class="[
          'font-label',
          'text-xs',
          'uppercase',
          'tracking-widest',
          'text-on-surface',
          'opacity-60'
        ]">Système de jeu</label>
      <Select
        v-model="selectedGameSystemId"
        :disabled="loading"
        :options="gameSystemOptions"
        placeholder="— Choisir un système —"
        option-value="value"
        option-label="label"
      >
        <template #option="slotProps">
          <div
            :class="[
              'flex',
              'flex-col', 
              'gap-2'
            ]">
            <span>{{ slotProps.option.label }}</span>
            <span
              v-if="slotProps.option.description"
              :class="['text-xs', 'text-on-surface', 'opacity-60']">
              {{ slotProps.option.description }}
            </span>
          </div>
        </template>
      </Select>
    </div>

    <!-- Zone drag & drop -->
    <div 
      :class="[
        'flex',
        'flex-col',
        'gap-1',
      ]">
      <label
        :class="[
          'font-label',
          'text-xs',
          'uppercase',
          'tracking-widest',
          'text-on-surface',
          'opacity-60'
        ]">Fichier PDF</label>
      <label
        :class="[
          'relative',
          'flex',
          'flex-col',
          'items-center',
          'justify-center',
          'gap-1',
          'px-6',
          'py-8',
          'bg-surface-container',
          'border-2',
          'border-dashed',
          'border-outline-variant',
          'rounded-xl',
          'cursor-pointer',
          'transition-colors',
          'text-center',
          'hover:border-primary',
          'hover:bg-[color-mix(in_srgb,var(--color-primary)_6%,var(--color-surface-container))]',
          { 
            'border-primary bg-[color-mix(in_srgb,var(--color-primary)_6%,var(--color-surface-container))]': isDragging,             
            'border-solid border-primary': selectedFile 
          }]"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop.prevent="onDrop"
      >
        <input
          type="file"
          accept="application/pdf"
          :class="[
            'absolute',
            'inset-0',
            'opacity-0',
            'cursor-pointer',
            'w-full',
            'h-full'
          ]"
          :disabled="loading"
          @change="onFileInput"
        />
        <template v-if="selectedFile">
          <span
            :class="[
              'material-symbols-outlined', 
              'text-5xl',
              'opacity-100', 
              'text-primary'
            ]">picture_as_pdf</span>
          <span
            :class="[
              'text-[1rem]',
              'font-semibold',
              'text-on-surface',
              'break-all'
            ]">{{ selectedFile.name }}</span>
          <span 
            :class="[
              'text-xs',
              'text-on-surface',
              'opacity-50'
            ]">Cliquez ou déposez un autre fichier pour remplacer</span>
        </template>
        <template v-else>
          <span
            :class="[
              'material-symbols-outlined', 
              'text-5xl',
              'opacity-40',
            ]">upload_file</span>
          <span
            :class="[
              'text-[1rem]',
              'text-on-surface',
            ]">Déposez votre PDF ici</span>
          <span
            :class="[
              'text-xs', 
              'text-on-surface', 
              'opacity-50'
            ]">ou cliquez pour parcourir</span>
        </template>
      </label>
    </div>

    <!-- Bouton submit -->
     <Button
        type="submit"
        :disabled="!canSubmit"
      >
      <ProgressSpinner 
        v-if="loading" 
        :class="[
          'w-5',
          'h-5'
        ]"/>
      <span v-else class="material-symbols-outlined">auto_stories</span>
      {{ loading ? 'Envoi en cours…' : 'Importer le scénario' }}
    </Button>
  </form>
</template>
