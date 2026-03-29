/**
 * @file src/components/ui/EmptyState.tsx
 * @description Komponenta za prikaz praznog stanja (nema podataka).
 *              Component for displaying empty state (no data).
 *
 * Upotreba / Usage:
 * ```tsx
 * // Osnovno / Basic
 * <EmptyState title="Nema proizvoda" description="Dodajte prvi proizvod da počnete." />
 *
 * // Sa dugmetom za akciju / With action button
 * <EmptyState
 *   title="Nema kategorija"
 *   description="Kreirajte prvu kategoriju."
 *   action={{ label: 'Dodaj kategoriju', onClick: () => setOpen(true) }}
 * />
 *
 * // Za pretragu / For search
 * <EmptyState
 *   variant="search"
 *   title={`Nema rezultata za "${query}"`}
 * />
 *
 * // Za izveštaje / For reports
 * <EmptyState variant="report" title="Nema podataka za izabrani period" />
 * ```
 */

import { ReactNode } from 'react'

/** Varijante praznog stanja / Empty state variants */
export type EmptyStateVariant = 'default' | 'search' | 'report' | 'error'

/** Akcija koja se prikazuje ispod poruke / Action shown below the message */
export interface EmptyStateAction {
  label:   string
  onClick: () => void
}

export interface EmptyStateProps {
  /** Naslov poruke / Title message */
  title:        string
  /** Opis (opciono) / Description (optional) */
  description?: string
  /** Varijanta ikone / Icon variant */
  variant?:     EmptyStateVariant
  /** Akcijsko dugme (opciono) / Action button (optional) */
  action?:      EmptyStateAction
  /** Prilagođena ikona / Custom icon */
  icon?:        ReactNode
  /** Prilagođena CSS klasa / Custom CSS class */
  className?:   string
}

/** Ikonice po varijanti / Icons by variant */
const ICONS: Record<EmptyStateVariant, ReactNode> = {
  default: (
    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  ),
  search: (
    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  report: (
    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  error: (
    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  ),
}

/**
 * Komponenta za prazno stanje sa ikonom, naslovom i opcionalnom akcijom.
 * Empty state component with icon, title, and optional action.
 */
export function EmptyState({
  title,
  description,
  variant   = 'default',
  action,
  icon,
  className = '',
}: EmptyStateProps) {
  const iconEl = icon ?? ICONS[variant]

  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
      {/* Ikona / Icon */}
      <div className="text-white/20 mb-4">
        {iconEl}
      </div>

      {/* Naslov / Title */}
      <p className="text-base font-medium text-white/60 mb-2">{title}</p>

      {/* Opis / Description */}
      {description && (
        <p className="text-sm text-white/40 mb-6 max-w-sm">{description}</p>
      )}

      {/* Akcija / Action */}
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-primary-500 hover:bg-primary-500/80 text-black text-sm font-medium rounded-lg transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
