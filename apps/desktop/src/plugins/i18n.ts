import { createI18n } from 'vue-i18n'
import fr from '@/locales/fr.json'
import en from '@/locales/en.json'

type MessageSchema = typeof fr

function detectLocale(): 'fr' | 'en' {
  const stored = localStorage.getItem('locale')
  if (stored === 'fr' || stored === 'en') return stored
  return navigator.language.toLowerCase().startsWith('fr') ? 'fr' : 'en'
}

export const i18n = createI18n<[MessageSchema], 'fr' | 'en'>({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: 'en',
  messages: { fr, en },
})

declare module 'vue-i18n' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface DefineLocaleMessage extends MessageSchema {}
}

