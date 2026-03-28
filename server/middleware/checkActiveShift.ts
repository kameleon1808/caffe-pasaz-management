/**
 * @file server/middleware/checkActiveShift.ts
 * @description Middleware koji proverava da li autentifikovani korisnik ima aktivnu smenu.
 *              Middleware that checks if the authenticated user has an active shift.
 *
 * Mora se koristiti POSLE requireAuth jer zahteva req.user.
 * Must be used AFTER requireAuth because it requires req.user.
 *
 * Ako korisnik nema aktivnu smenu, vraća 403 grešku.
 * If the user has no active shift, returns a 403 error.
 */

import { Request, Response, NextFunction } from 'express'
import { AppError }        from './errorHandler'
import { getActiveShift }  from '../services/shiftService'

/**
 * Proverava da li autentifikovani korisnik ima aktivnu smenu.
 * Checks if the authenticated user has an active shift.
 *
 * @param {Request}      req  - Express zahtev (mora imati req.user od requireAuth) / Express request (must have req.user from requireAuth)
 * @param {Response}     _res - Express odgovor / Express response
 * @param {NextFunction} next - Sledeći middleware / Next middleware
 */
export async function checkActiveShift(
  req:  Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    return next(new AppError(
      'Nije autentifikovan / Not authenticated',
      401,
      'NOT_AUTHENTICATED'
    ))
  }

  try {
    const shift = await getActiveShift(req.user.userId)

    if (!shift) {
      return next(new AppError(
        'Nemate aktivnu smenu. Pokrenite smenu pre rada. / ' +
        'You do not have an active shift. Start a shift before working.',
        403,
        'NO_ACTIVE_SHIFT'
      ))
    }

    next()
  } catch (error) {
    next(error)
  }
}
