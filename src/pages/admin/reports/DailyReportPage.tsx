/**
 * @file src/pages/admin/reports/DailyReportPage.tsx
 * @description Stranica za dnevni finansijski izveštaj (admin only).
 *              Page for daily financial report (admin only).
 *
 * Prikazuje: sažetak prihoda, top proizvode, promet po konobaru.
 * Podržava export u PDF i Excel.
 * Shows: revenue summary, top products, revenue by waiter.
 * Supports export to PDF and Excel.
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation }                   from 'react-i18next'

import { useToast }                         from '../../../hooks/useToast'
import { getDailyReport, type ReportData }  from '../../../api/reports'
import { getSettings, type CafeSettings }   from '../../../api/settings'
import { ReportSummaryCards }               from '../../../components/reports/ReportSummaryCards'
import { TopProductsTable }                 from '../../../components/reports/TopProductsTable'
import { ComparisonBadge }                  from '../../../components/reports/ComparisonBadge'
import { exportReportToPdf }                from '../../../utils/exportPdf'
import { exportReportToExcel }              from '../../../utils/exportExcel'

/**
 * Formatira iznos u srpski format sa oznakom RSD.
 * Formats amount in Serbian format with RSD label.
 */
function formatRsd(amount: number): string {
  return `${amount.toLocaleString('sr-RS', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} RSD`
}

/**
 * Formatira ISO datum-vreme u lokalno vreme.
 * Formats ISO datetime to local time.
 */
function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('sr-RS', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  })
}

/**
 * Stranica dnevnog izveštaja.
 * Daily report page.
 *
 * @returns {JSX.Element} Stranica / Page
 */
export function DailyReportPage() {
  const { t, i18n }   = useTranslation()
  const { showToast } = useToast()
  const lang          = i18n.language.startsWith('en') ? 'en' : 'sr'

  const today = new Date().toISOString().slice(0, 10)

  const [date,         setDate]         = useState<string>(today)
  const [data,         setData]         = useState<ReportData | null>(null)
  const [loading,      setLoading]      = useState(false)
  const [cafeSettings, setCafeSettings] = useState<CafeSettings>({})

  const load = useCallback(async (d: string) => {
    setLoading(true)
    try {
      const result = await getDailyReport(d)
      setData(result)
    } catch (err) {
      showToast((err as Error).message || t('common.unknown_error'), 'error')
    } finally {
      setLoading(false)
    }
  }, [t, showToast])

  useEffect(() => { void load(date) }, [date, load])

  useEffect(() => {
    void getSettings().then(s => setCafeSettings(s)).catch(() => { /* nema kritičnu ulogu */ })
  }, [])

  // Formatira datum za naslov izveštaja / Format date for report title
  const titleDate = new Date(date + 'T00:00:00').toLocaleDateString('sr-RS', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })

  const handleExportPdf = () => {
    if (!data) return
    exportReportToPdf({
      title:        `Dnevni izveštaj — ${titleDate}`,
      filename:     `izvestaj_dnevni_${date}.pdf`,
      cafeSettings,
      reportData:   data,
      lang,
    })
  }

  const handleExportExcel = async () => {
    if (!data) return
    try {
      await exportReportToExcel({
        title:        `Dnevni izveštaj — ${titleDate}`,
        filename:     `izvestaj_dnevni_${date}.xlsx`,
        cafeSettings,
        reportData:   data,
        lang,
      })
    } catch (err) {
      showToast((err as Error).message || t('common.unknown_error'), 'error')
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Naslov + picker + export dugmad / Title + picker + export buttons */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-white">{t('reports.daily.title')}</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-gray-400 text-sm">{t('reports.daily.selectDate')}</label>
          <input
            type="date"
            value={date}
            max={today}
            onChange={e => setDate(e.target.value)}
            className="bg-surface-card border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
          />
          <button
            onClick={handleExportPdf}
            disabled={!data || loading}
            className="px-3 py-2 border border-blue-500/50 text-blue-400 hover:bg-blue-500/10
                       rounded-lg text-xs font-medium transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('export.pdf')}
          </button>
          <button
            onClick={() => void handleExportExcel()}
            disabled={!data || loading}
            className="px-3 py-2 border border-green-500/50 text-green-400 hover:bg-green-500/10
                       rounded-lg text-xs font-medium transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('export.excel')}
          </button>
        </div>
      </div>

      {/* Loading / Error */}
      {loading && (
        <p className="text-gray-400 text-sm">{t('common.loading')}</p>
      )}

      {!loading && data && (
        <>
          {/* Sažetak + poređenje / Summary + comparison */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-gray-400 text-sm font-medium uppercase tracking-wider">
                {t('reports.summary.total')}
              </h2>
              <ComparisonBadge comparison={data.comparison} />
            </div>
            <ReportSummaryCards summary={data.summary} />
          </div>

          {/* Promet po konobaru / Revenue by waiter */}
          <div className="bg-surface-card rounded-2xl border border-white/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5">
              <h2 className="text-white font-semibold">{t('reports.daily.revenueByWaiter')}</h2>
            </div>
            {data.revenueByWaiter.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-6">{t('reports.noData')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">{t('reports.waiter.name')}</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">{t('reports.waiter.shiftPeriod')}</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">{t('reports.waiter.total')}</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">{t('reports.waiter.white')}</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">{t('reports.waiter.black')}</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">{t('reports.waiter.billCount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.revenueByWaiter.map((w, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/3">
                        <td className="py-3 px-4 text-white font-medium">{w.fullName}</td>
                        <td className="py-3 px-4 text-gray-300 text-xs">
                          {formatDateTime(w.shiftStart)}
                          {w.shiftEnd ? ` — ${formatDateTime(w.shiftEnd)}` : ` — ${t('shifts.active')}`}
                        </td>
                        <td className="py-3 px-4 text-right text-primary-400 font-medium">{formatRsd(w.total)}</td>
                        <td className="py-3 px-4 text-right text-gray-300">{formatRsd(w.white)}</td>
                        <td className="py-3 px-4 text-right text-gray-300">{formatRsd(w.black)}</td>
                        <td className="py-3 px-4 text-right text-gray-300">{w.billCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Top proizvodi / Top products */}
          <div className="bg-surface-card rounded-2xl border border-white/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5">
              <h2 className="text-white font-semibold">{t('reports.topProducts.title')}</h2>
            </div>
            <div className="p-2">
              <TopProductsTable products={data.topProducts} />
            </div>
          </div>
        </>
      )}

      {!loading && !data && (
        <p className="text-gray-500 text-sm text-center py-8">{t('reports.noData')}</p>
      )}
    </div>
  )
}
