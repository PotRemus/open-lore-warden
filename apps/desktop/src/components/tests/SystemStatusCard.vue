<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { fetchHealth, type SidecarStatus } from '@/api/health-api-client'

const { t } = useI18n()

const status = ref<SidecarStatus | null>(null)
const loading = ref(true)

async function refresh() {
  loading.value = true
  status.value = await fetchHealth()
  loading.value = false
}

onMounted(refresh)
</script>

<template>
  <div class="system-status-card">
    <div v-if="loading" class="status-row status--loading">
      <span class="indicator" />
      <span>{{ t('systemStatus.connecting') }}</span>
    </div>
    <div v-else-if="status?.connected" class="status-row status--ok">
      <span class="indicator indicator--ok" />
      <div class="status-info">
        <span class="label">{{ t('systemStatus.connected') }}</span>
        <span class="meta">{{ status.url }}</span>
        <span class="meta">v{{ status.version }}</span>
      </div>
      <button class="refresh-btn" @click="refresh">↻</button>
    </div>
    <div v-else class="status-row status--error">
      <span class="indicator indicator--error" />
      <div class="status-info">
        <span class="label">{{ t('systemStatus.unavailable') }}</span>
        <span class="meta">{{ status?.url }}</span>
        <span class="meta error-msg">{{ status?.error }}</span>
      </div>
      <button class="refresh-btn" @click="refresh">↻</button>
    </div>
  </div>
</template>

<style scoped>
.system-status-card {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fafafa;
  font-size: 0.85rem;
  gap: 0.5rem;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ccc;
  flex-shrink: 0;
}

.indicator--ok {
  background: #22c55e;
  box-shadow: 0 0 6px #22c55e88;
}

.indicator--error {
  background: #ef4444;
}

.status-info {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.label {
  font-weight: 600;
  color: #1a1a1a;
}

.meta {
  color: #666;
  font-size: 0.78rem;
}

.error-msg {
  color: #ef4444;
}

.refresh-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  color: #888;
  padding: 0 0.2rem;
  line-height: 1;
}

.refresh-btn:hover {
  color: #333;
}
</style>
