<script setup lang="ts">
import { computed } from 'vue'
import type { CampaignImportResult } from '@open-lore-warden/domain'
import { getSidecarBaseUrl } from '@/stores/settings.store'
import Tag from '@/volt/Tag.vue'
import Button from '@/volt/Button.vue'

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
  <header class="olw-import-campaign-header relative min-h-112.5 rounded-xl border border-outline-variant overflow-hidden">
    <!-- Cover image (fond pleine largeur) -->
    <img
      v-if="coverSrc"
      :src="coverSrc"
      :alt="result.title"
      class="absolute inset-0 w-full h-full object-cover z-0"
    />
    <div
      v-else
      class="absolute inset-0 flex items-center justify-center bg-surface-container-high z-0"
    >
      <span class="material-symbols-outlined text-[4rem] text-white opacity-20">auto_stories</span>
    </div>

    <!-- Calque dégradé transparent → noir -->
    <div class="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_10%,var(--color-surface))] z-1" />

    <!-- Infos (positionnées sur la partie sombre) -->
    <div class="absolute bottom-0 left-0 right-0 pt-8 px-7 pb-6 z-2 flex flex-col gap-3">
      <div class="flex flex-wrap gap-1.5">
        <Tag
          v-if="result.genre"
          severity="info"
          class="font-label text-xs uppercase"
        >{{ result.genre }}</Tag>
        <Tag
          v-if="result.theme"
          severity="warn"
          class="font-label text-xs uppercase"
        >{{ result.theme }}</Tag>
        <Tag
          v-if="systemLabel"
          severity="secondary"
          class="font-label text-xs uppercase opacity-80"
        >{{ systemLabel }}</Tag>
      </div>

      <h1 class="font-headline text-[2rem] text-white m-0 leading-[1.2] [text-shadow:0_2px_12px_rgba(0,0,0,0.6)]">
        {{ result.title }}
      </h1>

      <p class="font-body text-[0.9375rem] text-white/80 leading-[1.6] m-0">
        {{ result.summary }}
      </p>

      <p class="flex items-center gap-1.5 font-body text-xs text-white/45 m-0">
        <span class="material-symbols-outlined text-base">picture_as_pdf</span>
        Source : {{ result.sourceFilename }}
      </p>

      <!-- Bouton global génération images -->
      <Button
        v-if="pendingCount > 0"
        class="inline-flex self-start"
        @click="emit('generateAll')"
      >
        <span class="material-symbols-outlined">image</span>
        Générer toutes les images
        <span class="inline-flex items-center justify-center min-w-5 h-5 px-1.5 bg-on-primary text-primary rounded-full text-[0.6875rem] font-bold">
          {{ pendingCount }}
        </span>
      </Button>
      <p v-else class="flex items-center gap-1.5 font-body text-sm text-primary m-0 mt-1">
        <span class="material-symbols-outlined">check_circle</span>
        Toutes les images ont été générées
      </p>
    </div>
  </header>
</template>
