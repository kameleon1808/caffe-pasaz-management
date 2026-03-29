/**
 * @file src/api/apiClient.ts
 * @description Centralizovani API klijent sa tipizovanim greškama i retry logikom.
 *              Centralized API client with typed errors and retry logic.
 *
 * Sve API datoteke koriste ovaj modul umesto lokalnih req() helper funkcija.
 * All API files use this module instead of local req() helper functions.
 *
 * Tipovi grešaka / Error types:
 * - NetworkError   — nema konekcije, timeout
 * - AuthError      — 401 Unauthorized
 * - ForbiddenError — 403 Forbidden
 * - NotFoundError  — 404 Not Found
 * - ValidationError — 400 Bad Request
 * - ServerError    — 5xx greška servera
 * - ApiError       — ostale greške (bazna klasa)
 */

import { getAuthHeader } from '../utils/token'

// ─── Bazni URL ───────────────────────────────────────────────────────────────

export const API_BASE = 'http://localhost:3001/api/v1'

// ─── Tipovi grešaka / Error types ────────────────────────────────────────────

/**
 * Bazna klasa za sve API greške.
 * Base class for all API errors.
 */
export class ApiError extends Error {
  /** Mašinski čitljiv kod greške / Machine-readable error code */
  code:       string
  /** HTTP status kod / HTTP status code */
  statusCode: number
  /** Dodatne informacije / Additional details */
  details?:   unknown

  constructor(message: string, code: string, statusCode: number, details?: unknown) {
    super(message)
    this.name       = 'ApiError'
    this.code       = code
    this.statusCode = statusCode
    this.details    = details
  }
}

/** Greška validacije (400) / Validation error (400) */
export class ValidationError extends ApiError {
  constructor(message: string, code = 'VALIDATION_ERROR', details?: unknown) {
    super(message, code, 400, details)
    this.name = 'ValidationError'
  }
}

/** Greška autentifikacije (401) / Authentication error (401) */
export class AuthError extends ApiError {
  constructor(message: string, code = 'UNAUTHORIZED') {
    super(message, code, 401)
    this.name = 'AuthError'
  }
}

/** Greška zabrane pristupa (403) / Forbidden error (403) */
export class ForbiddenError extends ApiError {
  constructor(message: string, code = 'FORBIDDEN') {
    super(message, code, 403)
    this.name = 'ForbiddenError'
  }
}

/** Greška "nije pronađeno" (404) / Not found error (404) */
export class NotFoundError extends ApiError {
  constructor(message: string, code = 'NOT_FOUND') {
    super(message, code, 404)
    this.name = 'NotFoundError'
  }
}

/** Greška servera (5xx) / Server error (5xx) */
export class ServerError extends ApiError {
  constructor(message: string, code = 'SERVER_ERROR', statusCode = 500) {
    super(message, code, statusCode)
    this.name = 'ServerError'
  }
}

/** Greška mreže (nema konekcije) / Network error (no connection) */
export class NetworkError extends ApiError {
  constructor(message = 'Greška mreže / Network error') {
    super(message, 'NETWORK_ERROR', 0)
    this.name = 'NetworkError'
  }
}

// ─── Pomoćne funkcije / Helper functions ─────────────────────────────────────

/**
 * Parsira HTTP odgovor i baca odgovarajuću tipizovanu grešku.
 * Parses HTTP response and throws the appropriate typed error.
 */
function parseError(statusCode: number, code: string, message: string, details?: unknown): never {
  if (statusCode === 400) throw new ValidationError(message, code, details)
  if (statusCode === 401) throw new AuthError(message, code)
  if (statusCode === 403) throw new ForbiddenError(message, code)
  if (statusCode === 404) throw new NotFoundError(message, code)
  if (statusCode >= 500)  throw new ServerError(message, code, statusCode)
  throw new ApiError(message, code, statusCode, details)
}

