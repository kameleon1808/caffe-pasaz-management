/**
 * @file server/services/settingsService.ts
 * @description Servis za upravljanje sistemskim podešavanjima u formatu ključ-vrednost.
 *              Service for managing system settings in key-value format.
 *
 * Podešavanja se čuvaju u Setting tabeli (key: String @id, value: String).
 * Settings are stored in the Setting table (key: String @id, value: String).
 *
 * Grupe podešavanja / Setting groups:
 * - printer_*:  Konfiguracija POS štampača / POS printer configuration
 * - cafe_*:     Informacije o kafeu za račune / Cafe info for receipts
 * - min_stock_threshold: Minimalan prag zaliha / Minimum stock threshold
 * - currency:   Valuta / Currency
 */

import { prisma } from '../lib/prisma'

// ─── Tipovi / Types ────────────────────────────────────────────────────────────

/**
 * Konfiguracija POS štampača.
 * POS printer configuration.
 */
export interface PrinterSettings {
  printer_type:   'usb' | 'network' | 'disabled'
  printer_path:   string
  printer_port:   string
  printer_width:  '48' | '80'
  cafe_name:      string
  cafe_address:   string
  cafe_pib:       string
}

/** Ključevi podešavanja štampača / Printer settings keys */
const PRINTER_KEYS: (keyof PrinterSettings)[] = [
  'printer_type',
  'printer_path',
  'printer_port',
  'printer_width',
  'cafe_name',
  'cafe_address',
  'cafe_pib',
]

/** Podrazumevane vrednosti / Default values */
const DEFAULTS: PrinterSettings = {
  printer_type:   'disabled',
  printer_path:   '192.168.1.100',
  printer_port:   '9100',
  printer_width:  '48',
  cafe_name:      'Kafić Pasaz',
  cafe_address:   '',
  cafe_pib:       '',
}

// ─── Čitanje / Read ────────────────────────────────────────────────────────────

/**
 * Vraća sva podešavanja štampača i kafea.
 * Returns all printer and cafe settings.
 *
 * @returns {Promise<PrinterSettings>} Podešavanja sa podrazumevanim vrednostima / Settings with defaults
 */
export async function getPrinterSettings(): Promise<PrinterSettings> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: PRINTER_KEYS } }
  })

  const map = Object.fromEntries(rows.map(r => [r.key, r.value]))

  return {
    printer_type:   (map['printer_type']  as PrinterSettings['printer_type'])  ?? DEFAULTS.printer_type,
    printer_path:   map['printer_path']   ?? DEFAULTS.printer_path,
    printer_port:   map['printer_port']   ?? DEFAULTS.printer_port,
    printer_width:  (map['printer_width'] as PrinterSettings['printer_width']) ?? DEFAULTS.printer_width,
    cafe_name:      map['cafe_name']      ?? DEFAULTS.cafe_name,
    cafe_address:   map['cafe_address']   ?? DEFAULTS.cafe_address,
    cafe_pib:       map['cafe_pib']       ?? DEFAULTS.cafe_pib,
  }
}

// ─── Upis / Write ──────────────────────────────────────────────────────────────

/**
 * Čuva podešavanja štampača u bazu (upsert po ključu).
 * Saves printer settings to the database (upsert by key).
 *
 * @param {Partial<PrinterSettings>} data - Podešavanja za čuvanje / Settings to save
 * @returns {Promise<PrinterSettings>} Sva podešavanja nakon čuvanja / All settings after saving
 */
export async function savePrinterSettings(data: Partial<PrinterSettings>): Promise<PrinterSettings> {
  // Validacija tipa štampača / Validate printer type
  if (data.printer_type && !['usb', 'network', 'disabled'].includes(data.printer_type)) {
    throw new Error('Nevažeći tip štampača / Invalid printer type')
  }

  // Validacija širine / Validate width
  if (data.printer_width && !['48', '80'].includes(data.printer_width)) {
    throw new Error('Nevažeća širina štampača (48 ili 80) / Invalid printer width (48 or 80)')
  }

  // Validacija porta / Validate port
  if (data.printer_port) {
    const port = parseInt(data.printer_port, 10)
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new Error('Nevažeći port (1-65535) / Invalid port (1-65535)')
    }
  }

  const entries = Object.entries(data).filter(([key]) => PRINTER_KEYS.includes(key as keyof PrinterSettings))

  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.setting.upsert({
        where:  { key },
        update: { value: String(value) },
        create: { key,   value: String(value) },
      })
    )
  )

  return getPrinterSettings()
}

// ─── Generičke operacije / Generic operations ─────────────────────────────────

/**
 * Vraća sva podešavanja kao objekt {ključ: vrednost}.
 * Returns all settings as a {key: value} object.
 *
 * @returns {Promise<Record<string, string>>} Sva podešavanja / All settings
 */
export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await prisma.setting.findMany()
  return Object.fromEntries(rows.map(r => [r.key, r.value]))
}

/**
 * Vraća vrednost jednog podešavanja po ključu.
 * Returns the value of a single setting by key.
 *
 * @param {string} key - Ključ podešavanja / Setting key
 * @returns {Promise<string | null>} Vrednost ili null / Value or null
 */
export async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.setting.findUnique({ where: { key } })
  return row?.value ?? null
}

/**
 * Upsertuje jedno podešavanje.
 * Upserts a single setting.
 *
 * @param {string} key   - Ključ / Key
 * @param {string} value - Vrednost / Value
 */
export async function upsertSetting(key: string, value: string): Promise<void> {
  await prisma.setting.upsert({
    where:  { key },
    update: { value },
    create: { key, value },
  })
}

/**
 * Bulk upsert više podešavanja odjednom.
 * Bulk upsert multiple settings at once.
 *
 * @param {Record<string, string>} settings - Podešavanja za čuvanje / Settings to save
 */
export async function bulkUpsert(settings: Record<string, string>): Promise<void> {
  const entries = Object.entries(settings)
  if (entries.length === 0) return

  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.setting.upsert({
        where:  { key },
        update: { value },
        create: { key, value },
      })
    )
  )
}
