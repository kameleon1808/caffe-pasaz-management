/**
 * @file electron/main.ts
 * @description Electron main process — ulazna tačka desktop aplikacije.
 *              Electron main process — entry point of the desktop application.
 *
 * Odgovornosti / Responsibilities:
 * - Pokretanje Express API servera / Starting the Express API server
 * - Kreiranje i konfiguracija BrowserWindow-a / Creating and configuring the BrowserWindow
 * - Upravljanje životnim ciklusom aplikacije / Managing the application lifecycle
 * - Bezbedna IPC komunikacija kroz preload skript / Secure IPC communication via preload script
 * - Automatski backup baze pri zatvaranju / Automatic database backup on close
 * - Logovanje u fajl (electron-log) / File logging (electron-log)
 */

import { app, BrowserWindow, Menu, shell, ipcMain, dialog } from 'electron'
import { join, resolve }                                     from 'path'
import { existsSync, copyFileSync, mkdirSync }               from 'fs'
import log                                                   from 'electron-log'
import {
  createBackup,
  listBackups,
  restoreBackup,
  getBackupFolder,
  setBackupFolder,
} from './backupService'

// ─── Logovanje / Logging ──────────────────────────────────────────────────────

/**
 * Konfiguriše electron-log: log fajl u ~/kafic-app-logs/, rotacija.
 * Configures electron-log: log file in ~/kafic-app-logs/, rotation.
 */
function setupLogging(): void {
  // Log fajl lokacija / Log file location
  log.transports.file.resolvePathFn = () => {
    const { homedir } = require('os') as typeof import('os')
    const { join: pathJoin } = require('path') as typeof import('path')
    return pathJoin(homedir(), 'kafic-app-logs', 'app.log')
  }

  // Rotacija: max 5 MB po fajlu, max 5 fajlova
  // Rotation: max 5 MB per file, max 5 files
  log.transports.file.maxSize = 5 * 1024 * 1024 // 5 MB
  log.transports.file.archiveLog = (oldLogFile) => {
    const { existsSync, renameSync } = require('fs') as typeof import('fs')
    const newName = oldLogFile.path.replace('.log', `.${Date.now()}.log`)
    if (existsSync(oldLogFile.path)) {
      try {
        renameSync(oldLogFile.path, newName)
      } catch {
        // Ignoriši grešku pri arhiviranju / Ignore archiving error
      }
    }
  }

  // Nivo logovanja / Log level
  log.transports.file.level  = 'info'
  log.transports.console.level = process.env['NODE_ENV'] === 'development' ? 'debug' : 'warn'

  // Preusmeri console.log/error na electron-log
  // Redirect console.log/error to electron-log
  Object.assign(console, log.functions)

  log.info('[Electron] Logovanje inicijalizovano / Logging initialized')
  log.info(`[Electron] Okruženje / Environment: ${process.env['NODE_ENV'] ?? 'development'}`)
  log.info(`[Electron] Verzija / Version: ${app.getVersion()}`)
}

// Electron Vite postavlja ovu promenljivu u development modu
// Electron Vite sets this variable in development mode
const RENDERER_DEV_URL = process.env['ELECTRON_RENDERER_URL']

// ─── Production baza podataka / Production database ───────────────────────────

/**
 * Konfiguriše putanju do SQLite baze za production mode.
 * Configures the SQLite database path for production mode.
 *
 * U production-u baza se čuva u userData direktorijumu korisnika.
 * In production the database is stored in the user's userData directory.
 *
 * Pri prvom pokretanju kopira bundled seed bazu ako baza još ne postoji.
 * On first launch copies the bundled seed database if no database exists yet.
 */
