/**
 * @file server/services/salaryService.ts
 * @description Servis za upravljanje isplatama plata.
 *              Service for managing salary payments.
 *
 * Poslovna pravila / Business rules:
 * - Iznos mora biti veći od 0
 * - Korisnik koji prima platu mora postojati
 * - Svaka isplata pamti ko ju je izvršio (paidById)
 *
 * - Amount must be greater than 0
 * - The user receiving the salary must exist
 * - Every payment records who executed it (paidById)
 */

import { prisma }   from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'

/** Filteri za pretragu isplata / Filters for salary search */
export interface SalaryFilters {
  userId?:   number
  dateFrom?: string
  dateTo?:   string
}

/** Tip za kreiranje isplate / Type for creating a salary payment */
export interface CreateSalaryData {
  userId:   number
  amount:   number
  note?:    string
  paidAt?:  string
  paidById: number
}

/** Include definicija za relacije / Include definition for relations */
const salaryInclude = {
  user:   { select: { id: true, fullName: true, username: true } },
  paidBy: { select: { id: true, fullName: true, username: true } },
} as const

/**
 * Vraća sve isplate plate sa opcionalnim filterima.
 * Returns all salary payments with optional filters.
 *
 * @param {SalaryFilters} filters - Opcioni filteri / Optional filters
 * @returns {Promise<object[]>} Lista isplata sa info o korisnicima / List of payments with user info
 */
export async function getAll(filters: SalaryFilters = {}) {
  const where: {
    userId?: number
    paidAt?: { gte?: Date; lte?: Date }
  } = {}

  if (filters.userId) {
    where.userId = filters.userId
  }

  if (filters.dateFrom || filters.dateTo) {
    where.paidAt = {}
    if (filters.dateFrom) where.paidAt.gte = new Date(filters.dateFrom)
    if (filters.dateTo)   where.paidAt.lte = new Date(filters.dateTo + 'T23:59:59')
  }

  return prisma.salary.findMany({
    where,
    include:  salaryInclude,
    orderBy:  { paidAt: 'desc' },
  })
}

/**
 * Kreira novu isplatu plate.
 * Creates a new salary payment.
 *
 * @param {CreateSalaryData} data - Podaci o isplati / Payment data
 * @throws {AppError} Ako iznos nije pozitivan ili korisnik ne postoji / If amount is not positive or user doesn't exist
 */
export async function create(data: CreateSalaryData) {
  if (data.amount <= 0) {
    throw new AppError(
      'Iznos mora biti veći od 0 / Amount must be greater than 0',
      400,
      'INVALID_AMOUNT'
    )
  }

  const user = await prisma.user.findUnique({ where: { id: data.userId } })
  if (!user) {
    throw new AppError(
      `Korisnik sa ID ${data.userId} nije pronađen / User with ID ${data.userId} not found`,
      404,
      'USER_NOT_FOUND'
    )
  }

  return prisma.salary.create({
    data: {
      userId:   data.userId,
      amount:   data.amount,
      note:     data.note,
      paidAt:   data.paidAt ? new Date(data.paidAt) : new Date(),
      paidById: data.paidById,
    },
    include: salaryInclude,
  })
}
