/**
 * @file server/routes/settings.ts
 * @description API rute za upravljanje sistemskim podešavanjima.
 *              API routes for managing system settings.
 *
 * Rute / Routes:
 * - GET  /api/v1/settings/printer  → Vraća podešavanja štampača / Returns printer settings
 * - PUT  /api/v1/settings/printer  → Čuva podešavanja štampača (Admin) / Saves printer settings (Admin)
 */

import { Router } from 'express'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { getPrinterSettings, savePrinterSettings } from '../services/settingsService'

export const settingsRouter = Router()

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
