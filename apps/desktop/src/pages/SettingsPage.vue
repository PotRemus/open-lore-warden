<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '@/stores/settings.store'

const { t, locale } = useI18n()
const settingsStore = useSettingsStore()

const isDev = import.meta.env.DEV

const URL_REGEX = /^http:\/\/([\w.-]+):(\d{1,5})$/

function parseUrl(url: string): { host: string; port: number } | null {
  const match = url.trim().match(URL_REGEX)
  if (!match) return null
  const port = parseInt(match[2], 10)
  if (port < 1 || port > 65535) return null
  return { host: match[1], port }
}

const sidecarUrl = ref(`http://${settingsStore.sidecarHost}:${settingsStore.sidecarPort}`)
const llmUrl = ref(`http://${settingsStore.llmHost}:${settingsStore.llmPort}`)
const sdUrl = ref(`http://${settingsStore.sdHost}:${settingsStore.sdPort}`)

const sidecarUrlError = ref('')
const llmUrlError = ref('')
const sdUrlError = ref('')

const saving = ref(false)
const saved = ref(false)
const restartRequired = ref(false)
const restarting = ref(false)

function setLocale(lang: 'fr' | 'en') {
  locale.value = lang
  localStorage.setItem('locale', lang)
}

async function onSave() {
  sidecarUrlError.value = ''
  llmUrlError.value = ''
  sdUrlError.value = ''

  const parsedSidecar = parseUrl(sidecarUrl.value)
  const parsedLlm = parseUrl(llmUrl.value)
  const parsedSd = parseUrl(sdUrl.value)

  if (!parsedSidecar) sidecarUrlError.value = t('pages.settings.urlInvalid')
  if (!parsedLlm) llmUrlError.value = t('pages.settings.urlInvalid')
  if (!parsedSd) sdUrlError.value = t('pages.settings.urlInvalid')
  if (!parsedSidecar || !parsedLlm || !parsedSd) return

  saving.value = true
  saved.value = false
  try {
    await settingsStore.saveSettings({
      sidecarHost: parsedSidecar.host,
      sidecarPort: parsedSidecar.port,
      llmHost: parsedLlm.host,
      llmPort: parsedLlm.port,
      sdHost: parsedSd.host,
      sdPort: parsedSd.port,
    })
    saved.value = true
    restartRequired.value = true
  } finally {
    saving.value = false
  }
}

function resetDefaults() {
  sidecarUrl.value = 'http://127.0.0.1:3000'
  llmUrl.value = 'http://127.0.0.1:8080'
  sdUrl.value = 'http://127.0.0.1:8081'
  sidecarUrlError.value = ''
  llmUrlError.value = ''
  sdUrlError.value = ''
}

async function onRestart() {
  restarting.value = true
  await settingsStore.restartApp()
}
</script>

