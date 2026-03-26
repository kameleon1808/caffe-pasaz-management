/**
 * @file src/context/ToastContext.tsx
 * @description Globalni sistem za obaveštenja (toast notifikacije).
 *              Global notification system (toast notifications).
 *
 * Korišćenje / Usage:
 * ```tsx
 * const { showToast } = useToast()
 * showToast('Kategorija sačuvana!', 'success')
 * showToast('Greška pri čuvanju', 'error')
 * ```
 */

import { createContext, useState, useCallback, ReactNode } from 'react'

/** Tip toast notifikacije / Toast notification type */
export type ToastType = 'success' | 'error' | 'warning' | 'info'

/** Jedna toast notifikacija / A single toast notification */
export interface Toast {
  id:      string
  message: string
  type:    ToastType
}

/** Oblik Toast konteksta / Toast context shape */
export interface ToastContextType {
  toasts:    Toast[]
  showToast: (message: string, type?: ToastType, duration?: number) => void
  hideToast: (id: string) => void
}

export const ToastContext = createContext<ToastContextType | null>(null)

/**
 * Provider za toast notifikacije.
 * Toast notification provider.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  /**
   * Prikazuje novu toast notifikaciju.
   * Shows a new toast notification.
   *
   * @param {string}    message  - Tekst poruke / Message text
   * @param {ToastType} type     - Tip notifikacije / Notification type (default: 'info')
   * @param {number}    duration - Trajanje u ms / Duration in ms (default: 4000)
   */
  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`

    setToasts(prev => [...prev, { id, message, type }])

    // Auto-ukloni posle trajanja / Auto-remove after duration
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }, [])

  /**
   * Ručno uklanja toast.
   * Manually removes a toast.
   */
  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, showToast, hideToast }}>
      {children}
    </ToastContext.Provider>
  )
}
