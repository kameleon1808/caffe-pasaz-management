/**
 * @file src/pages/PlaceholderPage.tsx
 * @description Privremena placeholder stranica za buduće faze razvoja.
 *              Temporary placeholder page for future development phases.
 *
 * Koristi se za sve rute koje još uvek nisu implementirane.
 * Used for all routes that have not yet been implemented.
 */

import { useTranslation } from 'react-i18next'

/**
 * Props za PlaceholderPage.
 * Props for PlaceholderPage.
 */
interface PlaceholderPageProps {
  /** i18n ključ za naslov stranice / i18n key for page title */
  titleKey: string
  /** Emoji ikonina / Emoji icon */
  icon:     string
}

/**
 * Placeholder stranica prikazana dok se funkcionalnost ne implementira.
 * Placeholder page displayed while functionality is not yet implemented.
 *
 * @param {PlaceholderPageProps} props - Props komponente / Component props
 * @returns {JSX.Element} Placeholder stranica / Placeholder page
 */
export function PlaceholderPage({ titleKey, icon }: PlaceholderPageProps) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="text-center">
        <div className="text-8xl mb-6 opacity-30">{icon}</div>
        <h1 className="text-2xl font-bold text-white mb-2">
          {t(titleKey)}
        </h1>
        <p className="text-gray-500 text-sm max-w-xs">
          Ova stranica biće implementirana u narednoj fazi razvoja.<br />
          <span className="text-gray-600">This page will be implemented in the next development phase.</span>
        </p>
        <div className="
          mt-6 inline-flex items-center gap-2
          px-4 py-2 rounded-full
          bg-primary-500/10 border border-primary-500/20
          text-primary-400 text-xs font-medium
        ">
          🚧 U razvoju / In development
        </div>
      </div>
    </div>
  )
}
