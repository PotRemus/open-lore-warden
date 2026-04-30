<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import TopNavBar from '@/components/layouts/TopNavBar.vue'
import SideNavBar from '@/components/layouts/SideNavBar.vue'

const props = defineProps<{
  appTitle?: string
  campaignTitle?: string
}>()

const { t } = useI18n()

const appTitleDisplay = computed(() => props.appTitle ?? t('app.title'))
const campaignTitleDisplay = computed(() => props.campaignTitle ?? t('app.noCampaign'))

const route = useRoute()
const router = useRouter()

function navigate(page: string) {
  router.push({ name: page })
}
</script>

<template>
  <div class="h-screen bg-surface text-on-surface font-body overflow-hidden">
    <TopNavBar
      :app-title="appTitleDisplay"
      :active-page="String(route.name ?? '')"
      @navigate="navigate"
    />
    <SideNavBar
      :campaign-title="campaignTitleDisplay"
      :active-page="String(route.name ?? '')"
      @navigate="navigate"
    />
    <main class="ml-64 pt-20 h-screen flex overflow-hidden">
      <slot />
    </main>

    <!--
    Contextual FAB - Restricted to Archive Actions
    <div class="fixed bottom-8 right-8 z-50">
      <button
        class="bg-primary text-on-primary w-14 h-14 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all group"
      >
        <span class="material-symbols-outlined text-2xl group-hover:rotate-90 transition-transform duration-500">add</span>
      </button>
    </div>
    -->
  </div>
</template>
