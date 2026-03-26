/**
 * @file server/middleware/errorHandler.ts
 * @description Centralizovani middleware za obradu grešaka.
 *              Centralized error handling middleware.
 *
 * Sve greške u Express ruti koje se proslede kroz next(error) bivaju uhvaćene ovde.
 * All errors in Express routes passed through next(error) are caught here.
 *
 * Format odgovora greške / Error response format:
 * {
 *   "success": false,
 *   "error": {
 *     "code": "VALIDATION_ERROR",
 *     "message": "Poruka greške / Error message",
 *     "details": { ... }  // opciono / optional
 *   }
 * }
 */

import { Request, Response, NextFunction } from 'express'

/**
 * Tip za aplikacione greške sa statusom i kodom.
 * Type for application errors with status and code.
 */
export class AppError extends Error {
  /** HTTP status kod / HTTP status code */
  public readonly statusCode: number
  /** Interni kod greške / Internal error code */
  public readonly code: string
  /** Dodatni detalji / Additional details */
  public readonly details?: unknown

  /**
   * @param {string}  message    - Poruka greške / Error message
   * @param {number}  statusCode - HTTP status kod (default: 500) / HTTP status code (default: 500)
   * @param {string}  code       - Interni kod greške / Internal error code
   * @param {unknown} details    - Opcioni detalji / Optional details
   */
  constructor(
    message:    string,
    statusCode: number  = 500,
    code:       string  = 'INTERNAL_ERROR',
    details?:   unknown
  ) {
    super(message)
    this.name       = 'AppError'
    this.statusCode = statusCode
    this.code       = code
    this.details    = details
  }
}

/**
 * Centralizovani error handler middleware.
 * Centralized error handler middleware.
 *
 * Mora imati 4 parametra da bi Express prepoznao kao error handler.
 * Must have 4 parameters for Express to recognize as error handler.
 *
 * @param {unknown}      err  - Uhvaćena greška / Caught error
 * @param {Request}      req  - Express zahtev / Express request
 * @param {Response}     res  - Express odgovor / Express response
 * @param {NextFunction} next - Sledeći middleware (nije korišćen ali mora biti / not used but must be present)
 */
export function errorHandler(
  err:  unknown,
  req:  Request,
  res:  Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  // AppError — naše poznate greške / our known errors
  if (err instanceof AppError) {
    console.error(`[Error] ${err.code}: ${err.message}`)
    res.status(err.statusCode).json({
      success: false,
      error: {
        code:    err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {})
      }
    })
    return
  }

  // Prisma greške / Prisma errors
  if (isObject(err) && 'code' in err) {
    const prismaError = err as { code: string; message: string }
    if (typeof prismaError.code === 'string' && prismaError.code.startsWith('P')) {
      console.error(`[Prisma Error] ${prismaError.code}: ${prismaError.message}`)
      res.status(500).json({
        success: false,
        error: {
          code:    'DATABASE_ERROR',
          message: 'Greška u bazi podataka / Database error'
        }
      })
      return
    }
  }

  // JWT greške / JWT errors
  if (err instanceof Error) {
    if (err.name === 'JsonWebTokenError') {
      res.status(401).json({
        success: false,
        error: {
          code:    'INVALID_TOKEN',
          message: 'Nevažeći token / Invalid token'
        }
      })
      return
    }

    if (err.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        error: {
          code:    'TOKEN_EXPIRED',
          message: 'Token je istekao / Token has expired'
        }
      })
      return
    }

    // Generalna greška / General error
    console.error('[Unexpected Error]', err)
    res.status(500).json({
      success: false,
      error: {
        code:    'INTERNAL_ERROR',
        message: process.env['NODE_ENV'] === 'development'
          ? err.message
          : 'Interna greška servera / Internal server error'
      }
    })
    return
  }

  // Nepoznata greška / Unknown error
  console.error('[Unknown Error]', err)
  res.status(500).json({
    success: false,
    error: {
      code:    'UNKNOWN_ERROR',
      message: 'Nepoznata greška / Unknown error'
    }
  })
}

/**
 * Proverava da li je vrednost objekat.
 * Checks if a value is an object.
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
