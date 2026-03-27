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
import { resolve } from 'path'

import { requestLogger }    from './middleware/logger'
import { errorHandler }     from './middleware/errorHandler'
import { authRouter }       from './routes/auth'
import { categoriesRouter } from './routes/categories'
import { productsRouter }   from './routes/products'
import { inventoryRouter }  from './routes/inventory'

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

  // CORS: dozvoli zahteve sa Vite dev servera / Allow requests from Vite dev server
  app.use(cors({
    origin: [
      'http://localhost:5173', // Vite dev server
      'http://localhost:3000'  // alternativni port / alternative port
    ],
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
