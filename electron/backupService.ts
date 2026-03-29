/**
 * @file electron/backupService.ts
 * @description Servis za kreiranje, listu i restore backup-ova SQLite baze.
 *              Service for creating, listing, and restoring SQLite database backups.
 *
 * Sve backup operacije rade direktno sa fajl sistemom (fs.copyFile).
 * All backup operations work directly with the file system (fs.copyFile).
 *
 * Backup fajlovi / Backup file format:
 *   kafic_backup_YYYY-MM-DD_HH-mm.db
 *
 * Konfiguracija / Configuration:
 *   Backup folder se čuva u userData/backup-config.json.
 *   Backup folder is stored in userData/backup-config.json.
 */

import { promises as fs }  from 'fs'
import { existsSync }      from 'fs'
import { join, resolve }   from 'path'
import { homedir }         from 'os'
import { app }             from 'electron'
import log                 from 'electron-log'

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

/** Konfiguracija backup servisa / Backup service configuration */
interface BackupConfig {
  folder: string
}

// ─── Konstante / Constants ─────────────────────────────────────────────────────

/** Maksimalan broj backup fajlova koji se čuvaju / Maximum number of backup files to keep */
const MAX_BACKUPS = 30

/** Naziv config fajla / Config filename */
const CONFIG_FILENAME = 'backup-config.json'

/** Prefiks backup fajlova / Backup filename prefix */
const BACKUP_PREFIX = 'kafic_backup_'

// ─── Pomoćne funkcije / Helper functions ──────────────────────────────────────

/**
 * Vraća putanju do SQLite baze iz DATABASE_URL env promenljive.
 * Returns the SQLite database path from the DATABASE_URL env variable.
 *
 * @returns {string} Apsolutna putanja do baze / Absolute path to database
 */
export function getDbPath(): string {
  const url = process.env['DATABASE_URL'] ?? 'file:./prisma/dev.db'
  const filePath = url.startsWith('file:') ? url.slice(5) : url
  // Prisma rezolvuje putanju relativno od direktorijuma schema.prisma fajla (prisma/).
  // Prisma resolves the path relative to the schema.prisma directory (prisma/).
  const schemaDir = resolve(process.cwd(), 'prisma')
  return resolve(schemaDir, filePath)
}

/**
 * Vraća putanju do config fajla u userData direktorijumu.
 * Returns the path to the config file in the userData directory.
 *
 * @returns {string} Putanja do config fajla / Config file path
 */
function getConfigPath(): string {
  return join(app.getPath('userData'), CONFIG_FILENAME)
}

/**
 * Vraća default backup folder (~/kafic-backup).
 * Returns the default backup folder (~/kafic-backup).
 *
 * @returns {string} Default backup folder putanja / Default backup folder path
 */
function getDefaultBackupFolder(): string {
  return join(homedir(), 'kafic-backup')
}

/**
 * Učitava backup konfiguraciju iz config fajla.
 * Loads backup configuration from the config file.
 *
 * @returns {Promise<BackupConfig>} Konfiguracija / Configuration
 */
async function loadConfig(): Promise<BackupConfig> {
  try {
    const raw = await fs.readFile(getConfigPath(), 'utf-8')
    return JSON.parse(raw) as BackupConfig
  } catch {
    return { folder: getDefaultBackupFolder() }
  }
}

/**
 * Čuva backup konfiguraciju u config fajl.
 * Saves backup configuration to the config file.
 *
 * @param {BackupConfig} config - Konfiguracija za čuvanje / Config to save
 */
async function saveConfig(config: BackupConfig): Promise<void> {
  await fs.writeFile(getConfigPath(), JSON.stringify(config, null, 2), 'utf-8')
}

/**
 * Formira naziv backup fajla na osnovu trenutnog datuma i vremena.
 * Formats the backup filename based on the current date and time.
 *
 * @returns {string} Naziv fajla (npr. kafic_backup_2026-03-29_14-35.db)
 */
function makeBackupFilename(): string {
  const now  = new Date()
  const pad  = (n: number) => String(n).padStart(2, '0')
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const time = `${pad(now.getHours())}-${pad(now.getMinutes())}`
  return `${BACKUP_PREFIX}${date}_${time}.db`
}

// ─── Javni API / Public API ───────────────────────────────────────────────────

/**
 * Vraća trenutni backup folder.
 * Returns the current backup folder.
 *
 * @returns {Promise<string>} Putanja do backup foldera / Backup folder path
 */
export async function getBackupFolder(): Promise<string> {
  const config = await loadConfig()
  return config.folder
}

/**
 * Menja backup folder.
 * Changes the backup folder.
 *
 * @param {string} folderPath - Nova putanja do backup foldera / New backup folder path
 */
export async function setBackupFolder(folderPath: string): Promise<void> {
  await saveConfig({ folder: folderPath })
  log.info(`[Backup] Backup folder promenjen na / changed to: ${folderPath}`)
}

