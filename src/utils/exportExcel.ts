/**
 * @file src/utils/exportExcel.ts
 * @description Pomoćna funkcija za generisanje Excel izveštaja korišćenjem exceljs biblioteke.
 *              Helper utility for generating Excel reports using the exceljs library.
 *
 * Koristi se u browser/renderer procesu Electron aplikacije.
 * Used in the browser/renderer process of the Electron app.
 */

import ExcelJS from 'exceljs'

import type { CafeSettings } from '../api/settings'
import type { ReportData }   from '../api/reports'

// ─── Tipovi / Types ────────────────────────────────────────────────────────────

/**
 * Opcije za Excel export izveštaja.
 * Options for Excel report export.
 */
export interface ExcelExportOptions {
  /** Naslov dokumenta / Document title */
  title:        string
  /** Naziv fajla za preuzimanje / Download filename */
  filename:     string
  /** Podešavanja kafića za zaglavlje / Cafe settings for header */
  cafeSettings: CafeSettings
  /** Podaci izveštaja / Report data */
  reportData:   ReportData
  /** Jezik za prikaz naziva artikala / Language for product names */
  lang:         'sr' | 'en'
}

// ─── Konstante / Constants ────────────────────────────────────────────────────

const BLUE_FILL: ExcelJS.Fill = {
  type:    'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF3B82F6' },
}

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold:  true,
  color: { argb: 'FFFFFFFF' },
  size:  11,
}

// ─── Pomoćne funkcije / Helper functions ──────────────────────────────────────

/**
 * Primenjuje stil na header red radnog lista.
 * Applies style to a header row of a worksheet.
 */
function styleHeaderRow(row: ExcelJS.Row): void {
  row.eachCell(cell => {
    cell.fill   = BLUE_FILL
    cell.font   = HEADER_FONT
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })
  row.height = 22
}

/**
 * Formatira datum/vreme iz ISO stringa.
 * Formats datetime from ISO string.
 */
