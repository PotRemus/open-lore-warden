<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { fetchCampaigns, createCampaign } from '@/api/campaigns-api-client'
import { Campaign } from '@open-lore-warden/domain'

const { t } = useI18n()

const campaigns = ref<Campaign[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const showForm = ref(false)
const form = ref({ name: '', system: '', setting: '' })
const submitting = ref(false)

async function load() {
  loading.value = true
  error.value = null
  try {
    campaigns.value = await fetchCampaigns()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erreur inconnue'
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (!form.value.name.trim() || !form.value.system.trim()) return
  submitting.value = true
  try {
    const campaign = await createCampaign({
      name: form.value.name.trim(),
      system: form.value.system.trim(),
      setting: form.value.setting.trim() || undefined,
    })
    campaigns.value.unshift(campaign)
    form.value = { name: '', system: '', setting: '' }
    showForm.value = false
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erreur inconnue'
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="campaign-list">
    <div class="campaign-list__header">
      <h2>{{ t('campaigns.title') }}</h2>
      <button class="btn-new" @click="showForm = !showForm">
        {{ showForm ? t('campaigns.cancel') : t('campaigns.newCampaign') }}
      </button>
    </div>

    <form v-if="showForm" class="campaign-form" @submit.prevent="submit">
      <label>
        {{ t('campaigns.form.name') }}
        <input v-model="form.name" type="text" :placeholder="t('campaigns.form.namePlaceholder')" required />
      </label>
      <label>
        {{ t('campaigns.form.system') }}
        <input v-model="form.system" type="text" :placeholder="t('campaigns.form.systemPlaceholder')" required />
      </label>
      <label>
        {{ t('campaigns.form.setting') }}
        <input v-model="form.setting" type="text" :placeholder="t('campaigns.form.settingPlaceholder')" />
      </label>
      <button type="submit" class="btn-submit" :disabled="submitting">
        {{ submitting ? t('campaigns.form.submitting') : t('campaigns.form.submit') }}
      </button>
    </form>

    <p v-if="error" class="campaign-error">{{ error }}</p>

    <p v-if="loading" class="campaign-empty">{{ t('campaigns.loading') }}</p>

    <p v-else-if="campaigns.length === 0 && !showForm" class="campaign-empty">
      {{ t('campaigns.empty') }}
    </p>

    <ul v-else class="campaign-items">
      <li v-for="c in campaigns" :key="c.id" class="campaign-item">
        <div class="campaign-item__name">{{ c.name }}</div>
        <div class="campaign-item__meta">
          <span class="tag">{{ c.system }}</span>
          <span v-if="c.setting" class="setting">{{ c.setting }}</span>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.campaign-list {
  margin-top: 1.5rem;
}

.campaign-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.campaign-list__header h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.btn-new {
  font-size: 0.85rem;
  padding: 0.3rem 0.75rem;
  border: 1px solid #396cd8;
  border-radius: 6px;
  background: transparent;
  color: #396cd8;
  cursor: pointer;
}

.btn-new:hover {
  background: #396cd8;
  color: #fff;
}

.campaign-form {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 1rem;
  background: #fafafa;
}

.campaign-form label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
  color: #555;
}

.campaign-form input {
  padding: 0.4rem 0.6rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 0.9rem;
}

.btn-submit {
  align-self: flex-end;
  padding: 0.4rem 1rem;
  background: #396cd8;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.campaign-empty {
  color: #888;
  font-size: 0.9rem;
  text-align: center;
  padding: 1.5rem 0;
}

.campaign-error {
  color: #c0392b;
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
}

.campaign-items {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.campaign-item {
  padding: 0.75rem 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fff;
}

.campaign-item__name {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.campaign-item__meta {
  display: flex;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: #666;
}

.tag {
  background: #eef2ff;
  color: #396cd8;
  padding: 0.1rem 0.5rem;
  border-radius: 4px;
  font-weight: 500;
}

.setting {
  color: #888;
  font-style: italic;
}
</style>
