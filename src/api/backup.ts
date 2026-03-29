/**
 * @file src/api/backup.ts
 * @description Frontend API klijent za backup operacije — komunicira sa Electron main procesom putem IPC.
 *              Frontend API client for backup operations — communicates with Electron main via IPC.
 *
 * Sve funkcije koriste window.electronAPI.backup koji je izložen kroz preload skript.
 * All functions use window.electronAPI.backup exposed via the preload script.
 *
 * NAPOMENA: Ovaj klijent radi SAMO u Electron okruženju.
 * NOTE: This client works ONLY in Electron environment.
 */

// ─── Tipovi / Types ────────────────────────────────────────────────────────────

/** Informacije o jednom backup fajlu / Information about a single backup file */
export interface BackupInfo {
  /** Puno ime fajla / Full filename */
  filename:  string
  /** Puna putanja / Full path */
  path:      string
  /** Datum kreiranja (ISO string) / Creation date (ISO string) */
  createdAt: string
  /** Veličina fajla u bajtovima / File size in bytes */
  sizeBytes: number
}

/** Rezultat IPC poziva / IPC call result */
interface IpcResult<T = void> {
  success: boolean
  data?:   T
  error?:  string
}

/** Tip backup API-ja na window.electronAPI.backup / Type of backup API on window.electronAPI.backup */
interface BackupAPI {
  create:     () => Promise<IpcResult<BackupInfo>>
  list:       () => Promise<IpcResult<BackupInfo[]>>
  restore:    (backupPath: string) => Promise<IpcResult>
  getFolder:  () => Promise<IpcResult<string>>
  setFolder:  (folderPath: string) => Promise<IpcResult>
  pickFolder: () => Promise<IpcResult<string>>
}

// ─── Detekcija Electron okruženja / Electron environment detection ─────────────

/**
 * Vraća electronAPI.backup objekat ako je dostupan.
 * Returns the electronAPI.backup object if available.
 */
function getBackupApi(): BackupAPI {
  const api = (window as Window & { electronAPI?: { backup?: BackupAPI } }).electronAPI?.backup
  if (!api) {
    throw new Error(
      'Backup API nije dostupan — aplikacija ne radi u Electron okruženju. / ' +
      'Backup API not available — app is not running in Electron.'
    )
  }
  return api
}

// ─── Javni API / Public API ───────────────────────────────────────────────────

/**
 * Kreira novi backup SQLite baze.
 * Creates a new SQLite database backup.
 *
 * @returns {Promise<BackupInfo>} Info o kreiranom backup fajlu / Info about the created backup file
 * @throws Ako backup nije uspeo / If backup failed
 */
export async function createBackup(): Promise<BackupInfo> {
  const result = await getBackupApi().create()
  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Backup nije uspeo / Backup failed')
  }
  return result.data
}

/**
 * Vraća listu dostupnih backup fajlova (sortirana od najnovijeg).
 * Returns the list of available backup files (sorted from newest).
 *
 * @returns {Promise<BackupInfo[]>} Lista backup-ova / List of backups
 */
export async function listBackups(): Promise<BackupInfo[]> {
  const result = await getBackupApi().list()
  if (!result.success) {
    throw new Error(result.error ?? 'Greška pri učitavanju backup liste / Error loading backup list')
  }
  return result.data ?? []
}

/**
 * Restore-uje bazu iz backup fajla.
 * Restores the database from a backup file.
 *
 * PAŽNJA: Aplikacija se automatski restartuje nakon uspešnog restore-a!
 * ATTENTION: The application restarts automatically after a successful restore!
 *
 * @param {string} backupPath - Apsolutna putanja do backup fajla / Absolute path to backup file
 */
export async function restoreBackup(backupPath: string): Promise<void> {
  const result = await getBackupApi().restore(backupPath)
  if (!result.success) {
    throw new Error(result.error ?? 'Restore nije uspeo / Restore failed')
  }
  // Aplikacija se restartuje u main procesu / App restarts in main process
}

/**
 * Vraća trenutni backup folder.
 * Returns the current backup folder.
 *
 * @returns {Promise<string>} Putanja do backup foldera / Backup folder path
 */
export async function getBackupFolder(): Promise<string> {
  const result = await getBackupApi().getFolder()
  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Greška pri čitanju backup foldera / Error reading backup folder')
  }
  return result.data
}

/**
 * Menja backup folder.
 * Changes the backup folder.
 *
 * @param {string} folderPath - Nova putanja / New path
 */
export async function setBackupFolder(folderPath: string): Promise<void> {
  const result = await getBackupApi().setFolder(folderPath)
  if (!result.success) {
    throw new Error(result.error ?? 'Greška pri postavljanju backup foldera / Error setting backup folder')
  }
}

/**
 * Otvara OS folder picker dijalog i vraća odabranu putanju.
 * Opens the OS folder picker dialog and returns the selected path.
 *
 * @returns {Promise<string | null>} Odabrana putanja ili null ako je korisnik otkazao / Selected path or null if canceled
 */
export async function pickBackupFolder(): Promise<string | null> {
  const result = await getBackupApi().pickFolder()
  if (!result.success || result.error === 'canceled') return null
  return result.data ?? null
}

/**
 * Proverava da li je Electron backup API dostupan.
 * Checks whether the Electron backup API is available.
 *
 * @returns {boolean} true ako je u Electron okruženju / true if in Electron environment
 */
export function isBackupAvailable(): boolean {
  try {
    getBackupApi()
    return true
  } catch {
    return false
  }
}