function setupProductionDatabase(): void {
  // U development modu ne diramo DATABASE_URL — Prisma koristi .env / prisma/dev.db
  // In dev mode we leave DATABASE_URL alone — Prisma uses .env / prisma/dev.db
  if (RENDERER_DEV_URL) return

  const userDataPath = app.getPath('userData')
  const dbPath       = join(userDataPath, 'kafic.db')

  // Postavi sve env varijable potrebne serveru (u production-u nema .env fajla)
  // Set all env variables needed by the server (no .env file in production)
  process.env['DATABASE_URL'] = `file:${dbPath}`

  if (!process.env['JWT_SECRET']) {
    process.env['JWT_SECRET'] = 'kafic-pasaz-desktop-jwt-secret-key-2025'
  }
  if (!process.env['JWT_EXPIRES_IN']) {
    process.env['JWT_EXPIRES_IN'] = '8h'
  }
  if (!process.env['PORT']) {
    process.env['PORT'] = '3001'
  }

  // Prvo pokretanje: kopiraj bundled (seed) bazu u userData
  // First launch: copy the bundled (seed) database to userData
  if (!existsSync(dbPath)) {
    try {
      mkdirSync(userDataPath, { recursive: true })

      // U pakovanoj aplikaciji (asar: false) dev.db je na resources/app/prisma/prisma/dev.db
      // DATABASE_URL="file:./prisma/dev.db" — Prisma resolve-uje relativno od prisma/ (schema dir)
      // In a packaged app (asar: false) dev.db is at resources/app/prisma/prisma/dev.db
      // DATABASE_URL="file:./prisma/dev.db" — Prisma resolves relative to prisma/ (schema dir)
      const bundledDb = join(app.getAppPath(), 'prisma', 'prisma', 'dev.db')

      if (existsSync(bundledDb)) {
        copyFileSync(bundledDb, dbPath)
        log.info(`[DB] Kreirana baza iz bundled seed: ${dbPath}`)
      } else {
        log.warn('[DB] Bundled seed baza nije pronađena, Prisma će kreirati praznu bazu.')
      }
    } catch (err) {
      log.error('[DB] Greška pri kopiranju seed baze:', (err as Error).message)
    }
  }

  log.info(`[DB] Production DATABASE_URL: ${process.env['DATABASE_URL']}`)
}

// ─── IPC Handleri / IPC Handlers ─────────────────────────────────────────────

/**
 * Registruje sve IPC handlere za main process.
 * Registers all IPC handlers for the main process.
 */
function setupIpcHandlers(): void {

  // Verzija aplikacije / App version
  ipcMain.handle('get-app-version', () => app.getVersion())

  // ── Prozor / Window ──────────────────────────────────────────────────────
  ipcMain.on('window-minimize', () => BrowserWindow.getFocusedWindow()?.minimize())
  ipcMain.on('window-maximize', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win?.isMaximized()) win.unmaximize()
    else win?.maximize()
  })
  ipcMain.on('window-close', () => BrowserWindow.getFocusedWindow()?.close())

  // ── Backup / Backup ───────────────────────────────────────────────────────

  /**
   * Kreira novi backup.
   * Creates a new backup.
   */
  ipcMain.handle('backup-create', async () => {
    try {
      const info = await createBackup()
      log.info('[IPC] backup-create uspešno / success:', info.filename)
      return { success: true, data: info }
    } catch (err) {
      const message = (err as Error).message
      log.error('[IPC] backup-create greška / error:', message)
      return { success: false, error: message }
    }
  })

  /**
   * Vraća listu backup fajlova.
   * Returns the list of backup files.
   */
  ipcMain.handle('backup-list', async () => {
    try {
      const backups = await listBackups()
      return { success: true, data: backups }
    } catch (err) {
      const message = (err as Error).message
      log.error('[IPC] backup-list greška / error:', message)
      return { success: false, error: message }
    }
  })

  /**
   * Restore-uje bazu iz backup fajla i restartuje aplikaciju.
   * Restores the database from a backup file and restarts the application.
   */
  ipcMain.handle('backup-restore', async (_, backupPath: string) => {
    try {
      await restoreBackup(backupPath)
      log.info('[IPC] backup-restore uspešno / success:', backupPath)
      // Kratka pauza da renderer dobije odgovor, pa restart
      // Short delay for renderer to receive response, then restart
      setTimeout(() => {
        app.relaunch()
        app.exit(0)
      }, 500)
      return { success: true }
    } catch (err) {
      const message = (err as Error).message
      log.error('[IPC] backup-restore greška / error:', message)
      return { success: false, error: message }
    }
  })

  /**
   * Vraća trenutni backup folder.
   * Returns the current backup folder.
   */
  ipcMain.handle('backup-get-folder', async () => {
    try {
      const folder = await getBackupFolder()
      return { success: true, data: folder }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  /**
   * Menja backup folder.
   * Changes the backup folder.
   */
  ipcMain.handle('backup-set-folder', async (_, folderPath: string) => {
    try {
      await setBackupFolder(folderPath)
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  /**
   * Otvara folder picker dijalog.
   * Opens a folder picker dialog.
   */
  ipcMain.handle('backup-pick-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title:      'Izaberite folder za backup / Select backup folder',
    })
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'canceled' }
    }
    return { success: true, data: result.filePaths[0] }
  })

  /**
   * Loguje grešku iz renderer procesa (ErrorBoundary).
   * Logs an error from the renderer process (ErrorBoundary).
   */
  ipcMain.handle('log-error', (_event, payload: { message: string; stack?: string; componentStack?: string }) => {
    log.error('[Renderer] Neočekivana greška / Unexpected error:', payload.message)
    if (payload.stack) log.error('[Renderer] Stack:', payload.stack)
    if (payload.componentStack) log.error('[Renderer] Component stack:', payload.componentStack)
  })

  log.info('[Electron] IPC handleri registrovani / IPC handlers registered')
}

