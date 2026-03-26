/**
 * @file src/hooks/useToast.ts
 * @description Hook za prikazivanje toast notifikacija iz bilo koje komponente.
 *              Hook for showing toast notifications from any component.
 *
 * @example
 * ```tsx
 * const { showToast } = useToast()
 * showToast('Sačuvano!', 'success')
 * showToast('Greška!',   'error')
 * ```
 */

import { useContext } from 'react'
import { ToastContext } from '../context/ToastContext'

/**
 * Hook koji vraća funkcije za upravljanje toast notifikacijama.
 * Hook that returns functions for managing toast notifications.
 *
 * Mora biti korišćen unutar <ToastProvider>.
 * Must be used inside <ToastProvider>.
 *
 * @throws {Error} Ako se koristi van ToastProvider-a / If used outside ToastProvider
 */
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('[useToast] Mora biti unutar ToastProvider-a / Must be inside ToastProvider')
  return ctx
}
