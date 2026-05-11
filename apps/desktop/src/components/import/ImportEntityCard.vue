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
  <article
    class="olw-import-entity-card flex flex-col bg-surface-container-high rounded-xl border border-outline-variant overflow-hidden transition-colors duration-150 hover:border-[color-mix(in_srgb,var(--color-primary)_40%,var(--color-outline-variant))]"
  >
    <!-- Zone image -->
    <div class="relative w-full aspect-square overflow-hidden bg-surface-container">
      <!-- Image générée -->
      <img
        v-if="imageSrc"
        :src="imageSrc"
        :alt="entity.name"
        class="w-full h-full object-cover block"
      />
      <!-- Overlay de regénération sur image existante -->
      <div
        v-if="imageSrc && isGenerating"
        class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[color-mix(in_srgb,var(--color-surface)_60%,transparent)] backdrop-blur-sm"
      >
        <span class="inline-block w-7 h-7 border-2 border-[color-mix(in_srgb,var(--color-primary)_30%,transparent)] border-t-primary rounded-full animate-[spin_0.8s_linear_infinite]" />
        <span class="font-label text-xs text-primary">Génération…</span>
      </div>
      <!-- Génération en cours (sans image existante) -->
      <div
        v-else-if="!imageSrc && isGenerating"
        class="w-full h-full flex flex-col items-center justify-center gap-2 bg-[color-mix(in_srgb,var(--color-primary)_6%,var(--color-surface-container))]"
      >
        <span class="inline-block w-7 h-7 border-2 border-[color-mix(in_srgb,var(--color-primary)_30%,transparent)] border-t-primary rounded-full animate-[spin_0.8s_linear_infinite]" />
        <span class="font-label text-xs text-primary">Génération…</span>
      </div>
      <!-- Placeholder -->
      <div v-else class="w-full h-full flex flex-col items-center justify-center gap-2">
        <span class="material-symbols-outlined text-[2.5rem] text-on-surface opacity-20">
          {{ placeholderIcon }}
        </span>
      </div>

      <!-- Badge type -->
      <span
        class="absolute top-2 left-2 font-label text-[0.625rem] font-bold tracking-[0.06em] uppercase py-[0.2rem] px-2 rounded-full bg-[color-mix(in_srgb,var(--color-surface)_75%,transparent)] text-on-surface backdrop-blur"
      >
        {{ entityType === 'npc' ? 'PNJ' : 'Lieu' }}
      </span>
    </div>

    <!-- Contenu texte -->
    <div class="p-3 flex flex-col gap-1 flex-1">
      <p class="font-body text-[0.9375rem] font-semibold text-on-surface m-0">{{ entity.name }}</p>
      <p v-if="npcEntity" class="font-body text-xs text-primary m-0 italic">{{ npcEntity.role }}</p>
      <p class="font-body text-[0.8125rem] text-on-surface opacity-[0.65] m-0 leading-normal line-clamp-3">
        {{ entity.description }}
      </p>
    </div>

    <!-- Actions -->
    <div v-if="canGenerate || hasError" class="py-2.5 px-3 border-t border-outline-variant flex flex-col gap-1.5">
      <button
        class="inline-flex items-center gap-1.5 py-1.5 px-3 bg-transparent text-primary border border-[color-mix(in_srgb,var(--color-primary)_40%,transparent)] rounded-lg font-label text-xs font-semibold cursor-pointer transition-[background-color,border-color] duration-150 w-full justify-center hover:bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] hover:border-primary"
        @click="emit('generateImage')"
      >
        <span class="material-symbols-outlined text-base">{{ (!isRegenerate && !hasError) ? 'image' : 'refresh' }}</span>
        {{ hasError ? 'Réessayer' : (isRegenerate ? 'Regénérer' : 'Générer l\'image') }}
      </button>
      <p v-if="hasError && genState?.error" class="font-body text-[0.6875rem] text-error m-0">
        {{ genState.error }}
      </p>
    </div>
  </article>
</template>
