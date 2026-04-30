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
  <div class="result-view">
    <!-- Header campagne -->
    <ImportCampaignHeader
      :result="result"
      :pending-count="pendingCount"
      @generate-all="emit('generateAllImages')"
    />

    <!-- Scénarios -->
    <div v-if="result.scenarios.length > 0" class="scenarios-list">
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
    <p v-else class="no-scenarios">
      Aucun scénario trouvé dans ce PDF.
    </p>
  </div>
</template>

<style scoped>
.result-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
}

.scenarios-list {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.no-scenarios {
  font-family: var(--font-body);
  font-size: 0.9375rem;
  color: var(--color-on-surface);
  opacity: 0.5;
  margin: 0;
  font-style: italic;
}
</style>