/**
 * Kreira backup SQLite baze.
 * Creates a backup of the SQLite database.
 *
 * - Kreira backup folder ako ne postoji
 * - Kopira bazu sa novim imenом (timestamp)
 * - Rotira stare backup-ove (čuva MAX_BACKUPS)
 *
 * - Creates backup folder if it does not exist
 * - Copies the database with a new name (timestamp)
 * - Rotates old backups (keeps MAX_BACKUPS)
 *
 * @returns {Promise<BackupInfo>} Info o kreiranom backup-u / Info about the created backup
 */
export async function createBackup(): Promise<BackupInfo> {
  const config    = await loadConfig()
  const folder    = config.folder
  const dbPath    = getDbPath()
  const filename  = makeBackupFilename()
  const destPath  = join(folder, filename)

  // Proveri da li baza postoji / Check if database exists
  if (!existsSync(dbPath)) {
    throw new Error(`Baza nije pronađena na: ${dbPath} / Database not found at: ${dbPath}`)
  }

  // Kreiraj backup folder ako ne postoji / Create backup folder if it doesn't exist
  await fs.mkdir(folder, { recursive: true })

  // Kopiraj bazu / Copy database
  await fs.copyFile(dbPath, destPath)

  const stats = await fs.stat(destPath)
  log.info(`[Backup] Backup kreiran / created: ${destPath} (${stats.size} bytes)`)

  // Rotiraj stare backup-ove / Rotate old backups
  await rotateBackups(folder)

  return {
    filename,
    path:      destPath,
    createdAt: stats.mtime.toISOString(),
    sizeBytes: stats.size,
  }
}

/**
 * Vraća listu backup-ova sortiranu od najnovijeg.
 * Returns the list of backups sorted from newest to oldest.
 *
 * @returns {Promise<BackupInfo[]>} Lista backup-ova / List of backups
 */
export async function listBackups(): Promise<BackupInfo[]> {
  const config = await loadConfig()
  const folder = config.folder

  // Vrati praznu listu ako folder ne postoji / Return empty list if folder doesn't exist
  if (!existsSync(folder)) return []

  let files: string[]
  try {
    files = await fs.readdir(folder)
  } catch {
    return []
  }

  const backupFiles = files.filter(f => f.startsWith(BACKUP_PREFIX) && f.endsWith('.db'))

  const infos: BackupInfo[] = []
  for (const filename of backupFiles) {
    const filePath = join(folder, filename)
    try {
      const stats = await fs.stat(filePath)
      infos.push({
        filename,
        path:      filePath,
        createdAt: stats.mtime.toISOString(),
        sizeBytes: stats.size,
      })
    } catch {
      // Preskoči fajlove do kojih ne možemo pristupiti / Skip files we can't access
    }
  }

  // Sortiraj od najnovijeg / Sort from newest
  infos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  return infos
}

/**
 * Restore-uje bazu iz backup fajla.
 * Restores the database from a backup file.
 *
 * Pre restore-a:
 * 1. Pravi backup trenutne baze (safety copy)
 * 2. Kopira izabrani backup fajl preko trenutne baze
 *
 * Before restore:
 * 1. Creates a backup of the current database (safety copy)
 * 2. Copies the selected backup file over the current database
 *
 * NAPOMENA: Aplikacija mora biti restartovana da bi Prisma koristio novu bazu.
 * NOTE: The application must be restarted for Prisma to use the new database.
 *
 * @param {string} backupPath - Putanja do backup fajla za restore / Path to backup file to restore
 */
export async function restoreBackup(backupPath: string): Promise<void> {
  const dbPath = getDbPath()

  // Proveri da li backup fajl postoji / Check if backup file exists
  if (!existsSync(backupPath)) {
    throw new Error(`Backup fajl nije pronađen: ${backupPath} / Backup file not found: ${backupPath}`)
  }

  // Pravi safety backup pre restore-a / Create safety backup before restore
  const config = await loadConfig()
  const safetyFilename = `kafic_pre_restore_${Date.now()}.db`
  const safetyPath = join(config.folder, safetyFilename)
  await fs.mkdir(config.folder, { recursive: true })

  if (existsSync(dbPath)) {
    await fs.copyFile(dbPath, safetyPath)
    log.info(`[Backup] Safety backup kreiran / created: ${safetyPath}`)
  }

  // Kopiraj backup fajl kao trenutnu bazu / Copy backup file as current database
  await fs.copyFile(backupPath, dbPath)
  log.info(`[Backup] Restore uspešan / successful: ${backupPath} → ${dbPath}`)
}

/**
 * Rotira stare backup fajlove — čuva samo MAX_BACKUPS najnovijih.
 * Rotates old backup files — keeps only the MAX_BACKUPS newest.
 *
 * @param {string} folder - Backup folder / Backup folder
 */
async function rotateBackups(folder: string): Promise<void> {
  const all = await listBackups()

  if (all.length <= MAX_BACKUPS) return

  const toDelete = all.slice(MAX_BACKUPS)
  for (const backup of toDelete) {
    try {
      await fs.unlink(backup.path)
      log.info(`[Backup] Obrisan stari backup / deleted old backup: ${backup.filename}`)
    } catch (err) {
      log.warn(`[Backup] Nije mogao da obriše / could not delete: ${backup.filename}`, err)
    }
  }
}
