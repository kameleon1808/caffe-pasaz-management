/**
 * @file src/pages/admin/ShiftsHistoryPage.tsx
 * @description Admin stranica — istorija smena sa filterima i detaljnim izveštajem.
 *              Admin page — shift history with filters and detailed report.
 *
 * Pristup: samo administratori / Access: admin only
 *
 * Prikazuje / Displays:
 * - Tabelu svih smena sa filterima (konobar, datum od-do)
 * - Klik na smenu → modal sa detaljnim izveštajem (promet + prodaja)
 *
 * Faza 6.3 / Phase 6.3
 */

import { useEffect, useState, useCallback } from 'react'
import { useTranslation }                   from 'react-i18next'
import { getShiftList, getShiftSummary }    from '../../api/shifts'
import { useToast }                         from '../../hooks/useToast'
import type { ShiftListItem, ShiftSummary } from '../../types'

// ==============================================================================
// FORMATOVANJE / FORMATTING
// ==============================================================================

function fmtDate(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtTime(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })
}

function fmtDuration(start: string, end: string | null): string {
  if (!end) return '—'
  const ms      = new Date(end).getTime() - new Date(start).getTime()
  const totalMin = Math.floor(ms / 60000)
  const h       = Math.floor(totalMin / 60)
  const m       = totalMin % 60
  return `${h}h ${m}min`
}

function fmtRsd(v: number): string {
  return `${v.toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RSD`
}

function fmtInt(v: number): string {
  return v.toLocaleString('sr-RS')
}

// ==============================================================================
// MODAL SA DETALJIMA SMENE / SHIFT DETAIL MODAL
// ==============================================================================

interface DetailModalProps {
  shift:   ShiftListItem
  lang:    string
  onClose: () => void
}

/**
 * Modal sa detaljnim pregledom smene (readonly).
 * Modal with detailed shift view (readonly).
 */
