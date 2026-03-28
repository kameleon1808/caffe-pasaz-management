/**
 * @file server/services/tableService.ts
 * @description Servis za upravljanje stolovima u kafeu.
 *              Service for managing cafe tables.
 *
 * Poslovna pravila / Business rules:
 * - Brisanje je "soft delete" (active = false), ne fizičko brisanje
 * - Zona mora biti "INDOOR" ili "OUTDOOR"
 * - isOccupied se izvodi iz postojanja otvorenog računa
 * - Deletion is "soft delete" (active = false), not physical deletion
 * - Zone must be "INDOOR" or "OUTDOOR"
 * - isOccupied is derived from the existence of an open bill
 */

import { prisma }   from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'

/** Dozvoljene zone / Allowed zones */
const VALID_ZONES = ['INDOOR', 'OUTDOOR'] as const
type ZoneValue = typeof VALID_ZONES[number]

/** Tip za kreiranje stola / Type for creating a table */
export interface CreateTableData {
  label:      string
  zone:       string
  positionX?: number
  positionY?: number
}

/** Tip za izmenu stola / Type for updating a table */
export interface UpdateTableData {
  label?:     string
  zone?:      string
  positionX?: number
  positionY?: number
  active?:    boolean
}

/** Tip za izmenu pozicije stola / Type for updating table position */
export interface UpdateTablePositionData {
  positionX: number
  positionY: number
}

/**
 * Proverava da li je zona validna.
 * Validates that the zone is valid.
 *
 * @param {string} zone - Zona za validaciju / Zone to validate
 * @throws {AppError} Ako zona nije validna / If zone is not valid
 */
function validateZone(zone: string): asserts zone is ZoneValue {
  if (!VALID_ZONES.includes(zone as ZoneValue)) {
    throw new AppError(
      `Nevažeća zona "${zone}". Dozvoljene vrednosti: ${VALID_ZONES.join(', ')} / ` +
      `Invalid zone "${zone}". Allowed values: ${VALID_ZONES.join(', ')}`,
      400, 'VALIDATION_ERROR'
    )
  }
}

/**
 * Vraća sve aktivne stolove sa statusom otvorenog računa.
 * Returns all active tables with open bill status.
 *
 * @param {string} [zone] - Opcioni filter po zoni / Optional zone filter
 */
export async function getAllTables(zone?: string) {
  if (zone) validateZone(zone)

  const tables = await prisma.tableUnit.findMany({
    where: {
      active: true,
      ...(zone ? { zone } : {})
    },
    include: {
      bills: {
        where:  { status: 'OPEN' },
        select: { id: true, total: true }
      }
    },
    orderBy: [{ zone: 'asc' }, { label: 'asc' }]
  })

  return tables.map(table => {
    const openBill     = table.bills[0] ?? null
    const openBillTotal = openBill ? openBill.total : 0
    const openBillId   = openBill ? openBill.id : null

    return {
      id:          table.id,
      label:       table.label,
      zone:        table.zone,
      positionX:   table.positionX,
      positionY:   table.positionY,
      isOccupied:  openBill !== null,
      active:      table.active,
      openBillTotal,
      openBillId,
    }
  })
}

/**
 * Vraća jedan sto prema ID-u.
 * Returns a single table by ID.
 *
 * @param {number} id - ID stola / Table ID
 * @throws {AppError} Ako sto nije pronađen / If table not found
 */
export async function getTableById(id: number) {
  const table = await prisma.tableUnit.findUnique({
    where: { id },
    include: {
      bills: {
        where:  { status: 'OPEN' },
        select: { id: true, total: true }
      }
    }
  })

  if (!table) {
    throw new AppError(
      `Sto sa ID ${id} nije pronađen / Table with ID ${id} not found`,
      404, 'TABLE_NOT_FOUND'
    )
  }

  const openBill = table.bills[0] ?? null

  return {
    id:           table.id,
    label:        table.label,
    zone:         table.zone,
    positionX:    table.positionX,
    positionY:    table.positionY,
    isOccupied:   openBill !== null,
    active:       table.active,
    openBillTotal: openBill ? openBill.total : 0,
    openBillId:   openBill ? openBill.id : null,
  }
}

/**
 * Kreira novi sto.
 * Creates a new table.
 *
 * @param {CreateTableData} data - Podaci za novi sto / Data for the new table
 * @throws {AppError} Ako naziv već postoji u zoni / If label already exists in zone
 */
export async function createTable(data: CreateTableData) {
  validateZone(data.zone)

  // Proveri duplikate u istoj zoni / Check for duplicates in the same zone
  const existing = await prisma.tableUnit.findFirst({
    where: { label: data.label, zone: data.zone, active: true }
  })

  if (existing) {
    throw new AppError(
      `Sto sa oznakom "${data.label}" već postoji u ovoj zoni / ` +
      `Table with label "${data.label}" already exists in this zone`,
      409, 'TABLE_DUPLICATE'
    )
  }

  return prisma.tableUnit.create({
    data: {
      label:     data.label,
      zone:      data.zone,
      positionX: data.positionX ?? 0,
      positionY: data.positionY ?? 0,
      isOccupied: false,
      active:    true
    }
  })
}

/**
 * Menja podatke stola.
 * Updates table data.
 *
 * @param {number}          id   - ID stola / Table ID
 * @param {UpdateTableData} data - Polja za ažuriranje / Fields to update
 * @throws {AppError} Ako sto nije pronađen / If table not found
 */
export async function updateTable(id: number, data: UpdateTableData) {
  await getTableById(id) // baca AppError ako ne postoji / throws AppError if not found

  if (data.zone) validateZone(data.zone)

  return prisma.tableUnit.update({
    where: { id },
    data
  })
}

/**
 * Ažurira samo poziciju stola (za layout editor).
 * Updates only the table's position (for layout editor).
 *
 * @param {number}                  id   - ID stola / Table ID
 * @param {UpdateTablePositionData} data - Nova pozicija / New position
 * @throws {AppError} Ako sto nije pronađen / If table not found
 */
export async function updateTablePosition(id: number, data: UpdateTablePositionData) {
  await getTableById(id)

  return prisma.tableUnit.update({
    where: { id },
    data:  { positionX: data.positionX, positionY: data.positionY }
  })
}

/**
 * Deaktivira sto (soft delete).
 * Deactivates a table (soft delete).
 *
 * @param {number} id - ID stola / Table ID
 * @throws {AppError} Ako sto ima otvorene račune / If table has open bills
 */
export async function deleteTable(id: number) {
  await getTableById(id)

  // Ne dozvoli brisanje ako ima otvorenih računa / Don't allow deletion if there are open bills
  const openBills = await prisma.bill.count({
    where: { tableId: id, status: 'OPEN' }
  })

  if (openBills > 0) {
    throw new AppError(
      `Sto ima ${openBills} otvorenih računa. Zatvorite ih pre brisanja. / ` +
      `Table has ${openBills} open bills. Close them before deleting.`,
      409, 'TABLE_HAS_OPEN_BILLS'
    )
  }

  return prisma.tableUnit.update({ where: { id }, data: { active: false } })
}

/**
 * Proverava da li je sto slobodan (nema otvorenih računa).
 * Checks if a table is available (no open bills).
 *
 * @param {number} id - ID stola / Table ID
 * @returns {Promise<boolean>} true ako je slobodan / true if available
 */
export async function checkTableAvailable(id: number): Promise<boolean> {
  const openBills = await prisma.bill.count({
    where: { tableId: id, status: 'OPEN' }
  })
  return openBills === 0
}
