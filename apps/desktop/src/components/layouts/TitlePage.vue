<script setup lang="ts">
const {
  category = undefined,
  title,
  description = undefined,
} = defineProps<{
  category?: string
  title: string
  description?: string
}>()
</script>

<template>
    <header class="mb-12">
        <div class="flex items-center gap-2 mb-2">
            <span v-if="category" class="font-label text-xs uppercase tracking-[0.2em] text-secondary">{{ category }}</span>
            <div class="h-px flex-1 bg-outline-variant/20"></div>
        </div>
        <h1 class="font-headline text-5xl text-on-surface drop-shadow-sm">{{ title }}</h1>
        <p v-if="description" class="font-body text-on-surface-variant max-w-2xl mt-4 leading-relaxed">
            {{ description }}
        </p>
    </header>
</template>
