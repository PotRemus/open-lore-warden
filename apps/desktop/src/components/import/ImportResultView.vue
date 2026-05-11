<script setup lang="ts">
import { computed } from 'vue'
import type { CampaignImportResult } from '@open-lore-warden/domain'
import type { ImageGenState, ScenarioRegenerationState } from './types'
import ImportCampaignHeader from './ImportCampaignHeader.vue'
import ImportScenarioCard from './ImportScenarioCard.vue'

const props = defineProps<{
  result: CampaignImportResult
  imageGenStates: Record<string, ImageGenState>
  scenarioRegenStates: Record<string, ScenarioRegenerationState>
  regenerationLocked: boolean
}>()

const emit = defineEmits<{
  generateImage: [itemId: string]
  generateAllImages: []
  regenerateScenario: [scenarioId: string]
}>()

const pendingCount = computed(() => {
  let count = 0
  for (const scenario of props.result.scenarios) {
    for (const loc of scenario.locations) {
      if (!loc.imagePath) count++
    }
    for (const npc of scenario.npcs) {
      if (!npc.imagePath) count++
    }
  }
  return count
})
</script>

<template>
  <div class="olw-import-result-view flex flex-col gap-6 w-full">
    <!-- Header campagne -->
    <ImportCampaignHeader
      :result="result"
      :pending-count="pendingCount"
      @generate-all="emit('generateAllImages')"
    />

    <!-- Scénarios -->
    <div v-if="result.scenarios.length > 0" class="scenarios-list flex flex-col gap-5">
      <ImportScenarioCard
        v-for="(scenario, idx) in result.scenarios"
        :key="scenario.id"
        :scenario="scenario"
        :scenario-index="idx"
        :image-gen-states="imageGenStates"
        :scenario-regeneration-state="scenarioRegenStates[scenario.id]"
        :regeneration-locked="regenerationLocked"
        @generate-image="(itemId) => emit('generateImage', itemId)"
        @regenerate-scenario="(scenarioId) => emit('regenerateScenario', scenarioId)"
      />
    </div>
    <p v-else class="color-on-surface text-sm italic m-0 opacity-50">
      Aucun scénario trouvé dans ce PDF.
    </p>
  </div>
</template>
