/**
 * @file electron/preload.ts
 * @description Preload skript za bezbednu komunikaciju između main i renderer procesa.
 *              Preload script for secure communication between main and renderer processes.
 *
 * Koristi contextBridge da selektivno izloži API funkcionalnosti renderer procesu.
 * Uses contextBridge to selectively expose API functionality to the renderer process.
 *
 * Bezbednost / Security:
 * - contextIsolation: true → renderer ne može direktno pristupiti Node.js API-ju
 * - contextIsolation: true → renderer cannot directly access Node.js API
 * - Samo eksplicitno izložene funkcije su dostupne / Only explicitly exposed functions are available
 */

import { contextBridge, ipcRenderer } from 'electron'

/**
 * Tip za API izložen renderer procesu.
 * Type for the API exposed to the renderer process.
 */
export interface ElectronAPI {
  /** Verzija aplikacije / Application version */
  getAppVersion: () => Promise<string>
  /** Platforma (win32, darwin, linux) / Platform */
  getPlatform: () => string
  /** Minimizacija prozora / Window minimize */
  minimizeWindow: () => void
  /** Maksimizacija prozora / Window maximize */
  maximizeWindow: () => void
  /** Zatvaranje prozora / Window close */
  closeWindow: () => void
}

// Izlažemo API renderer procesu kroz contextBridge
// We expose the API to the renderer process through contextBridge
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', {
      getAppVersion: () => ipcRenderer.invoke('get-app-version'),
      getPlatform:   () => process.platform,
      minimizeWindow: () => ipcRenderer.send('window-minimize'),
      maximizeWindow: () => ipcRenderer.send('window-maximize'),
      closeWindow:    () => ipcRenderer.send('window-close')
    } satisfies ElectronAPI)
  } catch (error) {
    console.error('[Preload] Greška pri izlaganju API-ja / Error exposing API:', error)
  }
} else {
  // Fallback za okruženja bez context isolation (ne preporučuje se / not recommended)
  ;(window as unknown as Record<string, unknown>)['electronAPI'] = {
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    getPlatform:   () => process.platform,
    minimizeWindow: () => ipcRenderer.send('window-minimize'),
    maximizeWindow: () => ipcRenderer.send('window-maximize'),
    closeWindow:    () => ipcRenderer.send('window-close')
  }
}
