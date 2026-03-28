/**
 * @file src/pages/admin/SettingsPage.tsx
 * @description Stranica za upravljanje podešavanjima kafića (admin only).
 *              Page for managing cafe settings (admin only).
 *
 * Prikazuje: naziv kafića, adresu, PIB, telefon, prag zaliha, valutu.
 * NAPOMENA: Podešavanja štampača su na posebnoj stranici (/admin/settings/printer).
 *
 * Shows: cafe name, address, PIB, phone, stock threshold, currency.
 * NOTE: Printer settings are on a separate page (/admin/settings/printer).
 */

import { useState, useEffect }          from 'react'
import { useTranslation }               from 'react-i18next'
import { useNavigate }                  from 'react-router-dom'

import { useToast }                     from '../../hooks/useToast'
import { getSettings, updateSettings }  from '../../api/settings'
import type { CafeSettings }            from '../../api/settings'

/**
 * Stranica za podešavanja kafića.
 * Cafe settings page.
 *
 * @returns {JSX.Element} Stranica podešavanja / Settings page
 */
export function SettingsPage() {
  const { t }         = useTranslation()
  const { showToast } = useToast()
  const navigate      = useNavigate()

  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [settings, setSettings] = useState<CafeSettings>({
    cafe_name:           '',
    cafe_address:        '',
    cafe_pib:            '',
    cafe_phone:          '',
    min_stock_threshold: '5',
    currency:            'RSD',
  })

  // ── Učitavanje podešavanja / Load settings ──────────────────────────────────
  useEffect(() => {
    void (async () => {
      try {
        const data = await getSettings()
        setSettings({
          cafe_name:           data.cafe_name           ?? '',
          cafe_address:        data.cafe_address        ?? '',
          cafe_pib:            data.cafe_pib            ?? '',
          cafe_phone:          data.cafe_phone          ?? '',
          min_stock_threshold: data.min_stock_threshold ?? '5',
          currency:            data.currency            ?? 'RSD',
        })
      } catch (err) {
        showToast((err as Error).message || t('common.unknown_error'), 'error')
      } finally {
        setLoading(false)
      }
    })()
  }, [t, showToast])

  // ── Čuvanje podešavanja / Save settings ─────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateSettings(settings)
      showToast(t('settings.saved'), 'success')
    } catch (err) {
      showToast((err as Error).message || t('settings.saveError'), 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-400 text-sm">{t('common.loading')}</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Zaglavlje / Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-gray-400 hover:text-white transition-colors text-sm"
        >
          ← {t('common.back')}
        </button>
        <h1 className="text-2xl font-bold text-white">{t('settings.title')}</h1>
      </div>

      {/* Forma / Form */}
      <form onSubmit={e => void handleSubmit(e)} className="space-y-5">
        <div className="bg-surface-card rounded-2xl border border-white/5 p-6 space-y-5">
          {/* Naziv kafića / Cafe name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-gray-300 text-sm font-medium">
              {t('settings.cafeName')}
            </label>
            <input
              type="text"
              value={settings.cafe_name ?? ''}
              onChange={e => setSettings(s => ({ ...s, cafe_name: e.target.value }))}
              placeholder="Kafić Pasaz"
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm
                         focus:outline-none focus:border-primary-500 placeholder:text-gray-600"
            />
          </div>

          {/* Adresa / Address */}
          <div className="flex flex-col gap-1.5">
            <label className="text-gray-300 text-sm font-medium">
              {t('settings.cafeAddress')}
            </label>
            <input
              type="text"
              value={settings.cafe_address ?? ''}
              onChange={e => setSettings(s => ({ ...s, cafe_address: e.target.value }))}
              placeholder="Ulica i broj, Grad"
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm
                         focus:outline-none focus:border-primary-500 placeholder:text-gray-600"
            />
          </div>

          {/* PIB */}
          <div className="flex flex-col gap-1.5">
            <label className="text-gray-300 text-sm font-medium">
              {t('settings.cafePib')}
            </label>
            <input
              type="text"
              value={settings.cafe_pib ?? ''}
              onChange={e => setSettings(s => ({ ...s, cafe_pib: e.target.value }))}
              placeholder="npr. 123456789"
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm
                         focus:outline-none focus:border-primary-500 placeholder:text-gray-600"
            />
          </div>

          {/* Telefon / Phone */}
          <div className="flex flex-col gap-1.5">
            <label className="text-gray-300 text-sm font-medium">
              {t('settings.cafePhone')}
            </label>
            <input
              type="text"
              value={settings.cafe_phone ?? ''}
              onChange={e => setSettings(s => ({ ...s, cafe_phone: e.target.value }))}
              placeholder="+381 11 000 0000"
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm
                         focus:outline-none focus:border-primary-500 placeholder:text-gray-600"
            />
          </div>

          {/* Prag zaliha / Stock threshold */}
          <div className="flex flex-col gap-1.5">
            <label className="text-gray-300 text-sm font-medium">
              {t('settings.minStockThreshold')}
            </label>
            <input
              type="number"
              min={0}
              value={settings.min_stock_threshold ?? '5'}
              onChange={e => setSettings(s => ({ ...s, min_stock_threshold: e.target.value }))}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm
                         focus:outline-none focus:border-primary-500 w-40"
            />
          </div>

          {/* Valuta / Currency */}
          <div className="flex flex-col gap-1.5">
            <label className="text-gray-300 text-sm font-medium">
              {t('settings.currency')}
            </label>
            <input
              type="text"
              value={settings.currency ?? 'RSD'}
              onChange={e => setSettings(s => ({ ...s, currency: e.target.value }))}
              placeholder="RSD"
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm
                         focus:outline-none focus:border-primary-500 w-40"
            />
          </div>
        </div>

        {/* Dugme za čuvanje / Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-black font-medium
                       rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? t('common.loading') : t('settings.save')}
          </button>
        </div>
      </form>
    </div>
  )
}
