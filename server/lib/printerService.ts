/**
 * @file server/lib/printerService.ts
 * @description Servis za štampanje računa na POS termalnom štampaču.
 *              Service for printing receipts on a POS thermal printer.
 *
 * Podržani tipovi konekcije / Supported connection types:
 * - network: TCP/IP konekcija na IP:port / TCP/IP connection to IP:port
 * - usb:     Direktan pristup USB uređaju / Direct USB device access
 * - disabled: Štampač je onesposobljen / Printer is disabled
 *
 * Formatiranje / Formatting:
 * - ESC/POS komande putem node-thermal-printer biblioteke
 * - ESC/POS commands via node-thermal-printer library
 * - Podržava 48 i 80 karaktera širine / Supports 48 and 80 char widths
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ThermalPrinterLib = require('node-thermal-printer')
const ThermalPrinter    = ThermalPrinterLib.default ?? ThermalPrinterLib.ThermalPrinter ?? ThermalPrinterLib
const PrinterTypes      = ThermalPrinterLib.types ?? ThermalPrinterLib.PrinterTypes ?? { EPSON: 'epson' }

import { prisma } from './prisma'

// ─── Tipovi / Types ────────────────────────────────────────────────────────────

/**
 * Konfiguracija POS štampača iz baze.
 * POS printer configuration from database.
 */
export interface PrinterConfig {
  type:   'usb' | 'network' | 'disabled'
  path:   string   // IP adresa ili putanja uređaja / IP address or device path
  port:   number   // TCP port (za network) / TCP port (for network)
  width:  48 | 80  // Širina papira u karakterima / Paper width in characters
}

/**
 * Podaci o kafeu za zaglavlje računa.
 * Cafe info for receipt header.
 */
export interface CafeInfo {
  name:    string
  address: string
  pib:     string
}

/**
 * Podaci o računu za štampanje.
 * Bill data for printing.
 */
export interface PrintBillData {
  id:              number
  tableLabel:      string
  waiterName:      string
  createdAt:       Date | string
  paidAt?:         Date | string | null
  discountPercent: number
  total:           number
  whiteTotal:      number
  blackTotal:      number
  items: Array<{
    nameSr:    string
    quantity:  number
    unitPrice: number
    discount:  number
  }>
}

// ─── Učitavanje konfiguracije / Load configuration ─────────────────────────

/**
 * Učitava konfiguraciju štampača iz baze podataka.
 * Loads printer configuration from the database.
 *
 * @returns {Promise<PrinterConfig>} Konfiguracija štampača / Printer configuration
 */
export async function loadPrinterConfig(): Promise<PrinterConfig> {
  const settings = await prisma.setting.findMany({
    where: { key: { in: ['printer_type', 'printer_path', 'printer_port', 'printer_width'] } }
  })
  const map = Object.fromEntries(settings.map(s => [s.key, s.value]))
  return {
    type:  (map['printer_type']  as PrinterConfig['type']) ?? 'disabled',
    path:  map['printer_path']  ?? '192.168.1.100',
    port:  parseInt(map['printer_port']  ?? '9100', 10),
    width: (parseInt(map['printer_width'] ?? '48', 10) as 48 | 80) ?? 48,
  }
}

/**
 * Učitava informacije o kafeu iz baze podataka.
 * Loads cafe information from the database.
 *
 * @returns {Promise<CafeInfo>} Podaci o kafeu / Cafe info
 */
export async function loadCafeInfo(): Promise<CafeInfo> {
  const settings = await prisma.setting.findMany({
    where: { key: { in: ['cafe_name', 'cafe_address', 'cafe_pib'] } }
  })
  const map = Object.fromEntries(settings.map(s => [s.key, s.value]))
  return {
    name:    map['cafe_name']    ?? 'Kafić Pasaz',
    address: map['cafe_address'] ?? '',
    pib:     map['cafe_pib']     ?? '',
  }
}

