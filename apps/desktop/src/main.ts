import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@/assets/main.css'
import App from '@/App.vue'
import router from '@/router'
import { i18n } from '@/plugins/i18n'
import { useSettingsStore } from '@/stores/settings.store'

async function main() {
  const pinia = createPinia()
  const app = createApp(App).use(pinia).use(router).use(i18n)
  await useSettingsStore().init()
  app.mount('#app')
}

main()
