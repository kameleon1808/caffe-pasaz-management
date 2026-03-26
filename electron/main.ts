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
 */

import { app, BrowserWindow, Menu, shell } from 'electron'
import { join } from 'path'
import { startServer } from '../server/index'

// Electron Vite postavlja ovu promenljivu u development modu
// Electron Vite sets this variable in development mode
const RENDERER_DEV_URL = process.env['ELECTRON_RENDERER_URL']

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
    fullscreen:      false, // početak u normalnom prozoru / start in normal window
    autoHideMenuBar: true,  // sakriva standardni browser meni / hides standard browser menu
    show:            false, // ne prikazuj dok se ne učita / don't show until ready
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload:            join(__dirname, '../preload/preload.js'),
      contextIsolation:   true,  // bezbednost: izolovani kontekst / security: isolated context
      nodeIntegration:    false, // bezbednost: bez Node.js u rendereru / security: no Node.js in renderer
      sandbox:            false  // potrebno za preload / required for preload
    }
  })

  // Ukloni default Electron meni / Remove default Electron menu
  Menu.setApplicationMenu(null)

  // Prikaži prozor kada je renderer spreman / Show window when renderer is ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    // U development modu otvori DevTools / In development mode open DevTools
    if (RENDERER_DEV_URL) {
      mainWindow.webContents.openDevTools()
    }
  })

  // Otvori linkove u eksternom browseru / Open links in external browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Učitaj renderer URL / Load renderer URL
  if (RENDERER_DEV_URL) {
    // Development: Vite dev server
    mainWindow.loadURL(RENDERER_DEV_URL)
  } else {
    // Production: statički fajlovi / static files
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

/**
 * Inicijalizuje aplikaciju kada je Electron spreman.
 * Initializes the application when Electron is ready.
 */
app.whenReady().then(async () => {
  // Pokreni Express API server / Start Express API server
  try {
    await startServer()
    console.log('[Electron] API server pokrenut / API server started')
  } catch (error) {
    console.error('[Electron] Greška pri pokretanju servera / Server start error:', error)
  }

  createWindow()

  // Na macOS, ponovo kreiraj prozor ako je app aktivirana bez prozora
  // On macOS, re-create window if app is activated without windows
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Zatvori aplikaciju kada su svi prozori zatvoreni (osim na macOS)
// Quit the app when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Blokiraj navigaciju na spoljne URL-ove (bezbednost)
// Block navigation to external URLs (security)
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, url) => {
    const allowedUrls = [
      'http://localhost:5173', // Vite dev server
      'http://localhost:3001'  // API server
    ]
    const isAllowed = allowedUrls.some(allowed => url.startsWith(allowed))
    if (!isAllowed && !url.startsWith('file://')) {
      event.preventDefault()
    }
  })
})