<template>
  <div class="p-8 max-w-xl">
    <h1 class="font-headline text-3xl text-primary mb-2">{{ t('pages.settings.title') }}</h1>
    <!-- <p class="text-on-surface/60 font-body mb-10">{{ t('pages.settings.subtitle') }}</p> -->

    <!-- Bannière redémarrage requis -->
    <div
      v-if="restartRequired"
      class="mb-8 flex items-center justify-between gap-4 rounded-xl bg-secondary-container/30 border border-secondary px-5 py-3"
    >
      <p class="font-body text-sm text-secondary">{{ t('pages.settings.restartRequired') }}</p>
      <button
        class="px-4 py-1.5 rounded-lg font-label text-sm bg-secondary text-on-secondary transition-opacity"
        :class="restarting ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'"
        :disabled="restarting"
        @click="onRestart"
      >
        {{ restarting ? t('pages.settings.restarting') : t('pages.settings.restart') }}
      </button>
    </div>

    <!-- Section langue -->
    <section class="mb-10">
      <h2 class="font-headline text-sm uppercase tracking-widest text-on-surface/50 mb-4">
        {{ t('pages.settings.language') }}
      </h2>
      <div class="flex gap-3">
        <button
          class="px-5 py-2 rounded-lg font-label text-sm border transition-all"
          :class="
            locale === 'fr'
              ? 'bg-primary text-on-primary border-primary'
              : 'border-surface-variant text-on-surface/70 hover:border-primary/50 hover:text-primary'
          "
          @click="setLocale('fr')"
        >
          {{ t('pages.settings.languageFr') }}
        </button>
        <button
          class="px-5 py-2 rounded-lg font-label text-sm border transition-all"
          :class="
            locale === 'en'
              ? 'bg-primary text-on-primary border-primary'
              : 'border-surface-variant text-on-surface/70 hover:border-primary/50 hover:text-primary'
          "
          @click="setLocale('en')"
        >
          {{ t('pages.settings.languageEn') }}
        </button>
      </div>
    </section>

    <!-- Section sidecar -->
    <section class="mb-10">
      <h2 class="font-headline text-sm uppercase tracking-widest text-on-surface/50 mb-4">
        {{ t('pages.settings.sidecarSection') }}
      </h2>
      <!-- Note visible uniquement en dev mode -->
      <p v-if="isDev" class="mb-4 px-4 py-2.5 rounded-lg font-body text-xs text-on-surface/60 bg-surface-container border border-surface-variant/50">
        {{ t('pages.settings.sidecarDevNote') }}
      </p>
      <label class="flex items-center gap-4">
        <span class="font-label text-sm text-on-surface/70 w-16 shrink-0">{{ t('pages.settings.url') }}</span>
        <div class="flex-1">
          <input
            v-model="sidecarUrl"
            type="text"
            placeholder="http://127.0.0.1:3000"
            class="w-full px-3 py-2 rounded-lg font-body text-sm bg-surface-container border text-on-surface focus:outline-none transition-colors"
            :class="sidecarUrlError ? 'border-error focus:border-error' : 'border-surface-variant focus:border-primary'"
          />
          <p v-if="sidecarUrlError" class="mt-1.5 font-body text-xs text-error">
            {{ sidecarUrlError }}
          </p>
        </div>
      </label>
    </section>

    <!-- Section LLM -->
    <section class="mb-10">
      <h2 class="font-headline text-sm uppercase tracking-widest text-on-surface/50 mb-4">
        {{ t('pages.settings.llmSection') }}
      </h2>
      <label class="flex items-center gap-4">
        <span class="font-label text-sm text-on-surface/70 w-16 shrink-0">{{ t('pages.settings.url') }}</span>
        <div class="flex-1">
          <input
            v-model="llmUrl"
            type="text"
            placeholder="http://127.0.0.1:8080"
            class="w-full px-3 py-2 rounded-lg font-body text-sm bg-surface-container border text-on-surface focus:outline-none transition-colors"
            :class="llmUrlError ? 'border-error focus:border-error' : 'border-surface-variant focus:border-primary'"
          />
          <p v-if="llmUrlError" class="mt-1.5 font-body text-xs text-error">
            {{ llmUrlError }}
          </p>
        </div>
      </label>
    </section>

    <!-- Section Stable Diffusion -->
    <section class="mb-10">
      <h2 class="font-headline text-sm uppercase tracking-widest text-on-surface/50 mb-4">
        {{ t('pages.settings.sdSection') }}
      </h2>
      <p class="mb-4 px-4 py-2.5 rounded-lg font-body text-xs text-on-surface/60 bg-surface-container border border-surface-variant/50">
        {{ t('pages.settings.sdNote') }}
      </p>
      <label class="flex items-center gap-4">
        <span class="font-label text-sm text-on-surface/70 w-16 shrink-0">{{ t('pages.settings.url') }}</span>
        <div class="flex-1">
          <input
            v-model="sdUrl"
            type="text"
            placeholder="http://127.0.0.1:8081"
            class="w-full px-3 py-2 rounded-lg font-body text-sm bg-surface-container border text-on-surface focus:outline-none transition-colors"
            :class="sdUrlError ? 'border-error focus:border-error' : 'border-surface-variant focus:border-primary'"
          />
          <p v-if="sdUrlError" class="mt-1.5 font-body text-xs text-error">
            {{ sdUrlError }}
          </p>
        </div>
      </label>
    </section>

    <!-- Actions -->
    <div class="flex items-center gap-4">
      <button
        class="px-6 py-2.5 rounded-lg font-label text-sm bg-primary text-on-primary transition-opacity"
        :class="saving ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'"
        :disabled="saving"
        @click="onSave"
      >
        {{ saving ? t('pages.settings.saving') : saved ? t('pages.settings.saved') : t('pages.settings.save') }}
      </button>
      <button
        class="px-4 py-2.5 rounded-lg font-label text-sm border border-surface-variant text-on-surface/70 hover:border-primary/50 hover:text-primary transition-all"
        @click="resetDefaults"
      >
        {{ t('pages.settings.resetDefaults') }}
      </button>
    </div>
  </div>
</template>
