/**
 * @file src/utils/exportPdf.ts
 * @description Pomoćna funkcija za generisanje PDF izveštaja korišćenjem pdfmake biblioteke.
 *              Helper utility for generating PDF reports using the pdfmake library.
 *
 * Koristi se u browser/renderer procesu Electron aplikacije.
 * Used in the browser/renderer process of the Electron app.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
import pdfMakeLib from 'pdfmake/build/pdfmake'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import * as pdfFonts from 'pdfmake/build/vfs_fonts'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pdfMake = pdfMakeLib as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fonts = pdfFonts as any
pdfMake.vfs = fonts.pdfMake ? fonts.pdfMake.vfs : fonts.vfs

import type { CafeSettings }  from '../api/settings'
import type { ReportData }    from '../api/reports'

// ─── Tipovi / Types ────────────────────────────────────────────────────────────

/**
 * Opcije za PDF export izveštaja.
 * Options for PDF report export.
 */
export interface PdfExportOptions {
  /** Naslov dokumenta, npr. "Dnevni izveštaj — 28.03.2026" / Document title */
  title:        string
  /** Naziv fajla za preuzimanje, npr. "izvestaj_dnevni_2026-03-28.pdf" / Download filename */
  filename:     string
  /** Podešavanja kafića za zaglavlje / Cafe settings for header */
  cafeSettings: CafeSettings
  /** Podaci izveštaja / Report data */
  reportData:   ReportData
  /** Jezik za prikaz naziva artikala / Language for product names */
  lang:         'sr' | 'en'
}

// ─── Pomoćne funkcije / Helper functions ──────────────────────────────────────

/**
 * Formatira broj kao iznos u RSD.
 * Formats a number as an RSD amount.
 */
function fmtRsd(amount: number): string {
  return `${amount.toLocaleString('sr-RS', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} RSD`
}

/**
 * Formatira datum iz ISO stringa u lokalni format.
 * Formats a date from ISO string to local format.
 */
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('sr-RS', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  })
}

// ─── Boje / Colors ────────────────────────────────────────────────────────────
const BLUE_HEADER = '#3b82f6'
const WHITE_TEXT  = '#ffffff'
const GRAY_ROW    = '#f3f4f6'

// ─── Glavna funkcija / Main function ─────────────────────────────────────────

/**
 * Generiše PDF izveštaj i pokreće preuzimanje u pregledaču.
 * Generates a PDF report and triggers download in the browser.
 *
 * Struktura dokumenta / Document structure:
 * 1. Zaglavlje kafića (naziv, adresa, PIB) / Cafe header (name, address, PIB)
 * 2. Naslov izveštaja / Report title
 * 3. Sažetak prometa / Revenue summary
 * 4. Top 10 artikala / Top 10 products
 * 5. Promet po konobaru / Revenue by waiter
 * 6. Footer sa datumom generisanja / Footer with generation date
 *
 * @param {PdfExportOptions} options - Opcije za export / Export options
 */
