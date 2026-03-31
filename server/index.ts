/**
 * @file server/index.ts
 * @description Express API server koji se pokreće unutar Electron main procesa.
 *              Express API server that runs inside the Electron main process.
 *
 * Server osigurava svu poslovnu logiku i komunikaciju sa bazom podataka.
 * The server handles all business logic and database communication.
 *
 * Arhitektura / Architecture:
 * - Electron main process → pokreće ovaj server / starts this server
 * - React renderer → šalje HTTP zahteve na localhost:PORT / sends HTTP requests to localhost:PORT
 * - SQLite baza → pristupa se isključivo kroz Prisma ORM / accessed exclusively through Prisma ORM
 */

import express, { Application } from 'express'
import cors from 'cors'
import { config } from 'dotenv'
import { resolve, join } from 'path'

import { requestLogger }    from './middleware/logger'
import { errorHandler }     from './middleware/errorHandler'
import { authRouter }       from './routes/auth'
import { categoriesRouter } from './routes/categories'
import { productsRouter }   from './routes/products'
import { inventoryRouter }  from './routes/inventory'
import { tablesRouter }     from './routes/tables'
import { shiftsRouter }     from './routes/shifts'
import { billsRouter }      from './routes/bills'
import { settingsRouter }   from './routes/settings'
import { printRouter }      from './routes/print'
import { usersRouter }     from './routes/users'
import { salariesRouter }  from './routes/salaries'
import { reportsRouter }    from './routes/reports'
import { dashboardRouter } from './routes/dashboard'

// Učitaj .env fajl / Load .env file
config({ path: resolve(process.cwd(), '.env') })

const PORT = parseInt(process.env['PORT'] ?? '3001', 10)

/**
 * Kreira i konfiguriše Express aplikaciju.
 * Creates and configures the Express application.
 *
 * @returns {Application} Konfigurisana Express instanca / Configured Express instance
 */
function createApp(): Application {
  const app = express()

  // ── Middleware ────────────────────────────────────────────────────────────

  // CORS: dozvoli zahteve sa Vite dev servera i iz production Electron renderer-a (file://)
  // CORS: allow requests from Vite dev server and production Electron renderer (file://)
  app.use(cors({
    origin: true, // prihvata sve origine uključujući null/file:// / accepts all origins including null/file://
    credentials: true,
    methods:  ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }))

  // Body parseri / Body parsers
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))

  // Logovanje zahteva / Request logging
  app.use(requestLogger)

  // ── Rute / Routes ────────────────────────────────────────────────────────

  // Health check endpoint
  app.get('/api/v1/health', (_req, res) => {
    res.json({
      status:    'ok',
      service:   'Kafić Pasaz API',
      version:   '1.0.0',
      timestamp: new Date().toISOString()
    })
  })

  // Autentifikacija / Authentication
  app.use('/api/v1/auth', authRouter)

  // Kategorije / Categories
  app.use('/api/v1/categories', categoriesRouter)

  // Proizvodi / Products
  app.use('/api/v1/products', productsRouter)

  // Magacin / Inventory
  app.use('/api/v1/inventory', inventoryRouter)

  // Stolovi / Tables
  app.use('/api/v1/tables', tablesRouter)

  // Smene / Shifts
  app.use('/api/v1/shifts', shiftsRouter)

  // Računi / Bills
  app.use('/api/v1/bills', billsRouter)

  // Podešavanja / Settings
  app.use('/api/v1/settings', settingsRouter)

  // Štampanje / Printing
  app.use('/api/v1/print', printRouter)

  // Korisnici / Users
  app.use('/api/v1/users', usersRouter)

  // Plate / Salaries
  app.use('/api/v1/salaries', salariesRouter)

  // Izveštaji / Reports
  app.use('/api/v1/reports', reportsRouter)

  // Admin dashboard statistike / Admin dashboard statistics
  app.use('/api/v1/dashboard', dashboardRouter)

  // ── Renderer static files u production modu / Renderer static files in production ──
  // U dev modu Vite dev server serviruje renderer, ovde ga ne diramo.
  // In dev mode the Vite dev server serves the renderer, we skip this.
  if (!process.env['ELECTRON_RENDERER_URL']) {
    const rendererPath = join(__dirname, '../renderer')
    app.use(express.static(rendererPath))
    // Fallback na index.html za React Router rute / Fallback to index.html for React Router routes
    app.get('*', (_req, res) => res.sendFile(join(rendererPath, 'index.html')))
  }

  // ── Error Handler (mora biti poslednji!) ──────────────────────────────────
  // Error Handler (must be last!)
  app.use(errorHandler)

  return app
}

/**
 * Pokreće Express server na zadatom portu.
 * Starts the Express server on the given port.
 *
 * @returns {Promise<void>} Resolvuje kada server počne da sluša / Resolves when server starts listening
 */
export async function startServer(): Promise<void> {
  const app = createApp()

  return new Promise((resolve, reject) => {
    const server = app.listen(PORT, '127.0.0.1', () => {
      console.log(`[Server] API server sluša na / listening on http://127.0.0.1:${PORT}`)
      console.log(`[Server] Okruženje / Environment: ${process.env['NODE_ENV'] ?? 'development'}`)
      resolve()
    })

    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`[Server] Port ${PORT} je zauzet / Port ${PORT} is already in use`)
      }
      reject(error)
    })
  })
}