// ─── Kreiranje prozora / Window creation ─────────────────────────────────────

/**
 * Kreira glavni prozor aplikacije.
 * Creates the main application window.
 *
 * @returns {BrowserWindow} Konfigurisani BrowserWindow instance
 */
function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width:           1280,
    height:          800,
    minWidth:        1024,
    minHeight:       600,
    fullscreen:      false,
    autoHideMenuBar: true,
    show:            false,
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload:          join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
      sandbox:          false
    }
  })

  Menu.setApplicationMenu(null)

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    // DEBUG: uvek otvori DevTools dok se dijagnostikuje blank screen problem
    // DEBUG: always open DevTools while diagnosing blank screen problem
    mainWindow.webContents.openDevTools()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (RENDERER_DEV_URL) {
    mainWindow.loadURL(RENDERER_DEV_URL)
  } else {
    // U production-u renderer serviruje Express — nema file:// crossorigin problema
    // In production the renderer is served by Express — no file:// crossorigin issues
    mainWindow.loadURL('http://localhost:3001')
  }

  return mainWindow
}

// ─── Pokretanje aplikacije / App startup ──────────────────────────────────────

/**
 * Inicijalizuje aplikaciju kada je Electron spreman.
 * Initializes the application when Electron is ready.
 */
app.whenReady().then(async () => {
  setupLogging()
  setupProductionDatabase()  // mora pre startServer() / must be before startServer()
  setupIpcHandlers()

  // Pokreni Express API server / Start Express API server
  // Dynamic import osigurava da je DATABASE_URL postavljen pre nego što PrismaClient bude kreiran
  // Dynamic import ensures DATABASE_URL is set before PrismaClient is instantiated
  try {
    const { startServer } = await import('../server/index')
    await startServer()
    log.info('[Electron] API server pokrenut / API server started')
  } catch (error) {
    log.error('[Electron] Greška pri pokretanju servera / Server start error:', error)
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Zatvori aplikaciju kada su svi prozori zatvoreni
// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

/**
 * Automatski backup pri zatvaranju aplikacije.
 * Automatic backup when the application is closing.
 *
 * Pokreće se na 'before-quit' eventu — pre nego što se aplikacija zatvori.
 * Triggered on 'before-quit' event — before the application exits.
 */
app.on('before-quit', (event) => {
  // Spreči zatvaranje dok backup nije gotov / Prevent closing until backup is done
  event.preventDefault()

  void (async () => {
    try {
      const info = await createBackup()
      log.info(`[Electron] Auto-backup kreiran / created: ${info.filename}`)
    } catch (err) {
      log.warn(`[Electron] Auto-backup neuspešan (nije fatalno) / failed (non-fatal):`, (err as Error).message)
    } finally {
      // Ukloni listener i zatvori aplikaciju / Remove listener and exit
      app.removeAllListeners('before-quit')
      app.quit()
    }
  })()
})

// Blokiraj navigaciju na spoljne URL-ove / Block navigation to external URLs
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, url) => {
    const allowedUrls = [
      'http://localhost:5173',
      'http://localhost:3001'
    ]
    const isAllowed = allowedUrls.some(allowed => url.startsWith(allowed))
    if (!isAllowed && !url.startsWith('file://')) {
      event.preventDefault()
    }
  })
})
