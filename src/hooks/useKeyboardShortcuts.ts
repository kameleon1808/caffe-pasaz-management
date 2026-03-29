/**
 * @file src/hooks/useKeyboardShortcuts.ts
 * @description Hook za globalne tastaturne prečice na nivou stranice.
 *              Hook for global keyboard shortcuts at the page level.
 *
 * Dostupne prečice / Available shortcuts:
 * - F5 ili Ctrl+R  → Osveži podatke (bez reload cele stranice)
 * - Escape         → Zatvori modal/dijalog (obrađuje Modal komponenta)
 * - Enter          → Potvrdi dijalog (obrađuje ConfirmDialog komponenta)
 * - Ctrl+P         → Prilagođena akcija štampanja
 *
 * Upotreba / Usage:
 * ```tsx
 * // Na stranici sa tabelom / On a page with a table
 * useRefreshShortcut(loadData)
 *
 * // Ctrl+P za štampanje / Ctrl+P for printing
 * usePrintShortcut(handlePrint)
 * ```
 */

import { useEffect, useCallback } from 'react'

// ─── useRefreshShortcut ───────────────────────────────────────────────────────

/**
 * Registruje F5 i Ctrl+R kao prečice za osvežavanje podataka.
 * Registers F5 and Ctrl+R as shortcuts for refreshing data.
 *
 * VAŽNO: Sprečava reload cele stranice (Electron) / IMPORTANT: Prevents full page reload (Electron)
 *
 * @param {() => void} onRefresh - Callback koji se poziva na F5 / Ctrl+R
 * @param {boolean}    [enabled=true] - Da li je prečica aktivna
 */
export function useRefreshShortcut(onRefresh: () => void, enabled = true): void {
  const handler = useCallback((e: KeyboardEvent) => {
    const isF5     = e.key === 'F5'
    const isCtrlR  = (e.ctrlKey || e.metaKey) && e.key === 'r'

    if (isF5 || isCtrlR) {
      // Spreči reload cele stranice u Electron-u
      // Prevent full page reload in Electron
      e.preventDefault()
      onRefresh()
    }
  }, [onRefresh])

  useEffect(() => {
    if (!enabled) return
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [enabled, handler])
}

// ─── usePrintShortcut ─────────────────────────────────────────────────────────

/**
 * Registruje Ctrl+P kao prečicu za štampanje.
 * Registers Ctrl+P as a shortcut for printing.
 *
 * Koristiti samo na stranicama gde je štampanje dostupno (npr. BillPage).
 * Use only on pages where printing is available (e.g. BillPage).
 *
 * @param {() => void} onPrint  - Callback koji se poziva na Ctrl+P
 * @param {boolean}    [enabled=true] - Da li je prečica aktivna
 */
export function usePrintShortcut(onPrint: () => void, enabled = true): void {
  const handler = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault()
      onPrint()
    }
  }, [onPrint])

  useEffect(() => {
    if (!enabled) return
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [enabled, handler])
}

// ─── useEscapeKey ─────────────────────────────────────────────────────────────

/**
 * Registruje Escape kao prečicu za zatvaranje modala/drawera.
 * Registers Escape as a shortcut for closing modals/drawers.
 *
 * Napomena: Modal.tsx već obrađuje Escape. Koristiti ovaj hook
 * samo za nestandardne slučajeve.
 * Note: Modal.tsx already handles Escape. Use this hook
 * only for non-standard cases.
 *
 * @param {() => void} onEscape - Callback koji se poziva na Escape
 * @param {boolean}    [enabled=true] - Da li je prečica aktivna
 */
export function useEscapeKey(onEscape: () => void, enabled = true): void {
  const handler = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onEscape()
    }
  }, [onEscape])

  useEffect(() => {
    if (!enabled) return
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [enabled, handler])
}

// ─── useKeyboardShortcut (generički) / generic ────────────────────────────────

export interface ShortcutConfig {
  /** Taster / Key */
  key:          string
  /** Zahteva Ctrl/Meta / Requires Ctrl/Meta */
  ctrlKey?:     boolean
  /** Zahteva Shift / Requires Shift */
  shiftKey?:    boolean
  /** Zahteva Alt / Requires Alt */
  altKey?:      boolean
  /** Callback / Callback */
  onPress:      () => void
  /** Da li je aktivan / Whether active */
  enabled?:     boolean
  /** Da li sprečiti default / Whether to prevent default */
  preventDefault?: boolean
}

/**
 * Generički hook za registraciju tastaturnih prečica.
 * Generic hook for registering keyboard shortcuts.
 *
 * @param {ShortcutConfig | ShortcutConfig[]} shortcuts - Jedna ili više prečica
 */
export function useKeyboardShortcut(shortcuts: ShortcutConfig | ShortcutConfig[]): void {
  const list = Array.isArray(shortcuts) ? shortcuts : [shortcuts]

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      for (const shortcut of list) {
        if (shortcut.enabled === false) continue
        if (e.key !== shortcut.key) continue
        if (shortcut.ctrlKey  && !e.ctrlKey  && !e.metaKey) continue
        if (shortcut.shiftKey && !e.shiftKey) continue
        if (shortcut.altKey   && !e.altKey)   continue

        if (shortcut.preventDefault !== false) e.preventDefault()
        shortcut.onPress()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(list.map(s => ({ key: s.key, ctrlKey: s.ctrlKey, shiftKey: s.shiftKey, altKey: s.altKey, enabled: s.enabled })))])
}
