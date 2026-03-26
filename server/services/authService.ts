/**
 * @file server/services/authService.ts
 * @description Servis za autentifikaciju — poslovna logika za login i upravljanje tokenima.
 *              Authentication service — business logic for login and token management.
 *
 * Odgovornosti / Responsibilities:
 * - Validacija korisničkih kredencijala / Validating user credentials
 * - Generisanje JWT tokena / Generating JWT tokens
 * - Komunikacija sa bazom podataka / Database communication
 */

import bcrypt from 'bcryptjs'
import jwt    from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { AppError } from '../middleware/errorHandler'

const prisma = new PrismaClient()

/**
 * Tip podataka koji se čuvaju u JWT tokenu.
 * Type of data stored in the JWT token.
 */
export interface JwtPayload {
  /** ID korisnika / User ID */
  userId:   number
  /** Korisničko ime / Username */
  username: string
  /** Puno ime / Full name */
  fullName: string
  /** Uloga korisnika / User role */
  role:     'ADMIN' | 'WAITER'
}

/**
 * Tip odgovora koji se vraća klijentu nakon uspešnog logina.
 * Type of response returned to the client after successful login.
 */
export interface LoginResponse {
  token: string
  user: {
    id:       number
    username: string
    fullName: string
    role:     'ADMIN' | 'WAITER'
  }
}

/**
 * Autentifikuje korisnika i vraća JWT token.
 * Authenticates a user and returns a JWT token.
 *
 * @param {string} username - Korisničko ime / Username
 * @param {string} password - Lozinka u plain textu / Plain text password
 * @returns {Promise<LoginResponse>} Token i podaci o korisniku / Token and user data
 * @throws {AppError} Ako su kredencijali pogrešni ili nalog nije aktivan / If credentials are wrong or account is inactive
 */
export async function loginUser(username: string, password: string): Promise<LoginResponse> {
  // Nađi korisnika u bazi / Find user in database
  const user = await prisma.user.findUnique({
    where: { username }
  })

  // Generička poruka greške (ne otkriva da li username postoji)
  // Generic error message (doesn't reveal if username exists)
  const invalidCredentialsError = new AppError(
    'Pogrešno korisničko ime ili lozinka / Invalid username or password',
    401,
    'INVALID_CREDENTIALS'
  )

  if (!user) {
    throw invalidCredentialsError
  }

  // Proveri da li je nalog aktivan / Check if account is active
  if (!user.active) {
    throw new AppError(
      'Nalog je deaktiviran. Kontaktirajte administratora / Account is deactivated. Contact administrator.',
      403,
      'ACCOUNT_INACTIVE'
    )
  }

  // Proveri lozinku / Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password)
  if (!isPasswordValid) {
    throw invalidCredentialsError
  }

  // Generiši JWT token / Generate JWT token
  const jwtSecret = process.env['JWT_SECRET']
  if (!jwtSecret) {
    throw new AppError(
      'Konfiguracija servera greška / Server configuration error',
      500,
      'CONFIG_ERROR'
    )
  }

  const payload: JwtPayload = {
    userId:   user.id,
    username: user.username,
    fullName: user.fullName,
    role:     user.role as 'ADMIN' | 'WAITER'
  }

  const expiresIn = process.env['JWT_EXPIRES_IN'] ?? '8h'
  const token = jwt.sign(payload, jwtSecret, { expiresIn } as jwt.SignOptions)

  return {
    token,
    user: {
      id:       user.id,
      username: user.username,
      fullName: user.fullName,
      role:     user.role as 'ADMIN' | 'WAITER'
    }
  }
}

/**
 * Vraća profil trenutno ulogovanog korisnika.
 * Returns the profile of the currently logged-in user.
 *
 * @param {number} userId - ID korisnika iz JWT tokena / User ID from JWT token
 * @returns {Promise<object>} Podaci o korisniku / User data
 * @throws {AppError} Ako korisnik ne postoji / If user doesn't exist
 */
export async function getUserProfile(userId: number) {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: {
      id:        true,
      username:  true,
      fullName:  true,
      role:      true,
      active:    true,
      createdAt: true
    }
  })

  if (!user) {
    throw new AppError(
      'Korisnik nije pronađen / User not found',
      404,
      'USER_NOT_FOUND'
    )
  }

  return user
}
