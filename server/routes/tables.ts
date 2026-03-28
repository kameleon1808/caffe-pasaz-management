/**
 * @file server/routes/tables.ts
 * @description Rute za upravljanje stolovima u kafeu.
 *              Routes for managing cafe tables.
 *
 * Endpointi / Endpoints:
 * GET    /api/v1/tables              → lista aktivnih stolova sa statusom / list active tables with status
 * GET    /api/v1/tables/:id          → jedan sto / single table
 * POST   /api/v1/tables              → kreiraj sto (admin) / create table (admin)
 * PUT    /api/v1/tables/:id          → izmeni sto (admin) / update table (admin)
 * PUT    /api/v1/tables/:id/position → izmeni poziciju (admin) / update position (admin)
 * DELETE /api/v1/tables/:id          → soft delete (admin) / soft delete (admin)
 */

import { Router, Request, Response, NextFunction } from 'express'
import { requireAuth, requireAdmin }               from '../middleware/auth'
import { AppError }                                from '../middleware/errorHandler'
import {
  getAllTables,
  getTableById,
  createTable,
  updateTable,
  updateTablePosition,
  deleteTable,
} from '../services/tableService'

export const tablesRouter = Router()

/**
 * GET /api/v1/tables
 * Lista svih aktivnih stolova sa statusom otvorenog računa.
 * List all active tables with open bill status.
 *
 * @query {string} [zone] - Filter po zoni: "INDOOR" | "OUTDOOR" / Filter by zone
 */
tablesRouter.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const zone   = req.query['zone'] as string | undefined
    const tables = await getAllTables(zone)
    res.json({ success: true, data: tables })
  } catch (e) { next(e) }
})

/**
 * GET /api/v1/tables/:id
 * Vraća jedan sto prema ID-u.
 * Returns a single table by ID.
 */
tablesRouter.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params['id']!, 10)
    if (isNaN(id)) throw new AppError('Nevažeći ID / Invalid ID', 400, 'VALIDATION_ERROR')

    const table = await getTableById(id)
    res.json({ success: true, data: table })
  } catch (e) { next(e) }
})

/**
 * POST /api/v1/tables
 * Kreira novi sto (samo admin).
 * Creates a new table (admin only).
 *
 * @body {string} label     - Oznaka stola (obavezno) / Table label (required)
 * @body {string} zone      - Zona: "INDOOR" | "OUTDOOR" (obavezno) / Zone (required)
 * @body {number} [positionX] - X pozicija / X position
 * @body {number} [positionY] - Y pozicija / Y position
 */
tablesRouter.post('/', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { label, zone, positionX, positionY } = req.body as {
      label?: string; zone?: string; positionX?: number; positionY?: number
    }

    if (!label?.trim()) throw new AppError('Oznaka stola je obavezna / Table label is required', 400, 'VALIDATION_ERROR')
    if (!zone?.trim())  throw new AppError('Zona je obavezna / Zone is required', 400, 'VALIDATION_ERROR')

    const table = await createTable({
      label: label.trim(),
      zone:  zone.trim(),
      positionX,
      positionY,
    })
    res.status(201).json({ success: true, data: table })
  } catch (e) { next(e) }
})

/**
 * PUT /api/v1/tables/:id
 * Menja podatke stola (samo admin).
 * Updates table data (admin only).
 */
tablesRouter.put('/:id', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params['id']!, 10)
    if (isNaN(id)) throw new AppError('Nevažeći ID / Invalid ID', 400, 'VALIDATION_ERROR')

    const { label, zone, positionX, positionY, active } = req.body as {
      label?: string; zone?: string; positionX?: number; positionY?: number; active?: boolean
    }

    const table = await updateTable(id, {
      ...(label     !== undefined ? { label: label.trim() } : {}),
      ...(zone      !== undefined ? { zone: zone.trim() }   : {}),
      ...(positionX !== undefined ? { positionX }           : {}),
      ...(positionY !== undefined ? { positionY }           : {}),
      ...(active    !== undefined ? { active }              : {}),
    })
    res.json({ success: true, data: table })
  } catch (e) { next(e) }
})

/**
 * PUT /api/v1/tables/:id/position
 * Ažurira samo poziciju stola (za layout editor, admin only).
 * Updates only the table's position (for layout editor, admin only).
 *
 * @body {number} positionX - Nova X pozicija / New X position
 * @body {number} positionY - Nova Y pozicija / New Y position
 */
tablesRouter.put('/:id/position', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params['id']!, 10)
    if (isNaN(id)) throw new AppError('Nevažeći ID / Invalid ID', 400, 'VALIDATION_ERROR')

    const { positionX, positionY } = req.body as { positionX?: number; positionY?: number }

    if (positionX === undefined || positionY === undefined) {
      throw new AppError('positionX i positionY su obavezni / positionX and positionY are required', 400, 'VALIDATION_ERROR')
    }

    const table = await updateTablePosition(id, { positionX, positionY })
    res.json({ success: true, data: table })
  } catch (e) { next(e) }
})

/**
 * DELETE /api/v1/tables/:id
 * Deaktivira sto (soft delete, admin only).
 * Deactivates a table (soft delete, admin only).
 */
tablesRouter.delete('/:id', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params['id']!, 10)
    if (isNaN(id)) throw new AppError('Nevažeći ID / Invalid ID', 400, 'VALIDATION_ERROR')

    await deleteTable(id)
    res.json({ success: true, message: 'Sto je deaktiviran / Table deactivated' })
  } catch (e) { next(e) }
})
