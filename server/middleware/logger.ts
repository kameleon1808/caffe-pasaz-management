/**
 * @file server/middleware/logger.ts
 * @description Middleware za logovanje HTTP zahteva.
 *              Middleware for logging HTTP requests.
 *
 * Loguje svaki zahtev sa metodom, URL-om, status kodom i vremenom odziva.
 * Logs every request with method, URL, status code, and response time.
 */

import { Request, Response, NextFunction } from 'express'

/**
 * Middleware koji loguje detalje svakog HTTP zahteva.
 * Middleware that logs details of every HTTP request.
 *
 * @param {Request}      req  - Express zahtev / Express request
 * @param {Response}     res  - Express odgovor / Express response
 * @param {NextFunction} next - Sledeći middleware / Next middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now()
  const { method, url } = req

  // Loguj nakon što se odgovor pošalje / Log after response is sent
  res.on('finish', () => {
    const duration    = Date.now() - startTime
    const statusCode  = res.statusCode
    const statusColor = getStatusColor(statusCode)

    console.log(
      `[API] ${statusColor}${method.padEnd(7)} ${statusCode}\x1b[0m ${url} — ${duration}ms`
    )
  })

  next()
}

/**
 * Vraća ANSI boju za status kod.
 * Returns ANSI color for a status code.
 *
 * @param {number} statusCode - HTTP status kod / HTTP status code
 * @returns {string} ANSI kod boje / ANSI color code
 */
function getStatusColor(statusCode: number): string {
  if (statusCode >= 500) return '\x1b[31m' // crvena / red
  if (statusCode >= 400) return '\x1b[33m' // žuta / yellow
  if (statusCode >= 300) return '\x1b[36m' // cijan / cyan
  if (statusCode >= 200) return '\x1b[32m' // zelena / green
  return '\x1b[0m'
}