/**
 * Obavlja HTTP zahtev bez Auth zaglavlja (za javne endpointe kao /auth/login).
 * Performs an HTTP request without Auth header (for public endpoints like /auth/login).
 *
 * @template T - Tip podataka u odgovoru / Response data type
 * @param {string}      path    - Relativna putanja (bez API_BASE) / Relative path
 * @param {RequestInit} options - Fetch opcije / Fetch options
 * @param {number}      [maxRetries=0] - Maks. pokušaji za mrežne greške / Max retries
 * @returns {Promise<T>}
 */
export async function publicRequest<T>(
  path: string,
  options: RequestInit = {},
  maxRetries = 0
): Promise<T> {
  return executeRequest<T>(`${API_BASE}${path}`, options, maxRetries)
}

/**
 * Obavlja autorizovani HTTP zahtev (Bearer token iz localStorage).
 * Performs an authorized HTTP request (Bearer token from localStorage).
 *
 * Automatski ponavlja zahtev do maxRetries puta pri mrežnoj grešci.
 * Automatically retries the request up to maxRetries times on network error.
 *
 * @template T - Tip podataka u odgovoru / Response data type
 * @param {string}      path    - Relativna putanja (bez API_BASE) / Relative path
 * @param {RequestInit} options - Fetch opcije / Fetch options
 * @param {number}      [maxRetries=3] - Maks. pokušaji za mrežne greške / Max retries
 * @returns {Promise<T>}
 */
export async function authRequest<T>(
  path: string,
  options: RequestInit = {},
  maxRetries = 3
): Promise<T> {
  const authHeader = getAuthHeader()
  if (!authHeader) throw new AuthError('Nije autentifikovan / Not authenticated')

  const mergedOptions: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization:  authHeader,
      ...options.headers,
    },
  }

  return executeRequest<T>(`${API_BASE}${path}`, mergedOptions, maxRetries)
}

/**
 * Interno — izvršava fetch sa retry logikom i obradom grešaka.
 * Internal — executes fetch with retry logic and error handling.
 */
async function executeRequest<T>(
  url: string,
  options: RequestInit,
  maxRetries: number
): Promise<T> {
  let lastError: Error | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)
      const json = await response.json() as Record<string, unknown>

      if (response.ok) {
        // Auth rute vraćaju { success: true, data: ... }, ostale rute vraćaju resurs direktno.
        // Auth routes return { success: true, data: ... }, other routes return the resource directly.
        if (json['success'] === true && 'data' in json) {
          return json['data'] as T
        }
        return json as T
      }

      // Greška — server vraća { success: false, error: { code, message, details? } }
      // Error — server returns { success: false, error: { code, message, details? } }
      const errObj  = json['error'] as { code?: string; message?: string; details?: unknown } | undefined
      const code    = errObj?.code    ?? 'UNKNOWN_ERROR'
      const message = errObj?.message ?? `HTTP ${response.status}`
      const details = errObj?.details
      // HTTP greške se ne ponavljaju — baci odmah / HTTP errors are not retried — throw immediately
      parseError(response.status, code, message, details)
    } catch (err) {
      // Mrežne greške (TypeError: Failed to fetch) — pokušaj ponovo
      // Network errors (TypeError: Failed to fetch) — retry
      if (err instanceof TypeError) {
        lastError = new NetworkError()
        if (attempt < maxRetries) {
          // Eksponencijalno čekanje: 500ms, 1000ms, 2000ms
          // Exponential backoff: 500ms, 1000ms, 2000ms
          await delay(500 * Math.pow(2, attempt))
          continue
        }
        throw lastError
      }
      // Sve ostale greške (ApiError itd.) — baci odmah bez ponovnog pokušaja
      // All other errors (ApiError etc.) — throw immediately without retry
      throw err
    }
  }

  throw lastError ?? new NetworkError()
}

/** Čeka dato broj milisekundi / Waits the given number of milliseconds */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
