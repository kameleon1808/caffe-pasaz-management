/**
 * @file src/context/ShiftContext.tsx
 * @description React Context za upravljanje stanjem aktivne smene.
 *              React Context for managing active shift state.
 *
 * Pruža / Provides:
 * - activeShift: trenutna aktivna smena ili null / current active shift or null
 * - isLoading: da li se smena učitava / whether shift is loading
 * - startShift: funkcija za početak smene / function to start shift
 * - endShift: funkcija za završetak smene / function to end shift
 * - refreshShift: funkcija za osvežavanje stanja smene / function to refresh shift state
 *
 * Mora biti unutar AuthProvider-a jer koristi auth token.
 * Must be inside AuthProvider because it uses the auth token.
 */

import { createContext, useState, useEffect, useCallback, ReactNode } from 'react'
import type { Shift } from '../types'
import {
  startShift  as apiStartShift,
  endShift    as apiEndShift,
  getActiveShift as apiGetActiveShift,
} from '../api/shifts'
import { useToast }    from '../hooks/useToast'
import { useAuth }     from '../hooks/useAuth'
import { useTranslation } from 'react-i18next'

/**
 * Oblik ShiftContext-a koji je izložen komponentama.
 * Shape of the ShiftContext exposed to components.
 */
export interface ShiftContextType {
  /** Aktivna smena ili null / Active shift or null */
  activeShift:   Shift | null
  /** Da li se smena učitava / Whether shift is loading */
  isLoading:     boolean
  /** Da li je operacija u toku (start/end) / Whether an operation is in progress */
  isProcessing:  boolean
  /**
   * Započinje novu smenu.
   * Starts a new shift.
   */
  startShift:    () => Promise<void>
  /**
   * Završava aktivnu smenu.
   * Ends the active shift.
   */
  endShift:      () => Promise<void>
  /**
   * Osvežava stanje smene sa servera.
   * Refreshes the shift state from the server.
   */
  refreshShift:  () => Promise<void>
}

export const ShiftContext = createContext<ShiftContextType | null>(null)

/**
 * Provider koji omotava aplikaciju i pruža stanje smene.
 * Provider that wraps the application and provides shift state.
 */
export function ShiftProvider({ children }: { children: ReactNode }) {
  const { t }              = useTranslation()
  const { showToast }      = useToast()
  const { isAuthenticated } = useAuth()

  const [activeShift,  setActiveShift]  = useState<Shift | null>(null)
  const [isLoading,    setIsLoading]    = useState<boolean>(false)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)

  /**
   * Učitava aktivnu smenu sa servera.
   * Loads the active shift from the server.
   */
  const refreshShift = useCallback(async (): Promise<void> => {
    if (!isAuthenticated) {
      setActiveShift(null)
      return
    }

    setIsLoading(true)
    try {
      const shift = await apiGetActiveShift()
      setActiveShift(shift)
    } catch {
      // Ne prikazuj toast za ovu operaciju — tiho greši
      // Don't show toast for this operation — fail silently
      setActiveShift(null)
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  // Učitaj smenu kada se korisnik uloguje / Load shift when user logs in
  useEffect(() => {
    void refreshShift()
  }, [refreshShift])

  /**
   * Započinje novu smenu.
   * Starts a new shift.
   */
  const startShift = useCallback(async (): Promise<void> => {
    setIsProcessing(true)
    try {
      const shift = await apiStartShift()
      setActiveShift(shift)
      showToast(t('shifts.startSuccess'), 'success')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'SHIFT_ALREADY_ACTIVE') {
        showToast(t('shifts.alreadyActive'), 'error')
        // Osvezi stanje jer smo u nekonzistentnom stanju / Refresh state as we're in inconsistent state
        await refreshShift()
      } else {
        const msg = (err as Error).message ?? t('common.unknown_error')
        showToast(msg, 'error')
      }
    } finally {
      setIsProcessing(false)
    }
  }, [showToast, t, refreshShift])

  /**
   * Završava aktivnu smenu.
   * Ends the active shift.
   */
  const endShift = useCallback(async (): Promise<void> => {
    setIsProcessing(true)
    try {
      await apiEndShift()
      setActiveShift(null)
      showToast(t('shifts.endSuccess'), 'success')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'SHIFT_HAS_OPEN_BILLS') {
        showToast(t('shifts.endWithOpenBills'), 'error')
      } else if (code === 'SHIFT_NOT_ACTIVE') {
        showToast(t('shifts.notActive'), 'error')
        setActiveShift(null)
      } else {
        const msg = (err as Error).message ?? t('common.unknown_error')
        showToast(msg, 'error')
      }
    } finally {
      setIsProcessing(false)
    }
  }, [showToast, t])

  const contextValue: ShiftContextType = {
    activeShift,
    isLoading,
    isProcessing,
    startShift,
    endShift,
    refreshShift,
  }

  return (
    <ShiftContext.Provider value={contextValue}>
      {children}
    </ShiftContext.Provider>
  )
}
