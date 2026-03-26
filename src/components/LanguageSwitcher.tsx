/**
 * @file src/components/LanguageSwitcher.tsx
 * @description Komponenta za prebacivanje između srpskog i engleskog jezika.
 *              Component for switching between Serbian and English language.
 *
 * Čuva preferenciju u localStorage i primenjuje je pri sledećem pokretanju.
 * Saves preference to localStorage and applies it on next startup.
 */

import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES, type LanguageCode } from '../i18n'

/**
 * Dugme za prebacivanje jezika prikazano u headeru.
 * Language toggle button displayed in the header.
 *
 * @returns {JSX.Element} Language switcher komponenta / Language switcher component
 */
export function LanguageSwitcher() {
  const { i18n, t } = useTranslation()

  const currentLanguage = i18n.language as LanguageCode
  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === currentLanguage)
    ?? SUPPORTED_LANGUAGES[0]!

  /**
   * Menja aktivni jezik na sledeći u listi.
   * Changes the active language to the next one in the list.
   */
  const toggleLanguage = () => {
    const nextCode = currentLanguage === 'sr' ? 'en' : 'sr'
    void i18n.changeLanguage(nextCode)
  }

  return (
    <button
      onClick={toggleLanguage}
      title={t('header.language')}
      aria-label={`${t('header.language')}: ${currentLang.label}`}
      className="
        flex items-center gap-2 px-3 py-1.5
        bg-surface-input hover:bg-white/10
        text-gray-300 hover:text-white
        rounded-lg border border-white/10
        transition-all duration-200
        text-sm font-medium
        select-none
      "
    >
      <span className="text-base" role="img" aria-label={currentLang.label}>
        {currentLang.flag}
      </span>
      <span className="hidden sm:inline">{currentLang.label}</span>
    </button>
  )
}
