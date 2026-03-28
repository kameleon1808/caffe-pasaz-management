/**
 * @file server/routes/reports.ts
 * @description Rute za finansijske izveštaje (admin only).
 *              Routes for financial reports (admin only).
 *
 * Endpointi / Endpoints:
 * GET /api/v1/reports/daily    → dnevni izveštaj / daily report
 * GET /api/v1/reports/weekly   → nedeljni izveštaj / weekly report
 * GET /api/v1/reports/monthly  → mesečni izveštaj / monthly report
 * GET /api/v1/reports/custom   → prilagođeni period / custom period
 */

import { Router, Request, Response, NextFunction } from 'express'
import { requireAuth, requireAdmin }               from '../middleware/auth'
import { AppError }                                from '../middleware/errorHandler'
import {
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  getCustomReport,
} from '../services/reportService'

export const reportsRouter = Router()

// Svi endpointi zahtevaju auth + admin / All endpoints require auth + admin
reportsRouter.use(requireAuth, requireAdmin)

/**
 * Vraća tekući ponedeljak u formatu YYYY-MM-DD.
 * Returns the current Monday in YYYY-MM-DD format.
 */
function getCurrentMonday(): string {
  const now  = new Date()
  const day  = now.getDay()                // 0 = ned, 1 = pon...
  const diff = day === 0 ? -6 : 1 - day   // pomak do ponedeljka / shift to Monday
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  return monday.toISOString().slice(0, 10)
}

/**
 * GET /api/v1/reports/daily
 * Dnevni finansijski izveštaj.
 * Daily financial report.
 *
 * @query {string} [date] - Datum YYYY-MM-DD (default: danas / today)
 */
reportsRouter.get('/daily', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const date = (req.query['date'] as string | undefined) ?? new Date().toISOString().slice(0, 10)

    // Validacija formata / Format validation
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new AppError('Nevažeći format datuma. Koristite YYYY-MM-DD. / Invalid date format. Use YYYY-MM-DD.', 400, 'VALIDATION_ERROR')
    }

    const data = await getDailyReport(date)
    res.json({ success: true, data })
  } catch (e) { next(e) }
})

/**
 * GET /api/v1/reports/weekly
 * Nedeljni finansijski izveštaj.
 * Weekly financial report.
 *
 * @query {string} [weekStart] - Datum ponedeljka YYYY-MM-DD (default: ovaj ponedeljak / this Monday)
 */
reportsRouter.get('/weekly', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const weekStart = (req.query['weekStart'] as string | undefined) ?? getCurrentMonday()

    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      throw new AppError('Nevažeći format datuma. Koristite YYYY-MM-DD. / Invalid date format. Use YYYY-MM-DD.', 400, 'VALIDATION_ERROR')
    }

    const data = await getWeeklyReport(weekStart)
    res.json({ success: true, data })
  } catch (e) { next(e) }
})

/**
 * GET /api/v1/reports/monthly
 * Mesečni finansijski izveštaj.
 * Monthly financial report.
 *
 * @query {string} [month] - Mesec YYYY-MM (default: tekući mesec / current month)
 */
reportsRouter.get('/monthly', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const month = (req.query['month'] as string | undefined) ?? new Date().toISOString().slice(0, 7)

    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new AppError('Nevažeći format meseca. Koristite YYYY-MM. / Invalid month format. Use YYYY-MM.', 400, 'VALIDATION_ERROR')
    }

    const data = await getMonthlyReport(month)
    res.json({ success: true, data })
  } catch (e) { next(e) }
})

/**
 * GET /api/v1/reports/custom
 * Izveštaj za prilagođeni period.
 * Report for a custom date range.
 *
 * @query {string} dateFrom - Početni datum YYYY-MM-DD / Start date YYYY-MM-DD
 * @query {string} dateTo   - Krajnji datum YYYY-MM-DD / End date YYYY-MM-DD
 */
reportsRouter.get('/custom', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dateFrom, dateTo } = req.query as { dateFrom?: string; dateTo?: string }

    if (!dateFrom || !dateTo) {
      throw new AppError('dateFrom i dateTo su obavezni / dateFrom and dateTo are required', 400, 'VALIDATION_ERROR')
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
      throw new AppError('Nevažeći format datuma. Koristite YYYY-MM-DD. / Invalid date format. Use YYYY-MM-DD.', 400, 'VALIDATION_ERROR')
    }

    if (dateFrom > dateTo) {
      throw new AppError('dateFrom mora biti pre dateTo / dateFrom must be before dateTo', 400, 'VALIDATION_ERROR')
    }

    const data = await getCustomReport(dateFrom, dateTo)
    res.json({ success: true, data })
  } catch (e) { next(e) }
})
