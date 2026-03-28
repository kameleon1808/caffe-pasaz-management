/**
 * @file src/pages/ShiftSummaryPage.tsx
 * @description Sumarni izveštaj smene — prikazuje promet i prodaju po artiklima
 *              pre nego što konobar potvrdi završetak smene.
 *
 *              Shift summary report — shows revenue and sales by product
 *              before the waiter confirms ending the shift.
 *
 * Pristup: svi ulogovani korisnici sa aktivnom smenom.
 * Access: all logged-in users with an active shift.
 *
 * Faza 6.1 / Phase 6.1
 */

import { useEffect, useState }  from 'react'
import { useNavigate }          from 'react-router-dom'
import { useTranslation }       from 'react-i18next'
import { useShift }             from '../hooks/useShift'
import { useAuth }              from '../hooks/useAuth'
import { getShiftSummary }      from '../api/shifts'
import type { ShiftSummary }    from '../types'

// ==============================================================================
// POMOĆNE KOMPONENTE / HELPER COMPONENTS
// ==============================================================================

/**
 * Kartica sa jednom metrikom prometa.
 * Single revenue metric card.
 */
function RevenueCard({
  label,
  value,
  icon,
  accent,
}: {
  label:  string
  value:  string
  icon:   string
  accent: string
}) {
  return (
    <div className="bg-surface-card rounded-2xl p-5 border border-white/5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${accent}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-gray-400 text-xs font-medium mb-0.5 truncate">{label}</p>
        <p className="text-white text-xl font-bold">{value}</p>
      </div>
    </div>
  )
}

// ==============================================================================
// FORMATOVANJE / FORMATTING
// ==============================================================================

/**
 * Formatuje broj kao iznos u RSD.
 * Formats a number as an RSD amount.
 */
function fmtRsd(value: number): string {
  return `${value.toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RSD`
}

/**
 * Formatuje broj kao ceo broj.
 * Formats a number as an integer.
 */
function fmtInt(value: number): string {
  return value.toLocaleString('sr-RS')
}

// ==============================================================================
// GLAVNA KOMPONENTA / MAIN COMPONENT
// ==============================================================================

/**
 * Stranica sa sumarnim izveštajem smene.
 * Shift summary report page.
 *
 * Učitava podatke za aktivnu smenu i prikazuje:
 * - Upozorenje ako ima otvorenih računa
 * - Kartice sa prometom (ukupno, belo, crno, broj računa, prosek)
 * - Tabelu prodaje po artiklima sortiranu po količini
 *
 * Loads data for the active shift and displays:
 * - Warning if there are open bills
 * - Revenue cards (total, white, black, bill counts, average)
 * - Sales by product table sorted by quantity
 *
 * @returns {JSX.Element} Stranica izveštaja / Report page
 */