function ShiftDetailModal({ shift, lang, onClose }: DetailModalProps) {
  const { t }                   = useTranslation()
  const [summary, setSummary]   = useState<ShiftSummary | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error,   setError]     = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    getShiftSummary(shift.id)
      .then(setSummary)
      .catch(() => setError(t('shifts.summary.error_load')))
      .finally(() => setLoading(false))
  }, [shift.id, t])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-surface-card rounded-2xl border border-white/10 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* Zaglavlje modala / Modal header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 flex-shrink-0">
          <div>
            <h3 className="text-white font-bold text-lg">{t('shifts.history.detail_title')}</h3>
            <p className="text-gray-400 text-sm mt-0.5">
              {shift.user.fullName} · {fmtDate(shift.startedAt)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Sadržaj / Content */}
        <div className="overflow-y-auto p-5 space-y-5">

          {/* Metapodaci / Metadata */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-gray-500 text-xs mb-0.5">{t('shifts.history.col_start')}</p>
              <p className="text-white font-medium">{fmtTime(shift.startedAt)}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-gray-500 text-xs mb-0.5">{t('shifts.history.col_end')}</p>
              <p className="text-white font-medium">
                {shift.endedAt ? fmtTime(shift.endedAt) : (
                  <span className="text-green-400">{t('shifts.history.active_badge')}</span>
                )}
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-gray-500 text-xs mb-0.5">{t('shifts.history.col_duration')}</p>
              <p className="text-white font-medium">
                {fmtDuration(shift.startedAt, shift.endedAt)}
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-gray-500 text-xs mb-0.5">{t('shifts.history.col_bills')}</p>
              <p className="text-white font-medium">{shift.paidBillsCount}</p>
            </div>
          </div>

          {loading && (
            <p className="text-center text-gray-400 py-8 animate-pulse">
              {t('common.loading')}
            </p>
          )}
          {error && (
            <p className="text-red-400 text-sm text-center py-4">{error}</p>
          )}

          {!loading && summary && (
            <>
              {/* Promet / Revenue */}
              <div>
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">
                  {t('shifts.summary.section_revenue')}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                  {[
                    { label: t('shifts.summary.card_total'),          value: fmtRsd(summary.revenue.total),           accent: 'text-green-400' },
                    { label: t('shifts.summary.card_white'),          value: fmtRsd(summary.revenue.white),           accent: 'text-gray-300' },
                    { label: t('shifts.summary.card_black'),          value: fmtRsd(summary.revenue.black),           accent: 'text-gray-300' },
                    { label: t('shifts.summary.card_paid_count'),     value: fmtInt(summary.revenue.paidCount),       accent: 'text-blue-400' },
                    { label: t('shifts.summary.card_cancelled_count'), value: fmtInt(summary.revenue.cancelledCount), accent: 'text-red-400' },
                    { label: t('shifts.summary.card_average'),        value: fmtRsd(summary.revenue.averageBill),     accent: 'text-primary-400' },
                  ].map(card => (
                    <div key={card.label} className="bg-white/5 rounded-xl p-3">
                      <p className="text-gray-500 text-xs mb-0.5">{card.label}</p>
                      <p className={`font-bold text-sm ${card.accent}`}>{card.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Prodaja po artiklima / Sales by product */}
              {summary.salesByProduct.length > 0 && (
                <div>
                  <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">
                    {t('shifts.summary.section_sales')}
                  </p>
                  <div className="bg-white/3 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-white/5">
                            <th className="px-3 py-2 text-left text-gray-500 font-medium">
                              {t('shifts.summary.col_product')}
                            </th>
                            <th className="px-3 py-2 text-right text-gray-500 font-medium">
                              {t('shifts.summary.col_sold_total')}
                            </th>
                            <th className="px-3 py-2 text-right text-gray-500 font-medium">
                              {t('shifts.summary.col_amount')}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {summary.salesByProduct.map(item => (
                            <tr key={item.productId} className="border-b border-white/5 last:border-0">
                              <td className="px-3 py-2 text-white">
                                {lang === 'sr' ? item.nameSr : item.nameEn}
                              </td>
                              <td className="px-3 py-2 text-right text-gray-300">
                                {fmtInt(item.soldTotal)}
                              </td>
                              <td className="px-3 py-2 text-right text-primary-400 tabular-nums">
                                {fmtRsd(item.totalAmount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ==============================================================================
// GLAVNA KOMPONENTA / MAIN COMPONENT
// ==============================================================================

/**
 * Admin stranica sa istorijom smena.
 * Admin page with shift history.
 *
 * @returns {JSX.Element}
 */
export function ShiftsHistoryPage() {
  const { t, i18n }  = useTranslation()
  const { showToast } = useToast()
  const lang          = i18n.language.startsWith('sr') ? 'sr' : 'en'

  // Podaci / Data
  const [shifts,      setShifts]      = useState<ShiftListItem[]>([])
  const [total,       setTotal]       = useState(0)
  const [isLoading,   setIsLoading]   = useState(true)
  const [error,       setError]       = useState<string | null>(null)

  // Filteri / Filters
  const [filterUser,  setFilterUser]  = useState<string>('')
  const [filterFrom,  setFilterFrom]  = useState<string>('')
  const [filterTo,    setFilterTo]    = useState<string>('')
  const [page,        setPage]        = useState(1)
  const LIMIT = 20

  // Detalji / Details modal
  const [detailShift, setDetailShift] = useState<ShiftListItem | null>(null)

  // Jedinstveni konobari iz učitanih smena / Unique waiters from loaded shifts
  const [waiters, setWaiters] = useState<{ id: number; fullName: string }[]>([])

  const fetchShifts = useCallback(async (p = page) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getShiftList({
        userId:   filterUser ? parseInt(filterUser, 10) : undefined,
        dateFrom: filterFrom || undefined,
        dateTo:   filterTo   || undefined,
        page:     p,
        limit:    LIMIT,
      })
      setShifts(result.shifts)
      setTotal(result.total)

      // Ažuriraj listu konobara / Update waiters list
      setWaiters(prev => {
        const map = new Map(prev.map(w => [w.id, w]))
        result.shifts.forEach(s => map.set(s.user.id, { id: s.user.id, fullName: s.user.fullName }))
        return Array.from(map.values()).sort((a, b) => a.fullName.localeCompare(b.fullName))
      })
    } catch {
      setError(t('common.error'))
      showToast(t('common.error'), 'error')
    } finally {
      setIsLoading(false)
    }
  }, [filterUser, filterFrom, filterTo, page, t, showToast])

  useEffect(() => {
    void fetchShifts(page)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  function handleApplyFilter() {
    setPage(1)
    void fetchShifts(1)
  }

  function handleResetFilter() {
    setFilterUser('')
    setFilterFrom('')
    setFilterTo('')
    setPage(1)
    // Reset i ponovo učitaj / Reset and reload
    setTimeout(() => void fetchShifts(1), 0)
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">

      {/* Zaglavlje / Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">{t('shifts.history.title')}</h1>
        <p className="text-gray-400 text-sm mt-0.5">{t('shifts.history.subtitle')}</p>
      </div>

      {/* Filteri / Filters */}
      <div className="bg-surface-card rounded-2xl border border-white/5 p-4">
        <div className="flex flex-wrap gap-3 items-end">

          {/* Konobar / Waiter */}
          <div className="flex-1 min-w-40">
            <label className="text-gray-400 text-xs font-medium block mb-1">
              {t('shifts.history.col_waiter')}
            </label>
            <select
              value={filterUser}
              onChange={e => setFilterUser(e.target.value)}
              className="w-full border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500/60"
              style={{ backgroundColor: '#1e1e2e' }}
            >
              <option value="" style={{ backgroundColor: '#1e1e2e', color: '#fff' }}>
                {t('shifts.history.filter_waiter_all')}
              </option>
              {waiters.map(w => (
                <option key={w.id} value={String(w.id)} style={{ backgroundColor: '#1e1e2e', color: '#fff' }}>
                  {w.fullName}
                </option>
              ))}
            </select>
          </div>

          {/* Od datuma / From date */}
          <div className="flex-1 min-w-36">
            <label className="text-gray-400 text-xs font-medium block mb-1">
              {t('shifts.history.filter_from')}
            </label>
            <input
              type="date"
              value={filterFrom}
              onChange={e => setFilterFrom(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500/60"
            />
          </div>

          {/* Do datuma / To date */}
          <div className="flex-1 min-w-36">
            <label className="text-gray-400 text-xs font-medium block mb-1">
              {t('shifts.history.filter_to')}
            </label>
            <input
              type="date"
              value={filterTo}
              onChange={e => setFilterTo(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500/60"
            />
          </div>

          {/* Dugmad / Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleApplyFilter}
              className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-black text-sm font-medium rounded-xl transition-colors"
            >
              {t('shifts.history.btn_filter')}
            </button>
            <button
              onClick={handleResetFilter}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium rounded-xl border border-white/10 transition-colors"
            >
              {t('shifts.history.btn_reset')}
            </button>
          </div>
        </div>
      </div>

      {/* Učitavanje / Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <span className="animate-pulse">{t('shifts.history.loading')}</span>
        </div>
      )}

      {/* Greška / Error */}
      {!isLoading && error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 text-red-400">
          {error}
        </div>
      )}

      {/* Tabela / Table */}
      {!isLoading && !error && (
        <>
          {shifts.length === 0 ? (
            <div className="bg-surface-card rounded-2xl p-10 border border-white/5 text-center text-gray-500">
              {t('shifts.history.no_shifts')}
            </div>
          ) : (
            <div className="bg-surface-card rounded-2xl border border-white/5 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="px-4 py-3 text-left text-gray-400 font-medium">
                        {t('shifts.history.col_waiter')}
                      </th>
                      <th className="px-4 py-3 text-left text-gray-400 font-medium">
                        {t('shifts.history.col_date')}
                      </th>
                      <th className="px-4 py-3 text-right text-gray-400 font-medium">
                        {t('shifts.history.col_start')}
                      </th>
                      <th className="px-4 py-3 text-right text-gray-400 font-medium">
                        {t('shifts.history.col_end')}
                      </th>
                      <th className="px-4 py-3 text-right text-gray-400 font-medium">
                        {t('shifts.history.col_duration')}
                      </th>
                      <th className="px-4 py-3 text-right text-gray-400 font-medium">
                        {t('shifts.history.col_revenue')}
                      </th>
                      <th className="px-4 py-3 text-right text-gray-400 font-medium">
                        {t('shifts.history.col_white')}
                      </th>
                      <th className="px-4 py-3 text-right text-gray-400 font-medium">
                        {t('shifts.history.col_black')}
                      </th>
                      <th className="px-4 py-3 text-right text-gray-400 font-medium">
                        {t('shifts.history.col_bills')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {shifts.map(shift => (
                      <tr
                        key={shift.id}
                        onClick={() => setDetailShift(shift)}
                        className="border-b border-white/5 last:border-0 hover:bg-white/5 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3">
                          <p className="text-white font-medium">{shift.user.fullName}</p>
                          <p className="text-gray-500 text-xs">{shift.user.username}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-300">
                          {fmtDate(shift.startedAt)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-300 tabular-nums">
                          {fmtTime(shift.startedAt)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {shift.endedAt ? (
                            <span className="text-gray-300">{fmtTime(shift.endedAt)}</span>
                          ) : (
                            <span className="text-green-400 text-xs font-medium px-2 py-0.5 bg-green-500/10 rounded-full">
                              {t('shifts.history.active_badge')}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-400 tabular-nums">
                          {fmtDuration(shift.startedAt, shift.endedAt)}
                        </td>
                        <td className="px-4 py-3 text-right text-primary-400 font-medium tabular-nums">
                          {fmtRsd(shift.totalRevenue)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-300 tabular-nums">
                          {fmtRsd(shift.totalWhite)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-300 tabular-nums">
                          {fmtRsd(shift.totalBlack)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-300 tabular-nums">
                          {shift.paidBillsCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Paginacija / Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>
                {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} / {total}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-colors"
                >
                  ←
                </button>
                <span className="px-3 py-1.5">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-colors"
                >
                  →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal sa detaljima smene / Shift detail modal */}
      {detailShift && (
        <ShiftDetailModal
          shift={detailShift}
          lang={lang}
          onClose={() => setDetailShift(null)}
        />
      )}
    </div>
  )
}
