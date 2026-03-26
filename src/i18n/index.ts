/**
 * @file src/i18n/index.ts
 * @description Konfiguracija react-i18next internacionalizacije.
 *              react-i18next internationalization configuration.
 *
 * Podržani jezici / Supported languages:
 * - 'sr' — Srpski (default)
 * - 'en' — English
 *
 * Korišćenje / Usage:
 * ```tsx
 * import { useTranslation } from 'react-i18next'
 * const { t, i18n } = useTranslation()
 * t('login.title')           // → 'Prijava' ili 'Login'
 * i18n.changeLanguage('en')  // → promeni jezik / change language
 * ```
 */

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import srTranslations from './sr.json'
import enTranslations from './en.json'

/**
 * Resursi za sve podržane jezike.
 * Resources for all supported languages.
 */
const resources = {
  sr: { translation: srTranslations },
  en: { translation: enTranslations }
}

/**
 * Učitava sačuvani jezik iz localStorage ili vraća default.
 * Loads saved language from localStorage or returns default.
 *
 * @returns {string} Kod jezika / Language code ('sr' | 'en')
 */
function getSavedLanguage(): string {
  try {
    const saved = localStorage.getItem('kafic_language')
    if (saved === 'sr' || saved === 'en') return saved
  } catch {
    // localStorage može biti nedostupan / localStorage might be unavailable
  }
  return 'sr' // srpski default / Serbian default
}

// Inicijalizacija i18next / i18next initialization
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng:        getSavedLanguage(),
    fallbackLng: 'sr',

    interpolation: {
      escapeValue: false // React već escape-uje / React already escapes
    },

    react: {
      useSuspense: false // isključi suspense da izbjegnemo loading state / disable suspense to avoid loading state
    }
  })

// Čuvaj jezičke preferencije pri svakoj promeni
// Save language preferences on every change
i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem('kafic_language', lng)
    // Postavi HTML lang atribut za accessibility / Set HTML lang attribute for accessibility
    document.documentElement.lang = lng
  } catch {
    // Ignoriši ako localStorage nije dostupan / Ignore if localStorage is unavailable
  }
})

export default i18n

/**
 * Lista podržanih jezika sa meta-podacima.
 * List of supported languages with metadata.
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'sr', label: 'Srpski', flag: '🇷🇸' },
  { code: 'en', label: 'English', flag: '🇬🇧' }
] as const

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code']
