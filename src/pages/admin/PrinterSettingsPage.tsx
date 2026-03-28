/**
 * @file src/pages/admin/PrinterSettingsPage.tsx
 * @description Stranica za konfiguraciju POS termalnog štampača.
 *              Page for configuring the POS thermal printer.
 *
 * Funkcionalnosti / Features:
 * - Izbor tipa konekcije (USB / Network / Disabled)
 * - Unos IP adrese ili putanje uređaja
 * - Izbor širine papira
 * - Podaci o kafeu za zaglavlje računa
 * - Dugme "Test štampe" za proveru konekcije
 *
 * Selection of connection type (USB / Network / Disabled)
 * - Entry of IP address or device path
 * - Paper width selection
 * - Cafe info for receipt header
 * - "Test Print" button to verify connection
 */

import { useState, useEffect } from 'react'
import { useTranslation }      from 'react-i18next'
import { useToast }            from '../../hooks/useToast'
import { fetchPrinterSettings, savePrinterSettings } from '../../api/settings'
import { printTestPage }       from '../../api/print'
import type { PrinterSettings } from '../../types'

// ─── Status badge ──────────────────────────────────────────────────────────────

/**
 * Prikazuje badge sa statusom štampača.
 * Shows printer status badge.
 */
function StatusBadge({ type }: { type: PrinterSettings['printer_type'] }) {
  const { t } = useTranslation()

  const styles = {
    disabled: 'bg-red-500/15 text-red-400 border-red-500/20',
    usb:      'bg-blue-500/15 text-blue-400 border-blue-500/20',
    network:  'bg-green-500/15 text-green-400 border-green-500/20',
  }

  const labels = {
    disabled: t('printer.status_disabled'),
    usb:      t('printer.status_usb'),
    network:  t('printer.status_network'),
  }

  const icons = { disabled: '⊘', usb: '🖨', network: '🌐' }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm ${styles[type]}`}>
      <span>{icons[type]}</span>
      <span>{labels[type]}</span>
    </div>
  )
}

// ─── Sekcija forme / Form section ──────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">
        {title}
      </h3>
      <div className="bg-surface-card border border-white/5 rounded-2xl p-5 space-y-4">
        {children}
      </div>
    </div>
  )
}

// ─── Polje forme / Form field ──────────────────────────────────────────────────

function Field({
  label,
  hint,
  children,
}: {
  label:    string
  hint?:    string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-white/70 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-white/30 mt-1">{hint}</p>}
    </div>
  )
}

// ─── Główna stranica / Main page ───────────────────────────────────────────────

/**
 * Stranica za podešavanje POS štampača.
 * POS printer settings page.
 */
export function PrinterSettingsPage() {
  const { t }       = useTranslation()
  const { showToast } = useToast()

  const [settings, setSettings] = useState<PrinterSettings>({
    printer_type:  'disabled',
    printer_path:  '192.168.1.100',
    printer_port:  '9100',
    printer_width: '48',
    cafe_name:     'Kafić Pasaz',
    cafe_address:  '',
    cafe_pib:      '',
  })

  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [testing,  setTesting]  = useState(false)

  // ── Učitavanje / Load ───────────────────────────────────────────────────────

  useEffect(() => {
    fetchPrinterSettings()
      .then(setSettings)
      .catch(() => showToast(t('printer.error_load'), 'error'))
      .finally(() => setLoading(false))
  }, [showToast, t])

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleChange(key: keyof PrinterSettings, value: string) {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const updated = await savePrinterSettings(settings)
      setSettings(updated)
      showToast(t('printer.success_save'), 'success')
    } catch (err) {
      showToast((err as Error).message ?? t('printer.error_save'), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    try {
      const result = await printTestPage()
      if (result.success) {
        showToast(t('printer.success_test'), 'success')
      } else {
        showToast(result.message, 'error')
      }
    } finally {
      setTesting(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    )
  }

  const isNetwork = settings.printer_type === 'network'
  const isUsb     = settings.printer_type === 'usb'
  const isActive  = isNetwork || isUsb

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      {/* Zaglavlje / Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('printer.title')}</h1>
          <p className="text-white/40 text-sm mt-1">{t('printer.subtitle')}</p>
        </div>
        <StatusBadge type={settings.printer_type} />
      </div>

      {/* Sekcija: Konekcija / Connection */}
      <Section title={t('printer.section_connection')}>
        {/* Tip konekcije / Connection type */}
        <Field label={t('printer.type_label')}>
          <select
            value={settings.printer_type}
            onChange={e => handleChange('printer_type', e.target.value as PrinterSettings['printer_type'])}
            className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2.5
                       text-white text-sm focus:outline-none focus:border-primary-500/50"
          >
            <option value="disabled" className="bg-gray-800 text-white">{t('printer.type_disabled')}</option>
            <option value="network"  className="bg-gray-800 text-white">{t('printer.type_network')}</option>
            <option value="usb"      className="bg-gray-800 text-white">{t('printer.type_usb')}</option>
          </select>
        </Field>

        {/* IP / Path */}
        {isActive && (
          <Field label={t('printer.path_label')}>
            <input
              type="text"
              value={settings.printer_path}
              onChange={e => handleChange('printer_path', e.target.value)}
              placeholder={isNetwork
                ? t('printer.path_placeholder_network')
                : t('printer.path_placeholder_usb')
              }
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5
                         text-white text-sm placeholder-white/20
                         focus:outline-none focus:border-primary-500/50"
            />
          </Field>
        )}

        {/* Port (samo za network) / Port (network only) */}
        {isNetwork && (
          <Field label={t('printer.port_label')}>
            <input
              type="number"
              min={1}
              max={65535}
              value={settings.printer_port}
              onChange={e => handleChange('printer_port', e.target.value)}
              placeholder={t('printer.port_placeholder')}
              className="w-48 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5
                         text-white text-sm placeholder-white/20
                         focus:outline-none focus:border-primary-500/50"
            />
          </Field>
        )}
      </Section>

      {/* Sekcija: Papir / Paper */}
      <Section title={t('printer.section_paper')}>
        <Field label={t('printer.width_label')}>
          <div className="flex gap-3">
            {(['48', '80'] as const).map(w => (
              <label
                key={w}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer
                  transition-colors text-sm
                  ${settings.printer_width === w
                    ? 'bg-primary-500/20 border-primary-500/40 text-primary-300'
                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/8'
                  }
                `}
              >
                <input
                  type="radio"
                  name="printer_width"
                  value={w}
                  checked={settings.printer_width === w}
                  onChange={() => handleChange('printer_width', w)}
                  className="sr-only"
                />
                {w === '48' ? t('printer.width_48') : t('printer.width_80')}
              </label>
            ))}
          </div>
        </Field>
      </Section>

      {/* Sekcija: Kafić / Cafe info */}
      <Section title={t('printer.section_cafe')}>
        <Field label={t('printer.cafe_name_label')}>
          <input
            type="text"
            value={settings.cafe_name}
            onChange={e => handleChange('cafe_name', e.target.value)}
            placeholder={t('printer.cafe_name_placeholder')}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5
                       text-white text-sm placeholder-white/20
                       focus:outline-none focus:border-primary-500/50"
          />
        </Field>

        <Field label={t('printer.cafe_address_label')}>
          <input
            type="text"
            value={settings.cafe_address}
            onChange={e => handleChange('cafe_address', e.target.value)}
            placeholder={t('printer.cafe_address_placeholder')}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5
                       text-white text-sm placeholder-white/20
                       focus:outline-none focus:border-primary-500/50"
          />
        </Field>

        <Field label={t('printer.cafe_pib_label')}>
          <input
            type="text"
            value={settings.cafe_pib}
            onChange={e => handleChange('cafe_pib', e.target.value)}
            placeholder={t('printer.cafe_pib_placeholder')}
            className="w-48 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5
                       text-white text-sm placeholder-white/20
                       focus:outline-none focus:border-primary-500/50"
          />
        </Field>
      </Section>

      {/* Dugmad / Buttons */}
      <div className="flex gap-3">
        {/* Test štampe / Test print */}
        <button
          onClick={handleTest}
          disabled={testing || saving || settings.printer_type === 'disabled'}
          className="px-5 py-2.5 rounded-xl text-sm font-medium
                     bg-white/8 text-white/70 border border-white/10
                     hover:bg-white/12 hover:text-white transition-colors
                     disabled:opacity-40 disabled:cursor-not-allowed
                     flex items-center gap-2"
        >
          {testing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
              {t('printer.testing')}
            </>
          ) : (
            <>
              🖨 {t('printer.test_print')}
            </>
          )}
        </button>

        {/* Sačuvaj / Save */}
        <button
          onClick={handleSave}
          disabled={saving || testing}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold
                     bg-primary-500 text-white hover:bg-primary-600 transition-colors
                     disabled:opacity-50
                     flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {t('printer.saving')}
            </>
          ) : (
            t('printer.save')
          )}
        </button>
      </div>
    </div>
  )
}
