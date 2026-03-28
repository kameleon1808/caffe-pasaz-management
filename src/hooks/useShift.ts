/**
 * @file src/hooks/useShift.ts
 * @description Hook za pristup ShiftContext-u iz bilo koje komponente.
 *              Hook for accessing ShiftContext from any component.
 *
 * @example
 * ```tsx
 * const { activeShift, startShift, endShift } = useShift()
 * if (!activeShift) return <ShiftGuard />
 * ```
 */

import { useContext } from 'react'
import { ShiftContext } from '../context/ShiftContext'

/**
 * Hook koji vraća kontekst smene.
 * Hook that returns the shift context.
 *
 * Mora se koristiti unutar <ShiftProvider> komponente.
 * Must be used inside the <ShiftProvider> component.
 *
 * @throws {Error} Ako se koristi van ShiftProvider-a / If used outside ShiftProvider
 */
export function useShift() {
  const ctx = useContext(ShiftContext)
  if (!ctx) {
    throw new Error(
      '[useShift] Hook mora biti korišćen unutar ShiftProvider-a / ' +
      '[useShift] Hook must be used inside ShiftProvider'
    )
  }
  return ctx
}
