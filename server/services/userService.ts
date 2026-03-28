/**
 * @file server/services/userService.ts
 * @description Servis za upravljanje korisnicima sistema.
 *              Service for managing system users.
 *
 * Poslovna pravila / Business rules:
 * - Deaktivacija je "soft delete" (active = false), ne fizičko brisanje
 * - Korisnik ne može deaktivirati sam sebe
 * - Korisnik ne može biti deaktiviran dok ima aktivnu smenu
 * - Username mora biti jedinstven
 * - Lozinka se hešira bcryptjs-om
 *
 * - Deactivation is "soft delete" (active = false), not physical deletion
 * - A user cannot deactivate themselves
 * - A user cannot be deactivated while they have an active shift
 * - Username must be unique
 * - Password is hashed with bcryptjs
 */

import bcrypt      from 'bcryptjs'
import { prisma }  from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'

/** Tip za kreiranje korisnika / Type for creating a user */
export interface CreateUserData {
  fullName: string
  username: string
  password: string
  role:     string
}

/** Tip za izmenu korisnika / Type for updating a user */
export interface UpdateUserData {
  fullName?: string
  username?: string
  password?: string
}

/** Selektovana polja korisnika (bez lozinke) / Selected user fields (without password) */
const userSelect = {
  id:        true,
  username:  true,
  fullName:  true,
  role:      true,
  active:    true,
  createdAt: true,
  updatedAt: true,
} as const

/**
 * Vraća sve korisnike bez lozinke.
 * Returns all users without the password field.
 *
 * @returns {Promise<object[]>} Lista korisnika / List of users
 */
export async function getAll() {
  return prisma.user.findMany({
    select:  userSelect,
    orderBy: { createdAt: 'asc' },
  })
}

/**
 * Vraća jednog korisnika prema ID-u.
 * Returns a single user by ID.
 *
 * @param {number} id - ID korisnika / User ID
 * @throws {AppError} Ako korisnik nije pronađen / If user not found
 */
export async function getById(id: number) {
  const user = await prisma.user.findUnique({
    where:  { id },
    select: userSelect,
  })
  if (!user) {
    throw new AppError(
      `Korisnik sa ID ${id} nije pronađen / User with ID ${id} not found`,
      404,
      'USER_NOT_FOUND'
    )
  }
  return user
}

/**
 * Kreira novog korisnika sa heširanom lozinkom.
 * Creates a new user with a hashed password.
 *
 * @param {CreateUserData} data - Podaci za novog korisnika / Data for the new user
 * @throws {AppError} Ako username već postoji ili je rola nevažeća / If username exists or role is invalid
 */
export async function create(data: CreateUserData) {
  const validRoles = ['ADMIN', 'WAITER']
  if (!validRoles.includes(data.role)) {
    throw new AppError(
      `Nevažeća rola: ${data.role}. Dozvoljene: ${validRoles.join(', ')} / Invalid role: ${data.role}. Allowed: ${validRoles.join(', ')}`,
      400,
      'INVALID_ROLE'
    )
  }

  const existing = await prisma.user.findUnique({ where: { username: data.username } })
  if (existing) {
    throw new AppError(
      `Korisničko ime "${data.username}" je zauzeto / Username "${data.username}" is already taken`,
      409,
      'USERNAME_TAKEN'
    )
  }

  const hashed = await bcrypt.hash(data.password, 10)

  return prisma.user.create({
    data: {
      fullName: data.fullName.trim(),
      username: data.username.trim(),
      password: hashed,
      role:     data.role,
      active:   true,
    },
    select: userSelect,
  })
}

/**
 * Menja podatke korisnika.
 * Updates user data.
 *
 * @param {number}         id   - ID korisnika / User ID
 * @param {UpdateUserData} data - Polja za ažuriranje / Fields to update
 * @throws {AppError} Ako korisnik nije pronađen ili novi username je zauzet / If user not found or new username is taken
 */
export async function update(id: number, data: UpdateUserData) {
  await getById(id)

  if (data.username) {
    const conflict = await prisma.user.findFirst({
      where: { username: data.username, id: { not: id } },
    })
    if (conflict) {
      throw new AppError(
        `Korisničko ime "${data.username}" je zauzeto / Username "${data.username}" is already taken`,
        409,
        'USERNAME_TAKEN'
      )
    }
  }

  const updateData: {
    fullName?: string
    username?: string
    password?: string
  } = {}

  if (data.fullName !== undefined) updateData.fullName = data.fullName.trim()
  if (data.username !== undefined) updateData.username = data.username.trim()
  if (data.password !== undefined && data.password.trim() !== '') {
    updateData.password = await bcrypt.hash(data.password, 10)
  }

  return prisma.user.update({
    where:  { id },
    data:   updateData,
    select: userSelect,
  })
}

/**
 * Deaktivira korisnika (soft delete).
 * Deactivates a user (soft delete).
 *
 * @param {number} id            - ID korisnika za deaktivaciju / User ID to deactivate
 * @param {number} currentUserId - ID trenutno ulogovanog korisnika / Currently logged-in user ID
 * @throws {AppError} Ako korisnik pokušava da deaktivira sam sebe / If user tries to deactivate themselves
 * @throws {AppError} Ako korisnik ima aktivnu smenu / If user has an active shift
 */
export async function deactivate(id: number, currentUserId: number) {
  if (id === currentUserId) {
    throw new AppError(
      'Ne možete deaktivirati sopstveni nalog / You cannot deactivate your own account',
      400,
      'CANNOT_DEACTIVATE_SELF'
    )
  }

  await getById(id)

  const activeShift = await prisma.shift.findFirst({
    where: { userId: id, endedAt: null },
  })
  if (activeShift) {
    throw new AppError(
      'Korisnik ima aktivnu smenu. Završite smenu pre deaktivacije / User has an active shift. End the shift before deactivating.',
      409,
      'USER_HAS_ACTIVE_SHIFT'
    )
  }

  return prisma.user.update({
    where:  { id },
    data:   { active: false },
    select: userSelect,
  })
}

/**
 * Reaktivira prethodno deaktiviranog korisnika.
 * Reactivates a previously deactivated user.
 *
 * @param {number} id - ID korisnika / User ID
 * @throws {AppError} Ako korisnik nije pronađen / If user not found
 */
export async function reactivate(id: number) {
  await getById(id)

  return prisma.user.update({
    where:  { id },
    data:   { active: true },
    select: userSelect,
  })
}
