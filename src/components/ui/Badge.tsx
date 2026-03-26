/**
 * @file src/components/ui/Badge.tsx
 * @description Statusne oznake (aktivan/neaktivan, nisko stanje).
 *              Status badges (active/inactive, low stock).
 *
 * @example
 * ```tsx
 * <Badge variant="active" />
 * <Badge variant="inactive" />
 * <Badge variant="low-stock" />
 * <Badge variant="custom" label="Novo" className="bg-purple-900 text-purple-300" />
 * ```
 */

import { useTranslation } from 'react-i18next'

/** Predefinisane varijante / Predefined variants */
export type BadgeVariant = 'active' | 'inactive' | 'low-stock' | 'custom'

export interface BadgeProps {
  variant:    BadgeVariant
  /** Prilagođeni tekst (za custom varijantu) / Custom text (for custom variant) */
  label?:     string
  /** Dodatne Tailwind klase (za custom varijantu) / Extra Tailwind classes (for custom variant) */
  className?: string
}

/**
 * Mala oznaka za prikaz statusa.
 * Small badge for displaying status.
 */
export function Badge({ variant, label, className }: BadgeProps) {
  const { t } = useTranslation()

  if (variant === 'active') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-900/60 text-green-400 border border-green-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
        {t('common.status_active')}
      </span>
    )
  }

  if (variant === 'inactive') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-white/5 text-white/40 border border-white/10">
        <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
        {t('common.status_inactive')}
      </span>
    )
  }

  if (variant === 'low-stock') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-900/60 text-red-400 border border-red-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
        {t('inventory.low_stock')}
      </span>
    )
  }

  // custom
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className ?? ''}`}>
      {label}
    </span>
  )
}