export function ShiftSummaryPage() {
  const { t, i18n }  = useTranslation()
  const navigate     = useNavigate()
  const { user }     = useAuth()
  const { activeShift } = useShift()

  const lang = i18n.language.startsWith('sr') ? 'sr' : 'en'

  const [summary,   setSummary]   = useState<ShiftSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  // Učitaj izveštaj kada se stranica otvori / Load report when page opens
  useEffect(() => {
    if (!activeShift) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    getShiftSummary(activeShift.id)
      .then(data => setSummary(data))
      .catch(() => setError(t('shifts.summary.error_load')))
      .finally(() => setIsLoading(false))
  }, [activeShift, t])

  if (!user) return null

  // Nema aktivne smene / No active shift
  if (!isLoading && !activeShift) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-64 text-center gap-4">
        <div className="text-5xl opacity-30">⏰</div>
        <p className="text-gray-400">{t('shifts.summary.error_no_shift')}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-black font-medium rounded-xl text-sm transition-colors"
        >
          {t('shifts.summary.back')}
        </button>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">

      {/* Zaglavlje / Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          aria-label={t('shifts.summary.back')}
        >
          ←
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">{t('shifts.summary.title')}</h1>
          <p className="text-gray-400 text-sm mt-0.5">{t('shifts.summary.subtitle')}</p>
        </div>
      </div>

      {/* Učitavanje / Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <span className="animate-pulse">{t('shifts.summary.loading')}</span>
        </div>
      )}

      {/* Greška / Error */}
      {!isLoading && error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 text-red-400">
          {error}
        </div>
      )}

      {/* Upozorenje za otvorene račune / Open bills warning */}
      {!isLoading && summary && summary.openBillsCount > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">⚠️</span>
          <div>
            <p className="text-amber-400 font-semibold mb-0.5">
              {summary.openBillsCount === 1
                ? t('shifts.summary.open_bills_warning_one')
                : t('shifts.summary.open_bills_warning', { count: summary.openBillsCount })
              }
            </p>
            <p className="text-amber-400/70 text-sm">
              {t('shifts.endWithOpenBills')}
            </p>
          </div>
        </div>
      )}

      {!isLoading && summary && (
        <>
          {/* ============================================================
              SEKCIJA A: PROMET / SECTION A: REVENUE
          ============================================================ */}
          <section>
            <h2 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-3">
              {t('shifts.summary.section_revenue')}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <RevenueCard
                label={t('shifts.summary.card_total')}
                value={fmtRsd(summary.revenue.total)}
                icon="💰"
                accent="bg-green-500/10"
              />
              <RevenueCard
                label={t('shifts.summary.card_white')}
                value={fmtRsd(summary.revenue.white)}
                icon="⬜"
                accent="bg-gray-500/10"
              />
              <RevenueCard
                label={t('shifts.summary.card_black')}
                value={fmtRsd(summary.revenue.black)}
                icon="⬛"
                accent="bg-zinc-700/50"
              />
              <RevenueCard
                label={t('shifts.summary.card_paid_count')}
                value={fmtInt(summary.revenue.paidCount)}
                icon="✅"
                accent="bg-blue-500/10"
              />
              <RevenueCard
                label={t('shifts.summary.card_cancelled_count')}
                value={fmtInt(summary.revenue.cancelledCount)}
                icon="❌"
                accent="bg-red-500/10"
              />
              <RevenueCard
                label={t('shifts.summary.card_average')}
                value={fmtRsd(summary.revenue.averageBill)}
                icon="📊"
                accent="bg-primary-500/10"
              />
            </div>
          </section>

          {/* ============================================================
              SEKCIJA B: PRODAJA PO ARTIKLIMA / SECTION B: SALES BY PRODUCT
          ============================================================ */}
          <section>
            <h2 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-3">
              {t('shifts.summary.section_sales')}
            </h2>

            {summary.salesByProduct.length === 0 ? (
              <div className="bg-surface-card rounded-2xl p-8 border border-white/5 text-center text-gray-500">
                {t('shifts.summary.no_sales')}
              </div>
            ) : (
              <div className="bg-surface-card rounded-2xl border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="px-4 py-3 text-left text-gray-400 font-medium">
                          {t('shifts.summary.col_product')}
                        </th>
                        <th className="px-4 py-3 text-left text-gray-400 font-medium">
                          {t('shifts.summary.col_category')}
                        </th>
                        <th className="px-4 py-3 text-right text-gray-400 font-medium">
                          {t('shifts.summary.col_sold_total')}
                        </th>
                        <th className="px-4 py-3 text-right text-gray-400 font-medium">
                          {t('shifts.summary.col_sold_white')}
                        </th>
                        <th className="px-4 py-3 text-right text-gray-400 font-medium">
                          {t('shifts.summary.col_sold_black')}
                        </th>
                        <th className="px-4 py-3 text-right text-gray-400 font-medium">
                          {t('shifts.summary.col_amount')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.salesByProduct.map(item => (
                        <tr
                          key={item.productId}
                          className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors"
                        >
                          <td className="px-4 py-3 text-white font-medium">
                            {lang === 'sr' ? item.nameSr : item.nameEn}
                          </td>
                          <td className="px-4 py-3 text-gray-400">
                            {lang === 'sr' ? item.categorySr : item.categoryEn}
                          </td>
                          <td className="px-4 py-3 text-right text-white font-semibold">
                            {fmtInt(item.soldTotal)}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-300">
                            {fmtInt(item.soldWhite)}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-300">
                            {fmtInt(item.soldBlack)}
                          </td>
                          <td className="px-4 py-3 text-right text-primary-400 font-medium tabular-nums">
                            {fmtRsd(item.totalAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* Red sa totalima / Totals row */}
                    <tfoot>
                      <tr className="bg-white/5 border-t border-white/10">
                        <td className="px-4 py-3 text-white font-bold" colSpan={2}>
                          {t('shifts.summary.row_total')}
                        </td>
                        <td className="px-4 py-3 text-right text-white font-bold">
                          {fmtInt(
                            summary.salesByProduct.reduce((s, i) => s + i.soldTotal, 0)
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-white font-bold">
                          {fmtInt(
                            summary.salesByProduct.reduce((s, i) => s + i.soldWhite, 0)
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-white font-bold">
                          {fmtInt(
                            summary.salesByProduct.reduce((s, i) => s + i.soldBlack, 0)
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-primary-400 font-bold tabular-nums">
                          {fmtRsd(
                            summary.salesByProduct.reduce((s, i) => s + i.totalAmount, 0)
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* Placeholder za akcije Faze 6.3 / Placeholder for Phase 6.3 actions */}
          {/* Ovde će biti dugme "Potvrdi završetak smene" u Fazi 6.3 */}
          {/* "Confirm end shift" button will be added here in Phase 6.3 */}
        </>
      )}
    </div>
  )
}
