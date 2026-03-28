/**
 * @file server/routes/print.ts
 * @description API rute za štampanje računa na POS termalnom štampaču.
 *              API routes for printing receipts on a POS thermal printer.
 *
 * Rute / Routes:
 * - POST /api/v1/print/receipt/:billId  → Štampa naplaćeni račun / Prints a paid receipt
 * - POST /api/v1/print/test             → Štampa testnu stranicu / Prints a test page
 */

import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { getBillById }       from '../services/billService'
import { getPrinterSettings } from '../services/settingsService'
import { printReceipt, printTestPage, loadCafeInfo, loadPrinterConfig } from '../lib/printerService'

export const printRouter = Router()

// ─── POST /print/receipt/:billId ────────────────────────────────────────────

/**
 * Štampa račun prema ID-u.
 * Prints a receipt by bill ID.
 *
 * Koristi se i pri naplati (automatski) i za ponovnu štampu.
 * Used both at payment (automatic) and for reprinting.
 *
 * @route   POST /api/v1/print/receipt/:billId
 * @access  Protected (svi ulogovani korisnici / all logged-in users)
 * @param   billId - ID računa za štampanje / Bill ID to print
 * @returns { success, message } - Status štampanja / Print status
 */
printRouter.post('/receipt/:billId', requireAuth, async (req, res, next) => {
  try {
    const billId = parseInt(req.params['billId'], 10)
    if (isNaN(billId)) {
      res.status(400).json({ error: 'Nevažeći ID računa / Invalid bill ID' })
      return
    }

    const [bill, config, cafe] = await Promise.all([
      getBillById(billId),
      loadPrinterConfig(),
      loadCafeInfo(),
    ])

    if (config.type === 'disabled') {
      res.status(503).json({
        error:   'Štampač je onesposobljen / Printer is disabled',
        code:    'PRINTER_DISABLED'
      })
      return
    }

    const billData = {
      id:              bill.id,
      tableLabel:      bill.tableUnit.label,
      waiterName:      bill.user.fullName,
      createdAt:       bill.createdAt,
      paidAt:          bill.paidAt,
      discountPercent: bill.discountPercent,
      total:           bill.total,
      whiteTotal:      bill.whiteTotal,
      blackTotal:      bill.blackTotal,
      items:           bill.items.map(item => ({
        nameSr:    item.product.nameSr,
        quantity:  item.quantity,
        unitPrice: item.unitPrice,
        discount:  item.discount,
      })),
    }

    await printReceipt(billData, config, cafe)

    res.json({ success: true, message: 'Račun je odštampan / Receipt printed' })
  } catch (err) {
    // Ne prosleđujemo grešku dalje — vraćamo 503 sa porukom
    // Don't forward error — return 503 with message
    const message = err instanceof Error ? err.message : 'Greška štampača / Printer error'
    res.status(503).json({
      error:   message,
      code:    'PRINTER_ERROR'
    })
  }
})

// ─── POST /print/test ────────────────────────────────────────────────────────

/**
 * Štampa testnu stranicu za proveru konekcije štampača.
 * Prints a test page to verify printer connection.
 *
 * @route   POST /api/v1/print/test
 * @access  Protected (svi ulogovani korisnici / all logged-in users)
 * @returns { success, message } - Status štampanja / Print status
 */
printRouter.post('/test', requireAuth, async (_req, res) => {
  try {
    const [config, cafe] = await Promise.all([
      loadPrinterConfig(),
      loadCafeInfo(),
    ])

    if (config.type === 'disabled') {
      res.status(503).json({
        error: 'Štampač je onesposobljen. Konfigurisajte štampač u podešavanjima. / Printer is disabled. Configure it in settings.',
        code:  'PRINTER_DISABLED'
      })
      return
    }

    await printTestPage(config, cafe)

    res.json({ success: true, message: 'Test stranica je odštampana / Test page printed' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Greška štampača / Printer error'
    res.status(503).json({
      error:   message,
      code:    'PRINTER_ERROR'
    })
  }
})

// ─── GET /print/config ───────────────────────────────────────────────────────

/**
 * Vraća trenutnu konfiguraciju štampača (bez osetljivih podataka).
 * Returns current printer configuration (without sensitive data).
 *
 * @route   GET /api/v1/print/config
 * @access  Protected (svi ulogovani korisnici / all logged-in users)
 */
printRouter.get('/config', requireAuth, async (_req, res, next) => {
  try {
    const settings = await getPrinterSettings()
    res.json(settings)
  } catch (err) {
    next(err)
  }
})
