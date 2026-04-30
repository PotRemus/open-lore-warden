<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getLlmStatus, onLlmStatus, downloadPercent, formatBytes, type LlmStatus } from '@/api/llm-api-client'
import type { UnlistenFn } from '@tauri-apps/api/event'

const { t } = useI18n()

const status = ref<LlmStatus>({ type: 'idle' })
let unlisten: UnlistenFn | null = null

onMounted(async () => {
  status.value = await getLlmStatus()
  unlisten = await onLlmStatus((s) => {
    status.value = s
  })
})

onUnmounted(() => {
  unlisten?.()
})
</script>

<template>
  <div class="llm-status-card" :class="`llm-status--${status.type}`">

    <!-- Idle -->
    <template v-if="status.type === 'idle'">
      <span class="indicator indicator--idle" />
      <span class="label">{{ t('llmStatus.idle') }}</span>
    </template>

    <!-- Downloading -->
    <template v-else-if="status.type === 'downloading'">
      <span class="indicator indicator--progress" />
      <div class="status-body">
        <span class="label">{{ t('llmStatus.downloading') }}</span>
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: `${downloadPercent(status)}%` }"
          />
        </div>
        <span class="meta">
          {{ formatBytes(status.downloaded) }} / {{ formatBytes(status.total) }}
          ({{ downloadPercent(status) }}%)
        </span>
      </div>
    </template>

    <!-- Extracting -->
    <template v-else-if="status.type === 'extracting'">
      <span class="spinner spinner--sm" />
      <span class="label">{{ t('llmStatus.extracting') }}</span>
    </template>

    <!-- Starting — llama-server is running AND downloading the model from HF -->
    <template v-else-if="status.type === 'starting'">
      <span class="spinner spinner--sm" />
      <div class="status-body">
        <span class="label">{{ t('llmStatus.starting') }}</span>
        <span class="meta">{{ t('llmStatus.startingMeta') }}</span>
      </div>
    </template>

    <!-- Ready -->
    <template v-else-if="status.type === 'ready'">
      <span class="indicator indicator--ok" />
      <span class="label">{{ t('llmStatus.ready') }}</span>
    </template>

    <!-- Error -->
    <template v-else-if="status.type === 'error'">
      <span class="indicator indicator--error" />
      <div class="status-body">
        <span class="label">{{ t('llmStatus.error') }}</span>
        <span class="meta error-msg">{{ status.message }}</span>
      </div>
    </template>

  </div>
</template>

<style scoped>
.llm-status-card {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 0.875rem;
  background: #fafafa;
}

.status-body {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.label {
  font-weight: 500;
}

.meta {
  font-size: 0.78rem;
  color: #777;
}

.error-msg {
  color: #c0392b;
}

/* Indicator dot */
.indicator {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.indicator--idle    { background: #bbb; }
.indicator--progress { background: #3498db; }
.indicator--ok      { background: #27ae60; }
.indicator--error   { background: #e74c3c; }

/* Spinner */
.spinner {
  flex-shrink: 0;
  border-radius: 50%;
  border: 2px solid #e0e0e0;
  border-top-color: #396cd8;
  animation: spin 0.8s linear infinite;
}

.spinner--sm {
  width: 14px;
  height: 14px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Progress bar */
.progress-bar {
  height: 6px;
  background: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
  min-width: 160px;
}

.progress-fill {
  height: 100%;
  background: #396cd8;
  border-radius: 3px;
  transition: width 0.2s ease;
}

/* Border colour variants */
.llm-status--ready  { border-color: #a8e6b4; background: #f4fbf6; }
.llm-status--error  { border-color: #f5b7b1; background: #fdf3f2; }
.llm-status--starting { border-color: #aed6f1; background: #eaf4fb; }
</style>
