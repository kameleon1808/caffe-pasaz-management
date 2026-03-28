/**
 * @file server/routes/dashboard.ts
 * @description Rute za admin dashboard statistiku (admin only).
 *              Routes for admin dashboard statistics (admin only).
 *
 * Endpointi / Endpoints:
 * GET /api/v1/dashboard  → sve dashboard statistike / all dashboard statistics
 */

import { Router, Request, Response, NextFunction } from 'express'
import { requireAuth, requireAdmin }               from '../middleware/auth'
import { getDashboardData }                        from '../services/dashboardService'

export const dashboardRouter = Router()

// Svi endpointi zahtevaju auth + admin / All endpoints require auth + admin
dashboardRouter.use(requireAuth, requireAdmin)

/**
 * GET /api/v1/dashboard
 * Vraća sve statistike za admin dashboard.
 * Returns all statistics for the admin dashboard.
 *
 * @returns {DashboardData} Dashboard podaci / Dashboard data
 */
dashboardRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getDashboardData()
    res.json(data)
  } catch (error) {
    next(error)
  }
})