export function exportReportToPdf(options: PdfExportOptions): void {
  const { title, filename, cafeSettings, reportData, lang } = options
  const { summary, topProducts, revenueByWaiter }           = reportData

  // ── Zaglavlje kafića / Cafe header ──────────────────────────────────────────
  const headerTable = {
    table: {
      widths: ['*'],
      body:   [
        [{ text: cafeSettings.cafe_name    ?? 'Kafić Pasaz', style: 'cafeNameHeader' }],
        [{ text: cafeSettings.cafe_address ?? '',             style: 'cafeInfo' }],
        [{ text: cafeSettings.cafe_pib ? `PIB: ${cafeSettings.cafe_pib}` : '', style: 'cafeInfo' }],
      ]
    },
    layout: 'noBorders',
    margin: [0, 0, 0, 8],
  }

  // ── Naslov / Title ──────────────────────────────────────────────────────────
  const titleBlock = {
    text:      title,
    style:     'reportTitle',
    alignment: 'center',
    margin:    [0, 0, 0, 16],
  }

  // ── Sažetak / Summary ───────────────────────────────────────────────────────
  const summarySection = [
    { text: 'Promet', style: 'sectionHeader', margin: [0, 0, 0, 6] },
    {
      table: {
        headerRows: 1,
        widths:     ['*', '*', '*', '*', '*'],
        body:       [
          [
            { text: 'Ukupno',    style: 'tableHeader' },
            { text: 'Belo',      style: 'tableHeader' },
            { text: 'Crno',      style: 'tableHeader' },
            { text: 'Računa',    style: 'tableHeader' },
            { text: 'Pros. račun', style: 'tableHeader' },
          ],
          [
            { text: fmtRsd(summary.total),     style: 'tableCell' },
            { text: fmtRsd(summary.white),     style: 'tableCell' },
            { text: fmtRsd(summary.black),     style: 'tableCell' },
            { text: String(summary.billCount), style: 'tableCell' },
            { text: fmtRsd(summary.avgBill),   style: 'tableCell' },
          ]
        ]
      },
      layout: {
        fillColor: (rowIndex: number) =>
          rowIndex === 0 ? BLUE_HEADER : rowIndex % 2 === 0 ? GRAY_ROW : null
      },
      margin: [0, 0, 0, 16],
    }
  ]

  // ── Top 10 artikala / Top 10 products ───────────────────────────────────────
  const topRows = topProducts.slice(0, 10).map((p, i) => [
    { text: lang === 'en' ? p.nameEn : p.nameSr, style: 'tableCell' },
    { text: String(p.quantity), style: 'tableCellRight' },
    { text: fmtRsd(p.amount),   style: 'tableCellRight' },
  ])

  const productsSection = [
    { text: 'Top 10 artikala', style: 'sectionHeader', margin: [0, 8, 0, 6] },
    topProducts.length === 0
      ? { text: 'Nema podataka', style: 'noData', margin: [0, 0, 0, 8] }
      : {
          table: {
            headerRows: 1,
            widths:     ['*', 'auto', 'auto'],
            body:       [
              [
                { text: 'Artikal',  style: 'tableHeader' },
                { text: 'Količina', style: 'tableHeader' },
                { text: 'Iznos',    style: 'tableHeader' },
              ],
              ...topRows
            ]
          },
          layout: {
            fillColor: (rowIndex: number) =>
              rowIndex === 0 ? BLUE_HEADER : rowIndex % 2 === 0 ? GRAY_ROW : null
          },
          margin: [0, 0, 0, 16],
        }
  ]

  // ── Promet po konobaru / Revenue by waiter ───────────────────────────────────
  const waiterRows = revenueByWaiter.map(w => [
    { text: w.fullName,                    style: 'tableCell' },
    { text: fmtDate(w.shiftStart),         style: 'tableCellSmall' },
    { text: fmtRsd(w.total),               style: 'tableCellRight' },
    { text: fmtRsd(w.white),               style: 'tableCellRight' },
    { text: fmtRsd(w.black),               style: 'tableCellRight' },
    { text: String(w.billCount),           style: 'tableCellRight' },
  ])

  const waiterSection = revenueByWaiter.length === 0 ? [] : [
    { text: 'Promet po konobaru', style: 'sectionHeader', margin: [0, 8, 0, 6] },
    {
      table: {
        headerRows: 1,
        widths:     ['*', 'auto', 'auto', 'auto', 'auto', 'auto'],
        body:       [
          [
            { text: 'Konobar',  style: 'tableHeader' },
            { text: 'Period',   style: 'tableHeader' },
            { text: 'Promet',   style: 'tableHeader' },
            { text: 'Belo',     style: 'tableHeader' },
            { text: 'Crno',     style: 'tableHeader' },
            { text: 'Računa',   style: 'tableHeader' },
          ],
          ...waiterRows
        ]
      },
      layout: {
        fillColor: (rowIndex: number) =>
          rowIndex === 0 ? BLUE_HEADER : rowIndex % 2 === 0 ? GRAY_ROW : null
      },
      margin: [0, 0, 0, 16],
    }
  ]

  // ── Footer / Footer ──────────────────────────────────────────────────────────
  const now         = new Date()
  const footerText  = `Generisano: ${now.toLocaleString('sr-RS', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })}`

  // ── Dokument definicija / Document definition ────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docDefinition: any = {
    content: [
      headerTable,
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#e5e7eb' }], margin: [0, 0, 0, 12] },
      titleBlock,
      ...summarySection,
      ...productsSection,
      ...waiterSection,
      { text: footerText, style: 'footer', margin: [0, 16, 0, 0] },
    ],
    styles: {
      cafeNameHeader: { fontSize: 14, bold: true, color: '#111827' },
      cafeInfo:       { fontSize: 9,  color: '#6b7280' },
      reportTitle:    { fontSize: 16, bold: true, color: '#111827', margin: [0, 0, 0, 4] },
      sectionHeader:  { fontSize: 11, bold: true, color: '#1d4ed8', margin: [0, 0, 0, 4] },
      tableHeader:    { fontSize: 9,  bold: true, color: WHITE_TEXT, fillColor: BLUE_HEADER, alignment: 'center', margin: [2, 3, 2, 3] },
      tableCell:      { fontSize: 9,  color: '#111827', margin: [2, 3, 2, 3] },
      tableCellRight: { fontSize: 9,  color: '#111827', alignment: 'right', margin: [2, 3, 2, 3] },
      tableCellSmall: { fontSize: 7,  color: '#374151', margin: [2, 3, 2, 3] },
      noData:         { fontSize: 9,  color: '#9ca3af', italics: true },
      footer:         { fontSize: 8,  color: '#9ca3af', alignment: 'right' },
    },
    defaultStyle: { font: 'Roboto' },
    pageMargins:  [30, 30, 30, 30],
  }

  pdfMake.createPdf(docDefinition).download(filename)
}
