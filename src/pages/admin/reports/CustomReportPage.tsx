/**
 * @file src/pages/admin/reports/CustomReportPage.tsx
 * @description Stranica za izveštaj sa prilagođenim periodom (admin only).
 *              Page for custom period report (admin only).
 *
 * Korisnik bira datum od/do i klika "Generiši izveštaj".
 * Podržava export u PDF i Excel.
 * User selects from/to dates and clicks "Generate report".
 * Supports export to PDF and Excel.
 */

import { useState, useCallback, useEffect } from 'react'
import { useTranslation }                   from 'react-i18next'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

import { useToast }                           from '../../../hooks/useToast'
import { getCustomReport, type ReportData }   from '../../../api/reports'
import { getSettings, type CafeSettings }     from '../../../api/settings'
import { ReportSummaryCards }                 from '../../../components/reports/ReportSummaryCards'
import { TopProductsTable }                   from '../../../components/reports/TopProductsTable'
import { exportReportToPdf }                  from '../../../utils/exportPdf'
import { exportReportToExcel }                from '../../../utils/exportExcel'

/** Paleta boja za kategorije / Category color palette */
const CAT_COLORS = ['#6366f1', '#fbbf24', '#34d399', '#f87171', '#60a5fa', '#a78bfa', '#fb923c', '#4ade80']

/**
 * Formatira iznos u srpski format sa oznakom RSD.
 * Formats amount in Serbian format with RSD label.
 */
function formatRsd(amount: number): string {
  return `${amount.toLocaleString('sr-RS', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} RSD`
}

/**
 * Stranica izveštaja za prilagođeni period.
 * Custom period report page.
 *
 * @returns {JSX.Element} Stranica / Page
 */
export function CustomReportPage() {
  const { t, i18n }   = useTranslation()
  const { showToast } = useToast()
  const lang          = i18n.language.startsWith('en') ? 'en' : 'sr'

  const today = new Date().toISOString().slice(0, 10)

  const [dateFrom,     setDateFrom]     = useState<string>(today)
  const [dateTo,       setDateTo]       = useState<string>(today)
  const [data,         setData]         = useState<ReportData | null>(null)
  const [loading,      setLoading]      = useState(false)
  const [cafeSettings, setCafeSettings] = useState<CafeSettings>({})

  useEffect(() => {
    void getSettings().then(s => setCafeSettings(s)).catch(() => { /* nema kritičnu ulogu */ })
  }, [])

  const fmtTitleDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('sr-RS', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })

  const customTitle = `Izveštaj — ${fmtTitleDate(dateFrom)} – ${fmtTitleDate(dateTo)}`

  const handleExportPdf = () => {
    if (!data) return
    exportReportToPdf({
      title:        customTitle,
      filename:     `izvestaj_custom_${dateFrom}_${dateTo}.pdf`,
      cafeSettings,
      reportData:   data,
      lang,
    })
  }

  const handleExportExcel = async () => {
    if (!data) return
    try {
      await exportReportToExcel({
        title:        customTitle,
        filename:     `izvestaj_custom_${dateFrom}_${dateTo}.xlsx`,
        cafeSettings,
        reportData:   data,
        lang,
      })
    } catch (err) {
      showToast((err as Error).message || t('common.unknown_error'), 'error')
    }
  }

  const generate = useCallback(async () => {
    if (!dateFrom || !dateTo) {
      showToast(t('reports.custom.dateFrom') + ' / ' + t('reports.custom.dateTo'), 'error')
      return
    }
    if (dateFrom > dateTo) {
      showToast(t('common.error'), 'error')
      return
    }
    setLoading(true)
    try {
      const result = await getCustomReport(dateFrom, dateTo)
      setData(result)
    } catch (err) {
      showToast((err as Error).message || t('common.unknown_error'), 'error')
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo, t, showToast])

  // Bar chart po danima / Bar chart by day
  const chartData = data?.revenueByDay.map(d => ({
    name:  d.date.slice(5),   // MM-DD
    total: Math.round(d.total),
    white: Math.round(d.white),
    black: Math.round(d.black),
  })) ?? []

  return (
    <div className="p-6 space-y-6">
      {/* Naslov / Title */}
      <h1 className="text-2xl font-bold text-white">{t('reports.custom.title')}</h1>

      {/* Filter forma / Filter form */}
      <div className="bg-surface-card rounded-2xl border border-white/5 p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-gray-400 text-xs font-medium">{t('reports.custom.dateFrom')}</label>
            <input
              type="date"
              value={dateFrom}
              max={today}
              onChange={e => setDateFrom(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-gray-400 text-xs font-medium">{t('reports.custom.dateTo')}</label>
            <input
              type="date"
              value={dateTo}
              max={today}
              onChange={e => setDateTo(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
            />
          </div>
          <button
            onClick={() => void generate()}
            disabled={loading}
            className="px-5 py-2 bg-primary-500 hover:bg-primary-600 text-black font-medium rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('common.loading') : t('reports.custom.generate')}
          </button>
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

      {/* Rezultati / Results */}
      {!loading && data && (
        <>
          {/* Sažetak / Summary */}
          <div className="space-y-3">
            <h2 className="text-gray-400 text-sm font-medium uppercase tracking-wider">
              {t('reports.summary.total')}
            </h2>
            <ReportSummaryCards summary={data.summary} />
          </div>

          {/* Bar grafikon po danima / Bar chart by day */}
          {chartData.length > 0 && (
            <div className="bg-surface-card rounded-2xl border border-white/5 p-5">
              <h2 className="text-white font-semibold mb-4">{t('reports.weekly.revenueByDay')}</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
                  <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
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
            </div>
          )}

          {/* Raspodela po kategorijama / Category breakdown */}
          {data.categoryBreakdown.length > 0 && (
            <div className="bg-surface-card rounded-2xl border border-white/5 overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5">
                <h2 className="text-white font-semibold">{t('reports.custom.byCategory')}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">{t('reports.category.name')}</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">{t('reports.category.total')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.categoryBreakdown.map((c, i) => (
                      <tr key={c.categoryId} className="border-b border-white/5 hover:bg-white/3">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }}
                            />
                            <span className="text-white">{lang === 'en' ? c.nameEn : c.nameSr}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-primary-400 font-medium">{formatRsd(c.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
