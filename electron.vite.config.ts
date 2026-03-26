/**
 * @file electron.vite.config.ts
 * @description Konfiguracija za electron-vite build alat.
 *              Configuration for the electron-vite build tool.
 *
 * Definiše ulazne tačke za:
 * - Electron main process (electron/main.ts)
 * - Preload skript (electron/preload.ts)
 * - React renderer (src/)
 *
 * Defines entry points for:
 * - Electron main process (electron/main.ts)
 * - Preload script (electron/preload.ts)
 * - React renderer (src/)
 */

import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry:    resolve(__dirname, 'electron/main.ts'),
        fileName: () => 'index' // electron-vite traži out/main/index.js / electron-vite expects out/main/index.js
      }
    },
    resolve: {
      alias: {
        '@server': resolve(__dirname, 'server')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry:    resolve(__dirname, 'electron/preload.ts'),
        fileName: () => 'index' // electron-vite traži out/preload/index.js / electron-vite expects out/preload/index.js
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src'),
    build: {
      outDir: resolve(__dirname, 'out/renderer'),
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/index.html')
        }
      }
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },
    plugins: [react()]
  }
})
