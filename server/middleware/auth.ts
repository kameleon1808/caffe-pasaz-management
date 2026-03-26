/**
 * @file server/middleware/auth.ts
 * @description Middleware za autentifikaciju i autorizaciju korisnika.
 *              Middleware for user authentication and authorization.
 *
 * Pruža dva middleware-a:
 * - requireAuth: proverava da li je korisnik ulogovan (JWT token)
 * - requireAdmin: proverava da li je korisnik administrator
 *
 * Provides two middlewares:
 * - requireAuth: checks if user is logged in (JWT token)
 * - requireAdmin: checks if user is an administrator
 */

import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { AppError } from './errorHandler'
import type { JwtPayload } from '../services/authService'

// Proširujemo Express Request tip da uključi korisnika
// Extending Express Request type to include the user
declare global {
  namespace Express {
    interface Request {
      /** Ulogovani korisnik iz JWT tokena / Logged-in user from JWT token */
      user?: JwtPayload
    }
  }
}

/**
 * Middleware koji zahteva autentifikovan zahtev (JWT token).
 * Middleware that requires an authenticated request (JWT token).
 *
 * Očekuje header: `Authorization: Bearer <token>`
 * Expects header: `Authorization: Bearer <token>`
 *
 * @param {Request}      req  - Express zahtev / Express request
 * @param {Response}     res  - Express odgovor / Express response
 * @param {NextFunction} next - Sledeći middleware / Next middleware
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(
      'Pristup odbijen — token nije pronađen / Access denied — token not found',
      401,
      'NO_TOKEN'
    ))
  }

  const token     = authHeader.substring(7)
  const jwtSecret = process.env['JWT_SECRET']

  if (!jwtSecret) {
    return next(new AppError(
      'Konfiguracija servera greška / Server configuration error',
      500,
      'CONFIG_ERROR'
    ))
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload
    req.user = decoded
    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Middleware koji zahteva admin rolu.
 * Middleware that requires the admin role.
 *
 * Mora se koristiti POSLE requireAuth.
 * Must be used AFTER requireAuth.
 *
 * @param {Request}      req  - Express zahtev / Express request
 * @param {Response}     res  - Express odgovor / Express response
 * @param {NextFunction} next - Sledeći middleware / Next middleware
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new AppError(
      'Nije autentifikovan / Not authenticated',
      401,
      'NOT_AUTHENTICATED'
    ))
  }

  if (req.user.role !== 'ADMIN') {
    return next(new AppError(
      'Nemate dozvolu za ovu akciju / You do not have permission for this action',
      403,
      'FORBIDDEN'
    ))
  }

  next()
}