function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('sr-RS', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── Glavna funkcija / Main function ─────────────────────────────────────────

/**
 * Generiše Excel (.xlsx) izveštaj i pokreće preuzimanje u pregledaču.
 * Generates an Excel (.xlsx) report and triggers download in the browser.
 *
 * Radni listovi / Worksheets:
 * 1. "Promet"     — sažetak prometa (ključ/vrednost) / revenue summary (key/value)
 * 2. "Prodaja"    — top artikli / top products
 * 3. "Konobari"   — promet po konobaru/smeni / revenue by waiter/shift
 * 4. "Kategorije" — raspodela po kategorijama / category breakdown
 *
 * @param {ExcelExportOptions} options - Opcije za export / Export options
 * @returns {Promise<void>}
 */
export async function exportReportToExcel(options: ExcelExportOptions): Promise<void> {
  const { title, filename, cafeSettings, reportData, lang } = options
  const { summary, topProducts, revenueByWaiter, categoryBreakdown } = reportData

  const workbook = new ExcelJS.Workbook()
  workbook.creator  = cafeSettings.cafe_name ?? 'Kafić Pasaz'
  workbook.created  = new Date()
  workbook.modified = new Date()

  // ── List 1: Promet / Revenue Summary ────────────────────────────────────────
  const sheetPromet = workbook.addWorksheet('Promet')

  // Širine kolona / Column widths
  sheetPromet.columns = [
    { header: 'Polje',    key: 'key',   width: 30 },
    { header: 'Vrednost', key: 'value', width: 24 },
  ]
  styleHeaderRow(sheetPromet.getRow(1))

  const currency = cafeSettings.currency ?? 'RSD'
  const fmtAmt   = (n: number) => `${n.toLocaleString('sr-RS')} ${currency}`

  // Podaci o kafeu / Cafe info
  sheetPromet.addRow({ key: 'Kafić',   value: cafeSettings.cafe_name    ?? '' })
  sheetPromet.addRow({ key: 'Adresa',  value: cafeSettings.cafe_address ?? '' })
  sheetPromet.addRow({ key: 'PIB',     value: cafeSettings.cafe_pib     ?? '' })
  sheetPromet.addRow({})
  sheetPromet.addRow({ key: 'Izveštaj', value: title })
  sheetPromet.addRow({})

  // Sažetak prometa / Revenue summary
  sheetPromet.addRow({ key: 'Ukupan promet',  value: fmtAmt(summary.total) })
  sheetPromet.addRow({ key: 'Belo',           value: fmtAmt(summary.white) })
  sheetPromet.addRow({ key: 'Crno',           value: fmtAmt(summary.black) })
  sheetPromet.addRow({ key: 'Broj računa',    value: summary.billCount })
  sheetPromet.addRow({ key: 'Prosečan račun', value: fmtAmt(summary.avgBill) })
  sheetPromet.addRow({})
  sheetPromet.addRow({ key: 'Generisano', value: new Date().toLocaleString('sr-RS') })

  // ── List 2: Prodaja / Top Products ──────────────────────────────────────────
  const sheetProdaja = workbook.addWorksheet('Prodaja')
  sheetProdaja.columns = [
    { header: 'Artikal',  key: 'name',     width: 36 },
    { header: 'Količina', key: 'quantity', width: 14 },
    { header: 'Iznos',    key: 'amount',   width: 20 },
  ]
  styleHeaderRow(sheetProdaja.getRow(1))

  topProducts.forEach((p, i) => {
    const row = sheetProdaja.addRow({
      name:     lang === 'en' ? p.nameEn : p.nameSr,
      quantity: p.quantity,
      amount:   fmtAmt(p.amount),
    })
    if (i % 2 === 1) {
      row.eachCell(cell => {
        cell.fill = {
          type:    'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF3F4F6' },
        }
      })
    }
  })

  // ── List 3: Konobari / Waiters ───────────────────────────────────────────────
  const sheetKonobari = workbook.addWorksheet('Konobari')
  sheetKonobari.columns = [
    { header: 'Konobar',   key: 'fullName',   width: 24 },
    { header: 'Od',        key: 'shiftStart', width: 20 },
    { header: 'Do',        key: 'shiftEnd',   width: 20 },
    { header: 'Promet',    key: 'total',      width: 20 },
    { header: 'Belo',      key: 'white',      width: 18 },
    { header: 'Crno',      key: 'black',      width: 18 },
    { header: 'Računa',    key: 'billCount',  width: 12 },
  ]
  styleHeaderRow(sheetKonobari.getRow(1))

  revenueByWaiter.forEach((w, i) => {
    const row = sheetKonobari.addRow({
      fullName:   w.fullName,
      shiftStart: fmtDateTime(w.shiftStart),
      shiftEnd:   w.shiftEnd ? fmtDateTime(w.shiftEnd) : 'Aktivna',
      total:      fmtAmt(w.total),
      white:      fmtAmt(w.white),
      black:      fmtAmt(w.black),
      billCount:  w.billCount,
    })
    if (i % 2 === 1) {
      row.eachCell(cell => {
        cell.fill = {
          type:    'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF3F4F6' },
        }
      })
    }
  })

  // ── List 4: Kategorije / Categories ─────────────────────────────────────────
  const sheetKategorije = workbook.addWorksheet('Kategorije')
  sheetKategorije.columns = [
    { header: 'Kategorija', key: 'name',  width: 28 },
    { header: 'Iznos',      key: 'total', width: 20 },
  ]
  styleHeaderRow(sheetKategorije.getRow(1))

  categoryBreakdown.forEach((c, i) => {
    const row = sheetKategorije.addRow({
      name:  lang === 'en' ? c.nameEn : c.nameSr,
      total: fmtAmt(c.total),
    })
    if (i % 2 === 1) {
      row.eachCell(cell => {
        cell.fill = {
          type:    'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF3F4F6' },
        }
      })
    }
  })

  // ── Generisanje i preuzimanje fajla / Generate and download file ─────────────
  const buffer = await workbook.xlsx.writeBuffer()
  const blob   = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
