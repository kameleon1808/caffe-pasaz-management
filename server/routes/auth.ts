/**
 * @file server/routes/auth.ts
 * @description Rute za autentifikaciju korisnika.
 *              Authentication routes.
 *
 * Dostupni endpointi / Available endpoints:
 * - POST /api/v1/auth/login  → Prijava korisnika / User login
 * - GET  /api/v1/auth/me     → Profil ulogovanog korisnika / Logged-in user profile
 * - POST /api/v1/auth/logout → Odjava (frontend briše token) / Logout (frontend deletes token)
 *
 * Primer zahteva za login / Login request example:
 * POST /api/v1/auth/login
 * { "username": "admin", "password": "admin123" }
 *
 * Primer odgovora / Response example:
 * {
 *   "success": true,
 *   "data": {
 *     "token": "eyJhbGci...",
 *     "user": { "id": 1, "username": "admin", "fullName": "Administrator", "role": "ADMIN" }
 *   }
 * }
 */

import { Router, Request, Response, NextFunction } from 'express'
import { loginUser, getUserProfile }                from '../services/authService'
import { requireAuth }                              from '../middleware/auth'
import { AppError }                                 from '../middleware/errorHandler'

export const authRouter = Router()

/**
 * POST /api/v1/auth/login
 * Prijava korisnika sa username i password.
 * User login with username and password.
 *
 * @body {string} username - Korisničko ime / Username
 * @body {string} password - Lozinka / Password
 * @returns {object} JWT token i podaci o korisniku / JWT token and user data
 */
authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body as { username?: string; password?: string }

    // Validacija ulaznih podataka / Input validation
    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      throw new AppError(
        'Korisničko ime je obavezno / Username is required',
        400,
        'VALIDATION_ERROR'
      )
    }

    if (!password || typeof password !== 'string' || password.length === 0) {
      throw new AppError(
        'Lozinka je obavezna / Password is required',
        400,
        'VALIDATION_ERROR'
      )
    }

    if (username.trim().length > 50) {
      throw new AppError(
        'Korisničko ime je predugačko / Username is too long',
        400,
        'VALIDATION_ERROR'
      )
    }

    const result = await loginUser(username.trim(), password)

    res.status(200).json({
      success: true,
      data:    result
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/v1/auth/me
 * Vraća profil trenutno ulogovanog korisnika.
 * Returns the profile of the currently logged-in user.
 *
 * @header {string} Authorization - Bearer JWT token
 * @returns {object} Podaci o korisniku / User data
 */
authRouter.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // req.user je popunjen od strane requireAuth middleware-a
    // req.user is populated by the requireAuth middleware
    const userId = req.user!.userId
    const profile = await getUserProfile(userId)

    res.status(200).json({
      success: true,
      data:    profile
    })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/v1/auth/logout
 * Odjava korisnika — frontend samo briše token iz local storage.
 * User logout — frontend simply deletes the token from local storage.
 * Server ne čuva token listu, pa nema šta server-side da radi.
 * Server doesn't keep token list, so there's nothing server-side to do.
 *
 * @header {string} Authorization - Bearer JWT token
 */
authRouter.post('/logout', requireAuth, (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Uspešno ste se odjavili / Successfully logged out'
  })
})
