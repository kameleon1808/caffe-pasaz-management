/**
 * @file src/context/ToastContext.tsx
 * @description Globalni sistem za obaveštenja (toast notifikacije).
 *              Global notification system (toast notifications).
 *
 * Pravila / Rules:
 * - success, warning, info: automatski nestaju posle 5000ms
 * - error: ostaje dok korisnik ručno ne zatvori
 * - Maksimalno 3 istovremeno vidljive notifikacije
 *   (najstarije se uklanjaju kada se doda nova)
 *
 * - success, warning, info: auto-dismiss after 5000ms
 * - error: stays until the user manually closes it
 * - Maximum 3 simultaneously visible notifications
 *   (oldest is removed when a new one is added)
 *
 * Korišćenje / Usage:
 * ```tsx
 * const { showToast } = useToast()
 * showToast('Kategorija sačuvana!', 'success')
 * showToast('Greška pri čuvanju', 'error')          // ostaje / stays
 * showToast('Poruka', 'info', 3000)                 // prilagođeno trajanje / custom duration
 * showToast('Trajan error', 'error', 0)             // isto — error uvek ostaje / same — error always stays
 * ```
 */

import { createContext, useState, useCallback, useRef, ReactNode } from 'react'

/** Tip toast notifikacije / Toast notification type */
export type ToastType = 'success' | 'error' | 'warning' | 'info'

/** Jedna toast notifikacija / A single toast notification */
export interface Toast {
  id:         string
  message:    string
  type:       ToastType
  /** Da li se automatski zatvara / Whether it auto-dismisses */
  autoDismiss: boolean
}

/** Oblik Toast konteksta / Toast context shape */
export interface ToastContextType {
  toasts:    Toast[]
  showToast: (message: string, type?: ToastType, duration?: number) => void
  hideToast: (id: string) => void
}

/** Maksimalan broj vidljivih notifikacija / Maximum visible notifications */
const MAX_TOASTS = 3

/** Podrazumevano trajanje po tipu / Default duration by type (0 = beskonačno) */
const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 5000,
  warning: 5000,
  info:    5000,
  error:   0,     // ostaje dok se ne zatvori ručno / stays until manually closed
}

export const ToastContext = createContext<ToastContextType | null>(null)

/**
 * Provider za toast notifikacije.
 * Toast notification provider.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  // Čuvamo timer ID-ove da bismo mogli da ih otkažemo / Store timer IDs to cancel them
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  /**
   * Prikazuje novu toast notifikaciju.
   * Shows a new toast notification.
   *
   * - Greške nikad ne nestaju automatski / Errors never auto-dismiss
   * - Ostali tipovi nestaju posle duration ms (default: 5000) / Others dismiss after duration ms (default: 5000)
   * - Ako je vidljivo MAX_TOASTS, najstarija se uklanja / If MAX_TOASTS visible, oldest is removed
   *
   * @param {string}    message  - Tekst poruke / Message text
   * @param {ToastType} type     - Tip notifikacije / Notification type (default: 'info')
   * @param {number}    duration - Trajanje u ms; 0 = bez auto-dismiss / Duration in ms; 0 = no auto-dismiss
   */
  const showToast = useCallback((message: string, type: ToastType = 'info', duration?: number) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`

    // Greške uvek ostaju; ostali koriste dati duration ili default / Errors always stay; others use given duration or default
    const effectiveDuration = type === 'error' ? 0 : (duration ?? DEFAULT_DURATION[type])
    const autoDismiss       = effectiveDuration > 0

    setToasts(prev => {
      // Ako smo na limitu, ukloni najstariju / If at limit, remove oldest
      const trimmed = prev.length >= MAX_TOASTS ? prev.slice(1) : prev
      // Otkaži timer najstarije ako postoji / Cancel timer of removed toast if exists
      if (prev.length >= MAX_TOASTS) {
        const removedId = prev[0].id
        const timer = timers.current.get(removedId)
        if (timer) {
          clearTimeout(timer)
          timers.current.delete(removedId)
        }
      }
      return [...trimmed, { id, message, type, autoDismiss }]
    })

    // Postavi auto-dismiss timer ako je potrebno / Set auto-dismiss timer if needed
    if (autoDismiss) {
      const timer = setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
        timers.current.delete(id)
      }, effectiveDuration)
      timers.current.set(id, timer)
    }
  }, [])

  /**
   * Ručno uklanja toast.
   * Manually removes a toast.
   */
  const hideToast = useCallback((id: string) => {
    // Otkaži timer ako postoji / Cancel timer if exists
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, showToast, hideToast }}>
      {children}
    </ToastContext.Provider>
  )
}
