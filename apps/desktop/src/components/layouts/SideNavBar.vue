<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

withDefaults(
  defineProps<{
    campaignTitle: string
    activePage: string
    aiStatus?: 'ready' | 'loading' | 'error'
  }>(),
  { aiStatus: 'loading' },
)

const emit = defineEmits<{
  navigate: [page: string]
}>()

const { t } = useI18n()

const navItems = computed(() => [
  { label: t('nav.home'),       page: 'home',       icon: 'fort'           },
  { label: t('nav.tableview'),  page: 'tableview',  icon: 'grid_view'      },
  { label: t('nav.scene'),      page: 'scene',      icon: 'theater_comedy' },
  { label: t('nav.characters'), page: 'characters', icon: 'group'          },
  { label: t('nav.journal'),    page: 'journal',    icon: 'menu_book'      },
  { label: t('nav.import'),     page: 'import',     icon: 'upload_file'    },
  { label: t('nav.settings'),   page: 'settings',   icon: 'settings'       },
  { label: t('nav.test'),       page: 'test',       icon: 'science'        },
])

const aiStatusLabel = computed<Record<string, string>>(() => ({
  ready: t('nav.aiReady'),
  loading: t('nav.aiLoading'),
  error: t('nav.aiError'),
}))
</script>

<template>
  <aside
    class="fixed left-0 top-0 h-full flex flex-col z-40 bg-surface-container-low w-64 border-r border-surface-variant/15 shadow-[40px_0_40px_rgba(0,0,0,0.4)] pt-24"
  >
    <!-- Campaign info -->
    <div class="px-6 mb-8">
      <div class="flex items-center gap-3 mb-6">
        <div
          class="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center border border-primary/20"
        >
          <span
            class="material-symbols-outlined text-primary"
            style="font-variation-settings: 'FILL' 1;"
          >fort</span>
        </div>
        <div>
          <h2 class="font-headline text-xl text-[#4A90E2] leading-tight">{{ campaignTitle }}</h2>
          <p class="font-label uppercase tracking-widest text-[10px] text-primary/60">{{ t('nav.campaignActive') }}</p>
        </div>
      </div>

      <!--
      <button
        class="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary py-2 rounded-lg font-label uppercase tracking-widest text-xs font-bold transition-all hover:shadow-[0_0_15px_rgba(148,204,255,0.4)] active:scale-[0.98]"
      >
        Roll Initiative
      </button>
      -->
    </div>

    <!-- Navigation -->
    <nav class="flex-1 px-4 space-y-1">
      <div
        v-for="item in navItems"
        :key="item.page"
        class="group px-4 py-3 flex items-center gap-3 transition-all duration-500 cursor-pointer"
        :class="
          activePage === item.page
            ? 'bg-linear-to-r from-primary/10 to-transparent text-primary border-l-2 border-primary'
            : 'opacity-80 hover:translate-x-1 hover:text-primary'
        "
        @click="emit('navigate', item.page)"
      >
        <span
          class="material-symbols-outlined text-lg"
          :style="activePage === item.page ? `font-variation-settings: 'FILL' 1;` : ''"
        >{{ item.icon }}</span>
        <span class="font-label uppercase tracking-widest text-[10px]">{{ item.label }}</span>
      </div>
    </nav>

    <!-- Footer -->
    <div class="mt-auto px-6 py-6 border-t border-surface-variant/15 space-y-4">
      <!--
      <div class="flex items-center justify-between group cursor-pointer">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-xs text-primary/60">group</span>
          <span
            class="font-label uppercase tracking-widest text-[10px] text-on-surface/60 group-hover:text-primary transition-colors"
          >Connected Players</span>
        </div>
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]"></span>
      </div>
      -->
      <div class="flex items-center justify-between group cursor-pointer">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-xs text-primary/60">psychology</span>
          <span
            class="font-label uppercase tracking-widest text-[10px] text-on-surface/60 group-hover:text-primary transition-colors"
          >{{ t('nav.aiStatus') }}</span>
        </div>
        <span class="font-label text-[8px] text-primary bg-primary/10 px-1 rounded">
          {{ aiStatusLabel[aiStatus] }}
        </span>
      </div>
    </div>
  </aside>
</template>
