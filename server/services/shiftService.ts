/**
 * @file server/services/shiftService.ts
 * @description Servis za upravljanje smenama konobara.
 *              Service for managing waiter shifts.
 *
 * Poslovna pravila / Business rules:
 * - Korisnik može imati samo jednu aktivnu smenu u isto vreme
 * - Smena se ne može završiti ako ima otvorenih računa
 * - A user can only have one active shift at a time
 * - A shift cannot be ended if there are open bills
 */

import { prisma }   from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'

/**
 * Vraća aktivnu smenu za datog korisnika, ili null ako nema.
 * Returns the active shift for the given user, or null if none.
 *
 * @param {number} userId - ID korisnika / User ID
 * @returns {Promise<Shift | null>} Aktivna smena ili null / Active shift or null
 */
export async function getActiveShift(userId: number) {
  return prisma.shift.findFirst({
    where:   { userId, endedAt: null },
    include: {
      user: {
        select: { id: true, fullName: true, username: true }
      }
    },
    orderBy: { startedAt: 'desc' }
  })
}

/**
 * Počinje novu smenu za korisnika.
 * Starts a new shift for the user.
 *
 * @param {number} userId - ID korisnika / User ID
 * @returns {Promise<Shift>} Nova smena / New shift
 * @throws {AppError} Ako korisnik već ima aktivnu smenu / If user already has an active shift
 */
export async function startShift(userId: number) {
  const existing = await getActiveShift(userId)

  if (existing) {
    throw new AppError(
      'Već imate aktivnu smenu / You already have an active shift',
      409, 'SHIFT_ALREADY_ACTIVE',
      { shiftId: existing.id, startedAt: existing.startedAt }
    )
  }

  return prisma.shift.create({
    data: {
      userId,
      startedAt:    new Date(),
      totalWhite:   0,
      totalBlack:   0,
      totalRevenue: 0
    },
    include: {
      user: {
        select: { id: true, fullName: true, username: true }
      }
    }
  })
}

/**
 * Završava aktivnu smenu za korisnika.
 * Ends the active shift for the user.
 *
 * @param {number} userId - ID korisnika / User ID
 * @returns {Promise<Shift>} Završena smena / Ended shift
 * @throws {AppError} Ako nema aktivne smene / If no active shift
 * @throws {AppError} Ako ima otvorenih računa / If there are open bills
 */
export async function endShift(userId: number) {
  const active = await getActiveShift(userId)

  if (!active) {
    throw new AppError(
      'Nemate aktivnu smenu / You do not have an active shift',
      404, 'SHIFT_NOT_ACTIVE'
    )
  }

  // Proveri otvorene račune u ovoj smeni / Check for open bills in this shift
  const openBills = await prisma.bill.count({
    where: { shiftId: active.id, status: 'OPEN' }
  })

  if (openBills > 0) {
    throw new AppError(
      `Ne možete završiti smenu dok imate ${openBills} otvorenih računa / ` +
      `You cannot end your shift while there are ${openBills} open bills`,
      409, 'SHIFT_HAS_OPEN_BILLS',
      { openBills }
    )
  }

  // Izračunaj ukupne prihode iz plaćenih računa ove smene
  // Calculate total revenue from paid bills of this shift
  const revenueAgg = await prisma.bill.aggregate({
    where:  { shiftId: active.id, status: 'PAID' },
    _sum:   { total: true, whiteTotal: true, blackTotal: true }
  })

  return prisma.shift.update({
    where: { id: active.id },
    data: {
      endedAt:      new Date(),
      totalRevenue: revenueAgg._sum.total      ?? 0,
      totalWhite:   revenueAgg._sum.whiteTotal ?? 0,
      totalBlack:   revenueAgg._sum.blackTotal ?? 0,
    },
    include: {
      user: {
        select: { id: true, fullName: true, username: true }
      }
    }
  })
}

/**
 * Vraća istoriju smena za korisnika.
 * Returns shift history for the user.
 *
 * @param {number} userId - ID korisnika / User ID
 * @param {number} [limit=20] - Maksimalan broj zapisa / Maximum number of records
 * @returns {Promise<Shift[]>} Lista smena / List of shifts
 */
export async function getShiftHistory(userId: number, limit = 20) {
  return prisma.shift.findMany({
    where:   { userId },
    include: {
      user: {
        select: { id: true, fullName: true, username: true }
      }
    },
    orderBy: { startedAt: 'desc' },
    take:    limit
  })
}
