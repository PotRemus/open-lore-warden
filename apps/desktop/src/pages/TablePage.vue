<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="p-8">
    <h1 class="font-headline text-3xl text-primary mb-2">{{ t('pages.tableview.title') }}</h1>
    <p class="text-on-surface/60 font-body">{{ t('pages.tableview.subtitle') }}</p>
  </div>
</template>
