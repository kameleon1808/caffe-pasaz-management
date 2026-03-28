/**
 * @file server/routes/users.ts
 * @description Rute za CRUD upravljanje korisnicima (samo admin).
 *              Routes for user CRUD management (admin only).
 *
 * Svi endpointi zahtevaju autentifikaciju i admin rolu.
 * All endpoints require authentication and admin role.
 *
 * Endpointi / Endpoints:
 * GET    /api/v1/users            → lista korisnika / list users
 * POST   /api/v1/users            → novi korisnik / new user
 * PUT    /api/v1/users/:id        → izmena korisnika / update user
 * DELETE /api/v1/users/:id        → deaktivacija (soft delete)
 * PUT    /api/v1/users/:id/reactivate → reaktivacija / reactivation
 */

import { Router, Request, Response, NextFunction } from 'express'
import { requireAuth, requireAdmin }               from '../middleware/auth'
import { AppError }                                from '../middleware/errorHandler'
import { getAll, getById, create, update, deactivate, reactivate } from '../services/userService'

export const usersRouter = Router()

// Svi endpointi zahtevaju auth + admin / All endpoints require auth + admin
usersRouter.use(requireAuth, requireAdmin)

/**
 * GET /api/v1/users
 * Lista svih korisnika bez lozinke.
 * List of all users without password.
 */
usersRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await getAll()
    res.json({ success: true, data: users })
  } catch (e) { next(e) }
})

/**
 * GET /api/v1/users/:id
 * Jedan korisnik prema ID-u.
 * Single user by ID.
 */
usersRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params['id']!, 10)
    if (isNaN(id)) throw new AppError('Nevažeći ID / Invalid ID', 400, 'VALIDATION_ERROR')

    const user = await getById(id)
    res.json({ success: true, data: user })
  } catch (e) { next(e) }
})

/**
 * POST /api/v1/users
 * Kreira novog korisnika.
 * Creates a new user.
 *
 * @body {string} fullName - Puno ime (obavezno) / Full name (required)
 * @body {string} username - Korisničko ime (obavezno) / Username (required)
 * @body {string} password - Lozinka min 6 znakova (obavezno) / Password min 6 chars (required)
 * @body {string} role     - Rola: ADMIN|WAITER (obavezno) / Role: ADMIN|WAITER (required)
 */
usersRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fullName, username, password, role } = req.body as {
      fullName?: string; username?: string; password?: string; role?: string
    }

    if (!fullName?.trim())  throw new AppError('Ime je obavezno / Full name is required', 400, 'VALIDATION_ERROR')
    if (!username?.trim())  throw new AppError('Korisničko ime je obavezno / Username is required', 400, 'VALIDATION_ERROR')
    if (!password?.trim())  throw new AppError('Lozinka je obavezna / Password is required', 400, 'VALIDATION_ERROR')
    if (password.trim().length < 6) throw new AppError('Lozinka mora imati najmanje 6 karaktera / Password must be at least 6 characters', 400, 'VALIDATION_ERROR')
    if (!role?.trim())      throw new AppError('Rola je obavezna / Role is required', 400, 'VALIDATION_ERROR')

    const user = await create({ fullName: fullName.trim(), username: username.trim(), password: password.trim(), role: role.trim() })
    res.status(201).json({ success: true, data: user })
  } catch (e) { next(e) }
})

/**
 * PUT /api/v1/users/:id
 * Menja podatke korisnika.
 * Updates user data.
 */
usersRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params['id']!, 10)
    if (isNaN(id)) throw new AppError('Nevažeći ID / Invalid ID', 400, 'VALIDATION_ERROR')

    const { fullName, username, password } = req.body as {
      fullName?: string; username?: string; password?: string
    }

    if (password !== undefined && password.trim() !== '' && password.trim().length < 6) {
      throw new AppError('Lozinka mora imati najmanje 6 karaktera / Password must be at least 6 characters', 400, 'VALIDATION_ERROR')
    }

    const user = await update(id, {
      ...(fullName !== undefined ? { fullName } : {}),
      ...(username !== undefined ? { username } : {}),
      ...(password !== undefined ? { password } : {}),
    })
    res.json({ success: true, data: user })
  } catch (e) { next(e) }
})

/**
 * DELETE /api/v1/users/:id
 * Deaktivira korisnika (soft delete).
 * Deactivates a user (soft delete).
 */
usersRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params['id']!, 10)
    if (isNaN(id)) throw new AppError('Nevažeći ID / Invalid ID', 400, 'VALIDATION_ERROR')

    const currentUserId = req.user!.userId
    await deactivate(id, currentUserId)
    res.json({ success: true, message: 'Korisnik deaktiviran / User deactivated' })
  } catch (e) { next(e) }
})

/**
 * PUT /api/v1/users/:id/reactivate
 * Reaktivira korisnika.
 * Reactivates a user.
 */
usersRouter.put('/:id/reactivate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params['id']!, 10)
    if (isNaN(id)) throw new AppError('Nevažeći ID / Invalid ID', 400, 'VALIDATION_ERROR')

    const user = await reactivate(id)
    res.json({ success: true, data: user })
  } catch (e) { next(e) }
})