// ─── Formatiranje / Formatting ─────────────────────────────────────────────

/**
 * Formatira broj sa 2 decimale i tačkama za hiljade.
 * Formats number with 2 decimals and thousands separators.
 *
 * @param {number} n - Broj za formatiranje / Number to format
 * @returns {string} Formatirani string / Formatted string
 */
function formatAmount(n: number): string {
  return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/**
 * Formatira datum u srpski format dd.MM.yyyy HH:mm.
 * Formats date to Serbian format dd.MM.yyyy HH:mm.
 *
 * @param {Date | string} d - Datum / Date
 * @returns {string} Formatirani datum / Formatted date
 */
function formatDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  const dd   = String(date.getDate()).padStart(2, '0')
  const mm   = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()
  const hh   = String(date.getHours()).padStart(2, '0')
  const min  = String(date.getMinutes()).padStart(2, '0')
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`
}

/**
 * Pravi liniju sa levim i desnim tekstom sa popunom.
 * Creates a line with left and right text padded to width.
 *
 * @param {string} left   - Levi tekst / Left text
 * @param {string} right  - Desni tekst / Right text
 * @param {number} width  - Ukupna širina linije / Total line width
 * @returns {string} Formatirana linija / Formatted line
 */
function padLine(left: string, right: string, width: number): string {
  const available = width - right.length
  const leftTrimmed = left.length > available - 1 ? left.substring(0, available - 1) : left
  return leftTrimmed + ' '.repeat(Math.max(1, width - leftTrimmed.length - right.length)) + right
}

// ─── Štampanje / Printing ─────────────────────────────────────────────────

/**
 * Kreira instancu termalnog štampača prema konfiguraciji.
 * Creates a thermal printer instance based on configuration.
 *
 * @param {PrinterConfig} config - Konfiguracija štampača / Printer configuration
 * @returns Instanca štampača / Printer instance
 */
function createPrinterInstance(config: PrinterConfig) {
  const interfaceStr = config.type === 'network'
    ? `tcp://${config.path}:${config.port}`
    : config.path

  return new ThermalPrinter({
    type:                   PrinterTypes.EPSON ?? 'epson',
    interface:              interfaceStr,
    characterSet:           'PC852_LATIN2',
    removeSpecialCharacters: false,
    lineCharacter:          '-',
    options: {
      timeout: 5000,
    }
  })
}

/**
 * Štampa račun na POS štampaču.
 * Prints a receipt on the POS printer.
 *
 * @param {PrintBillData} bill   - Podaci o računu / Bill data
 * @param {PrinterConfig} config - Konfiguracija štampača / Printer configuration
 * @param {CafeInfo}      cafe   - Podaci o kafeu / Cafe info
 * @throws {Error} Ako štampač nije dostupan / If printer is not available
 */
