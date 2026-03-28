/**
 * @file server/routes/bills.ts
 * @description Rute za upravljanje računima.
 *              Routes for bill management.
 *
 * Sve rute zahtevaju autentifikaciju.
 * All routes require authentication.
 */

import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import {
  getBillById,
  createBill,
  getOpenBillForTable,
  addItem,
  updateItem,
  removeItem,
  setDiscount,
  transferTable,
  payBill,
  cancelBill,
} from '../services/billService'

export const billsRouter = Router()

// NAPOMENA: specifičnije rute moraju biti pre parametarskih!
// NOTE: more specific routes must come before parameterized ones!

/**
 * GET /api/v1/bills/table/:tableId
 * Vraća otvoren račun za dati sto, ili 404 ako ne postoji.
 * Returns the open bill for the given table, or 404 if none.
 */
billsRouter.get('/table/:tableId', requireAuth, async (req, res, next) => {
  try {
    const tableId = parseInt(req.params['tableId'] ?? '', 10)
    if (isNaN(tableId)) {
      res.status(400).json({ error: 'Nevažeći ID stola / Invalid table ID' })
      return
    }
    const bill = await getOpenBillForTable(tableId)
    if (!bill) {
      res.status(404).json({ error: 'Nema otvorenog računa za ovaj sto / No open bill for this table' })
      return
    }
    res.json(bill)
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/v1/bills/:id
 * Vraća jedan račun sa svim stavkama.
 * Returns a single bill with all items.
 */
billsRouter.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params['id'] ?? '', 10)
    if (isNaN(id)) {
      res.status(400).json({ error: 'Nevažeći ID / Invalid ID' })
      return
    }
    const bill = await getBillById(id)
    res.json(bill)
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/v1/bills
 * Kreira novi račun za dati sto.
 * Creates a new bill for the given table.
 *
 * Body: { tableId: number }
 */
billsRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const { tableId } = req.body as { tableId?: number }
    if (!tableId || typeof tableId !== 'number') {
      res.status(400).json({ error: 'tableId je obavezan / tableId is required' })
      return
    }
    const userId = req.user!.userId
    const bill   = await createBill(tableId, userId)
    res.status(201).json(bill)
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/v1/bills/:id/items
 * Dodaje stavku na račun.
 * Adds an item to the bill.
 *
 * Body: { productId: number, color?: 'WHITE' | 'BLACK' }
 */
billsRouter.post('/:id/items', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params['id'] ?? '', 10)
    if (isNaN(id)) {
      res.status(400).json({ error: 'Nevažeći ID / Invalid ID' })
      return
    }
    const { productId, color } = req.body as { productId?: number; color?: string }
    if (!productId || typeof productId !== 'number') {
      res.status(400).json({ error: 'productId je obavezan / productId is required' })
      return
    }
    const bill = await addItem(id, productId, color)
    res.json(bill)
  } catch (err) {
    next(err)
  }
})

/**
 * PUT /api/v1/bills/:id/items/:itemId
 * Menja stavku na računu.
 * Updates a bill item.
 *
 * Body: { quantity?: number, unitPrice?: number, discount?: number, color?: string }
 */
billsRouter.put('/:id/items/:itemId', requireAuth, async (req, res, next) => {
  try {
    const id     = parseInt(req.params['id']     ?? '', 10)
    const itemId = parseInt(req.params['itemId'] ?? '', 10)
    if (isNaN(id) || isNaN(itemId)) {
      res.status(400).json({ error: 'Nevažeći ID / Invalid ID' })
      return
    }
    const data = req.body as { quantity?: number; unitPrice?: number; discount?: number; color?: string }
    const bill = await updateItem(id, itemId, data)
    res.json(bill)
  } catch (err) {
    next(err)
  }
})

/**
 * DELETE /api/v1/bills/:id/items/:itemId
 * Briše stavku sa računa.
 * Removes an item from the bill.
 */
billsRouter.delete('/:id/items/:itemId', requireAuth, async (req, res, next) => {
  try {
    const id     = parseInt(req.params['id']     ?? '', 10)
    const itemId = parseInt(req.params['itemId'] ?? '', 10)
    if (isNaN(id) || isNaN(itemId)) {
      res.status(400).json({ error: 'Nevažeći ID / Invalid ID' })
      return
    }
    const bill = await removeItem(id, itemId)
    res.json(bill)
  } catch (err) {
    next(err)
  }
})

/**
 * PUT /api/v1/bills/:id/discount
 * Postavlja popust na račun.
 * Sets bill-level discount.
 *
 * Body: { discountPercent: number }
 */
billsRouter.put('/:id/discount', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params['id'] ?? '', 10)
    if (isNaN(id)) {
      res.status(400).json({ error: 'Nevažeći ID / Invalid ID' })
      return
    }
    const { discountPercent } = req.body as { discountPercent?: number }
    if (discountPercent === undefined || typeof discountPercent !== 'number') {
      res.status(400).json({ error: 'discountPercent je obavezan / discountPercent is required' })
      return
    }
    const bill = await setDiscount(id, discountPercent)
    res.json(bill)
  } catch (err) {
    next(err)
  }
})

/**
 * PUT /api/v1/bills/:id/transfer
 * Prebacuje račun na drugi sto.
 * Transfers the bill to another table.
 *
 * Body: { tableId: number }
 */
billsRouter.put('/:id/transfer', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params['id'] ?? '', 10)
    if (isNaN(id)) {
      res.status(400).json({ error: 'Nevažeći ID / Invalid ID' })
      return
    }
    const { tableId } = req.body as { tableId?: number }
    if (!tableId || typeof tableId !== 'number') {
      res.status(400).json({ error: 'tableId je obavezan / tableId is required' })
      return
    }
    const bill = await transferTable(id, tableId)
    res.json(bill)
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/v1/bills/:id/pay
 * Naplaćuje račun.
 * Pays the bill.
 */
billsRouter.post('/:id/pay', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params['id'] ?? '', 10)
    if (isNaN(id)) {
      res.status(400).json({ error: 'Nevažeći ID / Invalid ID' })
      return
    }
    const bill = await payBill(id)
    res.json(bill)
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/v1/bills/:id/cancel
 * Otkazuje račun.
 * Cancels the bill.
 *
 * Body: { reason: string }
 */
billsRouter.post('/:id/cancel', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params['id'] ?? '', 10)
    if (isNaN(id)) {
      res.status(400).json({ error: 'Nevažeći ID / Invalid ID' })
      return
    }
    const { reason } = req.body as { reason?: string }
    if (!reason?.trim()) {
      res.status(400).json({ error: 'Razlog otkazivanja je obavezan / Cancellation reason is required' })
      return
    }
    const bill = await cancelBill(id, reason)
    res.json(bill)
  } catch (err) {
    next(err)
  }
})
