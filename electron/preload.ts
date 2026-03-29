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
import type { BackupInfo } from './backupService'

// ─── Tipovi / Types ────────────────────────────────────────────────────────────

/** Rezultat IPC poziva / IPC call result */
interface IpcResult<T = void> {
  success: boolean
  data?:   T
  error?:  string
}

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
  /** Logovanje greške u fajl (iz ErrorBoundary) / Log error to file (from ErrorBoundary) */
  logError: (payload: { message: string; stack?: string; componentStack?: string }) => Promise<void>

  /** Backup operacije / Backup operations */
  backup: {
    /** Kreira novi backup / Creates a new backup */
    create:     () => Promise<IpcResult<BackupInfo>>
    /** Lista backup fajlova (max 10 prikazano, svi se čuvaju) / List backup files */
    list:       () => Promise<IpcResult<BackupInfo[]>>
    /** Restore-uje bazu iz backup fajla i restartuje app / Restore database and restart app */
    restore:    (backupPath: string) => Promise<IpcResult>
    /** Vraća trenutni backup folder / Returns current backup folder */
    getFolder:  () => Promise<IpcResult<string>>
    /** Menja backup folder / Changes backup folder */
    setFolder:  (folderPath: string) => Promise<IpcResult>
    /** Otvara OS folder picker dijalog / Opens OS folder picker dialog */
    pickFolder: () => Promise<IpcResult<string>>
  }
}

// ─── API objekat / API object ─────────────────────────────────────────────────

const electronAPI: ElectronAPI = {
  getAppVersion:  () => ipcRenderer.invoke('get-app-version'),
  getPlatform:    () => process.platform,
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow:    () => ipcRenderer.send('window-close'),
  logError:       (payload) => ipcRenderer.invoke('log-error', payload),

  backup: {
    create:     ()           => ipcRenderer.invoke('backup-create'),
    list:       ()           => ipcRenderer.invoke('backup-list'),
    restore:    (backupPath) => ipcRenderer.invoke('backup-restore', backupPath),
    getFolder:  ()           => ipcRenderer.invoke('backup-get-folder'),
    setFolder:  (folderPath) => ipcRenderer.invoke('backup-set-folder', folderPath),
    pickFolder: ()           => ipcRenderer.invoke('backup-pick-folder'),
  },
}

// ─── Izlaganje API-ja / Expose API ────────────────────────────────────────────

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', electronAPI)
  } catch (error) {
    console.error('[Preload] Greška pri izlaganju API-ja / Error exposing API:', error)
  }
} else {
  // Fallback za okruženja bez context isolation (ne preporučuje se / not recommended)
  ;(window as unknown as Record<string, unknown>)['electronAPI'] = electronAPI
}
