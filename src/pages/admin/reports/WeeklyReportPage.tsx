/**
 * @file src/pages/admin/reports/WeeklyReportPage.tsx
 * @description Stranica za nedeljni finansijski izveštaj (admin only).
 *              Page for weekly financial report (admin only).
 *
 * Prikazuje: sažetak prihoda, bar grafikon po danima, top proizvode.
 * Podržava export u PDF i Excel.
 * Shows: revenue summary, bar chart by day, top products.
 * Supports export to PDF and Excel.
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation }                   from 'react-i18next'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

import { useToast }                          from '../../../hooks/useToast'
import { getWeeklyReport, type ReportData }  from '../../../api/reports'
import { getSettings, type CafeSettings }    from '../../../api/settings'
import { ReportSummaryCards }                from '../../../components/reports/ReportSummaryCards'
import { TopProductsTable }                  from '../../../components/reports/TopProductsTable'
import { ComparisonBadge }                   from '../../../components/reports/ComparisonBadge'
import { exportReportToPdf }                 from '../../../utils/exportPdf'
import { exportReportToExcel }               from '../../../utils/exportExcel'

/**
 * Vraća datum tekućeg ponedeljka u formatu YYYY-MM-DD.
 * Returns the current Monday date in YYYY-MM-DD format.
 */
function getCurrentMonday(): string {
  const now  = new Date()
  const day  = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  return monday.toISOString().slice(0, 10)
}

/**
 * Snap-uje datum na ponedeljak te sedmice.
 * Snaps a date to the Monday of that week.
 */
function snapToMonday(dateStr: string): string {
  const d   = new Date(dateStr)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

/**
 * Skraćuje datum na naziv dana (Pon, Uto...).
 * Abbreviates a date to a day name (Mon, Tue...).
 */
function toDayLabel(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('sr-RS', { weekday: 'short' })
}

/**
 * Stranica nedeljnog izveštaja.
 * Weekly report page.
 *
 * @returns {JSX.Element} Stranica / Page
 */
export function WeeklyReportPage() {
  const { t, i18n }   = useTranslation()
  const { showToast } = useToast()
  const lang          = i18n.language.startsWith('en') ? 'en' : 'sr'

  const [weekStart,    setWeekStart]    = useState<string>(getCurrentMonday())
  const [data,         setData]         = useState<ReportData | null>(null)
  const [loading,      setLoading]      = useState(false)
  const [cafeSettings, setCafeSettings] = useState<CafeSettings>({})

  const load = useCallback(async (ws: string) => {
    setLoading(true)
    try {
      const result = await getWeeklyReport(ws)
      setData(result)
    } catch (err) {
      showToast((err as Error).message || t('common.unknown_error'), 'error')
    } finally {
      setLoading(false)
    }
  }, [t, showToast])

  useEffect(() => { void load(weekStart) }, [weekStart, load])

  useEffect(() => {
    void getSettings().then(s => setCafeSettings(s)).catch(() => { /* nema kritičnu ulogu */ })
  }, [])

  // Formatira opseg nedelje za naslov / Format week range for title
  const weekEnd    = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const fmtDay     = (d: Date) => d.toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const weekTitle  = `Nedeljni izveštaj — pon ${fmtDay(new Date(weekStart + 'T00:00:00'))} – ned ${fmtDay(weekEnd)}`

  const handleExportPdf = () => {
    if (!data) return
    exportReportToPdf({
      title:        weekTitle,
      filename:     `izvestaj_nedeljni_${weekStart}.pdf`,
      cafeSettings,
      reportData:   data,
      lang,
    })
  }

  const handleExportExcel = async () => {
    if (!data) return
    try {
      await exportReportToExcel({
        title:        weekTitle,
        filename:     `izvestaj_nedeljni_${weekStart}.xlsx`,
        cafeSettings,
        reportData:   data,
        lang,
      })
    } catch (err) {
      showToast((err as Error).message || t('common.unknown_error'), 'error')
    }
  }

  const chartData = data?.revenueByDay.map(d => ({
    name:  toDayLabel(d.date),
    total: Math.round(d.total),
    white: Math.round(d.white),
    black: Math.round(d.black),
  })) ?? []

  return (
    <div className="p-6 space-y-6">
      {/* Naslov + picker + export dugmad / Title + picker + export buttons */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-white">{t('reports.weekly.title')}</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-gray-400 text-sm">{t('reports.weekly.selectWeek')}</label>
          <input
            type="date"
            value={weekStart}
            onChange={e => setWeekStart(snapToMonday(e.target.value))}
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

          {/* Bar grafikon / Bar chart */}
          <div className="bg-surface-card rounded-2xl border border-white/5 p-5">
            <h2 className="text-white font-semibold mb-4">{t('reports.weekly.revenueByDay')}</h2>
            {chartData.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">{t('reports.noData')}</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
                  <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e1e2e', border: '1px solid #ffffff20', borderRadius: '8px' }}
                    labelStyle={{ color: '#e5e7eb' }}
                    itemStyle={{ color: '#e5e7eb' }}
                  />
                  <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                  <Bar dataKey="total" fill="#6366f1" name={t('reports.summary.total')} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="white" fill="#94a3b8" name={t('reports.summary.white')} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="black" fill="#fbbf24" name={t('reports.summary.black')} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
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
