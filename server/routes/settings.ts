/**
 * @file server/routes/settings.ts
 * @description API rute za upravljanje sistemskim podešavanjima.
 *              API routes for managing system settings.
 *
 * Rute / Routes:
 * - GET  /api/v1/settings          → Vraća sva podešavanja / Returns all settings
 * - PUT  /api/v1/settings          → Bulk update podešavanja (Admin) / Bulk update settings (Admin)
 * - GET  /api/v1/settings/printer  → Vraća podešavanja štampača / Returns printer settings
 * - PUT  /api/v1/settings/printer  → Čuva podešavanja štampača (Admin) / Saves printer settings (Admin)
 */

import { Router, Request, Response, NextFunction } from 'express'
import { requireAuth, requireAdmin } from '../middleware/auth'
import {
  getPrinterSettings, savePrinterSettings,
  getAllSettings, bulkUpsert
} from '../services/settingsService'

export const settingsRouter = Router()

// ─── GET /settings ──────────────────────────────────────────────────────────

/**
 * Vraća sva podešavanja kao {key: value} objekt.
 * Returns all settings as a {key: value} object.
 *
 * @route   GET /api/v1/settings
 * @access  Protected (svi ulogovani korisnici / all logged-in users)
 */
settingsRouter.get('/', requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await getAllSettings()
    res.json({ success: true, data: settings })
  } catch (err) {
    next(err)
  }
})

// ─── PUT /settings ──────────────────────────────────────────────────────────

/**
 * Bulk update podešavanja (samo admin).
 * Bulk update settings (admin only).
 *
 * @route   PUT /api/v1/settings
 * @access  Admin only
 * @body    {{ settings: Record<string, string> }} Podešavanja za čuvanje / Settings to save
 */
settingsRouter.put('/', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { settings } = req.body as { settings?: Record<string, string> }
    if (!settings || typeof settings !== 'object') {
      res.status(400).json({ error: 'settings objekat je obavezan / settings object is required' })
      return
    }
    await bulkUpsert(settings)
    const updated = await getAllSettings()
    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
})

// ─── GET /settings/printer ─────────────────────────────────────────────────

/**
 * Vraća trenutna podešavanja štampača.
 * Returns current printer settings.
 *
 * @route   GET /api/v1/settings/printer
 * @access  Protected (svi ulogovani korisnici / all logged-in users)
 */
settingsRouter.get('/printer', requireAuth, async (_req, res, next) => {
  try {
    const settings = await getPrinterSettings()
    res.json(settings)
  } catch (err) {
    next(err)
  }
})

// ─── PUT /settings/printer ─────────────────────────────────────────────────

/**
 * Čuva podešavanja štampača (samo admin).
 * Saves printer settings (admin only).
 *
 * @route   PUT /api/v1/settings/printer
 * @access  Admin only
 * @body    {Partial<PrinterSettings>} Podešavanja za čuvanje / Settings to save
 */
settingsRouter.put('/printer', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const updated = await savePrinterSettings(req.body)
    res.json(updated)
  } catch (err) {
    next(err)
  }
})
