<script setup lang="ts">
import type { ImportSummary } from '@open-lore-warden/domain'
import ProgressSpinner from '@/volt/ProgressSpinner.vue'
import Tag from '@/volt/Tag.vue'
import Button from '@/volt/Button.vue'

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
  <section
    :class="[
      'olw-import-history-list', 
      'bg-surface-container', 
      'p-8', 
      'rounded-xl', 
      'relative', 
      'shadow-xl', 
      'overflow-hidden', 
      'border', 
      'border-outline-variant/10'
    ]">
    <div
      :class="[
        'absolute', 
        'top-0', 
        'left-0', 
        'w-1', 
        'h-full', 
        'bg-secondary/50'
      ]"></div>
    <div
      :class="[
        'flex', 
        'justify-between', 
        'items-end', 
        'mb-8'
      ]">
      <h3
        :class="[
          'font-headline', 
          'text-2xl', 
          'flex', 
          'items-center', 
          'gap-2'
        ]">
        <span class="material-symbols-outlined title-icon">history</span>
        Campagnes importées
        <span
          v-if="imports.length > 0" 
          :class="[
            'flex', 
            'items-center', 
            'justify-center', 
            'rounded-full', 
            'bg-surface-container-high', 
            'p-1.5', 
            'w-7', 
            'h-7'
          ]">{{ imports.length }}</span>
      </h3>
    </div>

    <!-- Chargement initial -->
    <div
      v-if="loading" 
      :class="[
        'flex',
        'items-center', 
        'gap-4',
        'my-4'
      ]">
      <ProgressSpinner
        v-if="loading" 
        :class="[
          'w-6',
          'h-6'
        ]" />
      <span
        :class="[
          'text-sm',
          'text-on-surface',
          'opacity-50'
        ]">Chargement…</span>
    </div>

    <!-- Liste vide -->
    <p
      v-else-if="imports.length === 0" 
      :class="[
        'flex',
        'items-center', 
        'gap-2',
        'text-sm',
        'text-on-surface',
        'opacity-40',
        'italic',
        'my-4'
      ]">
      <span
        :class="[
          'material-symbols-outlined', 
          'text-lg'
        ]">inbox</span>
      Aucun scénario importé pour l'instant.
    </p>

    <!-- Liste -->
    <ul
      v-else :class="[
        'list-none',
        'm-0',
        'p-0',
        'flex',
        'flex-col',
        'gap-2'
      ]">
      <li
        v-for="item in imports" :key="item.id" 
        :class="[
          'flex',
          'items-center',
          'gap-4',
          'p-3',
          'bg-surface-container',
          'border',
          'border-outline-variant',
          'rounded-xl',
          'transition-colors',
          'hover:border-primary/40'
        ]">
        <!-- Badges + titre -->
        <div
          :class="[
            'flex-1',
            'min-w-0',
            'flex',
            'flex-col',
            'gap-1'
          ]">
          <div
            :class="[
              'flex',
              'flex-wrap',
              'gap-1',
              'mb-0.5'
            ]">
            <Tag
              v-if="item.genre"
              severity="info"
              :class="[
                'font-label',
                'text-xs',                
                'uppercase',
              ]">{{ item.genre }}</Tag>
            <Tag
              v-if="item.theme" 
              severity="warn"
              :class="[
                'font-label',
                'text-xs',
                'uppercase',
              ]">{{ item.theme }}</Tag>
          </div>
          <p
            :class="[
              'font-semibold',
              'm-0',
              'text-on-surface',
              'whitespace-nowrap',
              'overflow-hidden',
              'text-ellipsis'
            ]">{{ item.title }}</p>
          <p
            :class="[
              'text-sm',
              'text-on-surface',
              'opacity-60',
              'm-0',
              'line-clamp-2',
            ]">{{ item.summary }}</p>
        </div>

        <!-- Bouton Éditer -->
        <Button
          :class="[
            { 'opacity-70': loadingImportId === item.id }
          ]"
          :disabled="loadingImportId !== null"
          variant="outlined"
          size="small"
          @click="emit('open', item.id)"
        >
          <ProgressSpinner 
            v-if="loadingImportId === item.id" 
            :class="[
              'w-5',
              'h-5'
            ]"/>
          <span
            v-else 
            :class="[
              'material-symbols-outlined',
              'text-sm'
            ]">edit</span>
            {{ loadingImportId === item.id ? 'Chargement…' : 'Éditer' }}
        </Button>
      </li>
    </ul>
  </section>
</template>
