<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ModelStatusBar from './ModelStatusBar.vue';

defineProps<{
  appTitle: string
  activePage: string
}>()

const emit = defineEmits<{
  navigate: [page: string]
}>()

const { t } = useI18n()

const navItems = computed(() => [
  { label: t('nav.tableview'), page: 'tableview' },
  { label: t('nav.scene'),     page: 'scene'     },
  { label: t('nav.characters'),page: 'characters'},
  { label: t('nav.journal'),   page: 'journal'   },
])
</script>

<template>
  <nav
    class="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-8 py-4 bg-surface/60 backdrop-blur-xl shadow-2xl shadow-black/50 border-b-0"
  >
    <div class="flex items-center gap-6">
      <span
        class="text-2xl font-bold text-primary drop-shadow-[0_0_8px_rgba(148,204,255,0.3)] font-headline tracking-tight"
      >
        {{ appTitle }}
      </span>
      <div class="hidden md:flex gap-6 ml-8">
        <a
          v-for="item in navItems"
          :key="item.page"
          class="font-headline tracking-tight cursor-pointer transition-colors"
          :class="
            activePage === item.page
              ? 'text-primary border-b border-primary/50 pb-1'
              : 'text-surface-variant hover:text-primary/70'
          "
          @click="emit('navigate', item.page)"
        >
          {{ item.label }}
        </a>
      </div>
      <ModelStatusBar />
    </div>

    <!-- Bottom gradient separator -->
    <div class="absolute bottom-0 left-0 h-px w-full bg-linear-to-r from-transparent via-primary/20 to-transparent">
      <!-- Quick action or player list (reserved) -->
    </div>
  </nav>
</template>