export async function printReceipt(
  bill:   PrintBillData,
  config: PrinterConfig,
  cafe:   CafeInfo
): Promise<void> {
  if (config.type === 'disabled') {
    throw new Error('Štampač je onesposobljen / Printer is disabled')
  }

  const printer = createPrinterInstance(config)
  const w = config.width  // širina linije / line width
  const sep = '='.repeat(w)
  const dash = '-'.repeat(w)

  // ── Zaglavlje / Header ─────────────────────────────────────────────────

  printer.alignCenter()
  printer.bold(true)
  printer.setTextSize(1, 1)
  printer.println(cafe.name)
  printer.bold(false)
  printer.setTextSize(0, 0)

  if (cafe.address) {
    printer.println(cafe.address)
  }
  if (cafe.pib) {
    printer.println(`PIB: ${cafe.pib}`)
  }
  printer.println(sep)

  // ── Info o računu / Bill info ──────────────────────────────────────────

  printer.alignLeft()
  printer.println(`Račun br: ${bill.id}`)

  const dateStr = bill.paidAt
    ? formatDate(bill.paidAt)
    : formatDate(bill.createdAt)
  printer.println(`Datum: ${dateStr}`)
  printer.println(`Konobar: ${bill.waiterName}`)
  printer.println(`Sto: ${bill.tableLabel}`)
  printer.println(dash)

  // ── Zaglavlje tabele / Table header ───────────────────────────────────

  if (w >= 80) {
    printer.println(padLine('Artikal', 'Kol   Cena    Ukupno', w))
  } else {
    // 48-char: skraćeniji format
    printer.println(padLine('Artikal', 'Kol  Ukupno', w))
  }
  printer.println(dash)

  // ── Stavke / Items ────────────────────────────────────────────────────

  for (const item of bill.items) {
    const linePrice = item.unitPrice * (1 - item.discount / 100)
    const lineTotal = linePrice * item.quantity
    const totalStr  = formatAmount(lineTotal) + ' RSD'

    if (w >= 80) {
      const right = `${item.quantity}   ${formatAmount(item.unitPrice)}  ${totalStr}`
      printer.println(padLine(item.nameSr, right, w))
      if (item.discount > 0) {
        printer.println(`  Popust: ${item.discount}%`)
      }
    } else {
      const right = `${item.quantity}  ${totalStr}`
      printer.println(padLine(item.nameSr, right, w))
      if (item.discount > 0) {
        printer.println(`  Popust: ${item.discount}%`)
      }
    }
  }
  printer.println(dash)

  // ── Iznosi / Amounts ──────────────────────────────────────────────────

  if (bill.discountPercent > 0) {
    const subtotal       = bill.total / (1 - bill.discountPercent / 100)
    const discountAmount = subtotal - bill.total
    printer.println(padLine(`Popust (${bill.discountPercent}%):`, `-${formatAmount(discountAmount)} RSD`, w))
  }

  printer.println(sep)
  printer.bold(true)
  printer.setTextSize(1, 1)
  printer.println(padLine('ZA NAPLATU:', `${formatAmount(bill.total)} RSD`, w))
  printer.bold(false)
  printer.setTextSize(0, 0)
  printer.println(sep)

  // ── Podnožje / Footer ─────────────────────────────────────────────────

  printer.alignCenter()
  printer.println('Hvala na poseti!')
  printer.println(formatDate(new Date()))
  printer.println(sep)

  // Uvlačenje papira / Paper feed
  printer.cut()

  // ── Slanje na štampač / Send to printer ───────────────────────────────

  const isConnected = await printer.isPrinterConnected()
  if (!isConnected) {
    throw new Error('Štampač nije dostupan / Printer not available')
  }

  await printer.execute()
}

/**
 * Podaci za štampanje sumarnog izveštaja smene.
 * Data for printing the shift summary report.
 */
export interface PrintShiftSummaryData {
  shiftId:    number
  waiterName: string
  startedAt:  Date | string
  endedAt:    Date | string | null
  revenue: {
    total:     number
    white:     number
    black:     number
    paidCount: number
  }
  salesByProduct: Array<{
    nameSr:      string
    soldTotal:   number
    totalAmount: number
  }>
}

/**
 * Štampa sumarni izveštaj smene na POS štampaču.
 * Prints the shift summary report on the POS printer.
 *
 * @param {PrintShiftSummaryData} data   - Podaci izveštaja / Report data
 * @param {PrinterConfig}         config - Konfiguracija štampača / Printer config
 * @param {CafeInfo}              cafe   - Podaci o kafeu / Cafe info
 * @throws {Error} Ako štampač nije dostupan / If printer is not available
 */
