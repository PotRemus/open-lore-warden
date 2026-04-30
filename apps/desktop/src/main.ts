import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@/assets/main.css'
import App from '@/App.vue'
import router from '@/router'
import { i18n } from '@/plugins/i18n'
import { useSettingsStore } from '@/stores/settings.store'
import PrimeVue from 'primevue/config';

async function main() {
  const pinia = createPinia()
  const app = createApp(App)
    .use(pinia)
    .use(router)
    .use(i18n)
    .use(PrimeVue, {
      unstyled: true,
    });
  await useSettingsStore().init()
  app.mount('#app')
}

main()