export async function printShiftSummaryReport(
  data:   PrintShiftSummaryData,
  config: PrinterConfig,
  cafe:   CafeInfo
): Promise<void> {
  if (config.type === 'disabled') {
    throw new Error('Štampač je onesposobljen / Printer is disabled')
  }

  const printer = createPrinterInstance(config)
  const w   = config.width
  const sep = '='.repeat(w)
  const dsh = '-'.repeat(w)

  // ── Zaglavlje / Header ─────────────────────────────────────────────────
  printer.alignCenter()
  printer.bold(true)
  printer.setTextSize(1, 1)
  printer.println('IZVESTAJ SMENE')
  printer.bold(false)
  printer.setTextSize(0, 0)
  printer.println(sep)

  // ── Info o smeni / Shift info ─────────────────────────────────────────
  printer.alignLeft()
  printer.println(`Konobar: ${data.waiterName}`)
  printer.println(`Pocetak: ${formatDate(data.startedAt)}`)
  printer.println(`Kraj:    ${data.endedAt ? formatDate(data.endedAt) : 'U toku'}`)
  printer.println(dsh)

  // ── Promet / Revenue ──────────────────────────────────────────────────
  printer.println(padLine('Ukupan promet:', `${formatAmount(data.revenue.total)} RSD`, w))
  printer.println(padLine('Belo:',          `${formatAmount(data.revenue.white)} RSD`, w))
  printer.println(padLine('Crno:',          `${formatAmount(data.revenue.black)} RSD`, w))
  printer.println(padLine('Racuna:',        String(data.revenue.paidCount), w))
  printer.println(dsh)

  // ── Top prodaja / Top sales ───────────────────────────────────────────
  if (data.salesByProduct.length > 0) {
    printer.println('TOP PRODAJA:')
    const top = data.salesByProduct.slice(0, 10)
    top.forEach((item, idx) => {
      const rank  = `${idx + 1}. `
      const right = `x${item.soldTotal}  ${formatAmount(item.totalAmount)} RSD`
      const name  = item.nameSr.substring(0, w - right.length - rank.length - 1)
      printer.println(padLine(rank + name, right, w))
    })
  }

  printer.println(sep)
  printer.alignCenter()
  printer.println(formatDate(new Date()))
  printer.println(sep)
  printer.cut()

  // ── Slanje / Send ─────────────────────────────────────────────────────
  const isConnected = await printer.isPrinterConnected()
  if (!isConnected) {
    throw new Error('Štampač nije dostupan / Printer not available')
  }
  await printer.execute()
}

/**
 * Štampa testnu stranicu sa konfiguracijom štampača.
 * Prints a test page with printer configuration.
 *
 * @param {PrinterConfig} config - Konfiguracija štampača / Printer configuration
 * @param {CafeInfo}      cafe   - Podaci o kafeu / Cafe info
 * @throws {Error} Ako štampač nije dostupan / If printer is not available
 */
export async function printTestPage(config: PrinterConfig, cafe: CafeInfo): Promise<void> {
  if (config.type === 'disabled') {
    throw new Error('Štampač je onesposobljen / Printer is disabled')
  }

  const printer = createPrinterInstance(config)
  const w   = config.width
  const sep = '='.repeat(w)

  printer.alignCenter()
  printer.bold(true)
  printer.setTextSize(1, 1)
  printer.println('TEST ŠTAMPE')
  printer.bold(false)
  printer.setTextSize(0, 0)
  printer.println(sep)
  printer.println(cafe.name)
  if (cafe.address) printer.println(cafe.address)
  if (cafe.pib) printer.println(`PIB: ${cafe.pib}`)
  printer.println(sep)
  printer.alignLeft()
  printer.println(`Tip: ${config.type.toUpperCase()}`)
  printer.println(`Adresa: ${config.path}`)
  if (config.type === 'network') printer.println(`Port: ${config.port}`)
  printer.println(`Širina: ${config.width} karaktera`)
  printer.println(sep)
  printer.alignCenter()
  printer.println('Štampač radi ispravno!')
  printer.println(formatDate(new Date()))
  printer.println(sep)
  printer.cut()

  const isConnected = await printer.isPrinterConnected()
  if (!isConnected) {
    throw new Error('Štampač nije dostupan / Printer not available')
  }

  await printer.execute()
}
