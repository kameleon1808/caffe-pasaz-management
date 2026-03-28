/**
 * @file src/pages/admin/reports/MonthlyReportPage.tsx
 * @description Stranica za mesečni finansijski izveštaj (admin only).
 *              Page for monthly financial report (admin only).
 *
 * Prikazuje: sažetak, line grafikon po danima, pie grafikon po kategorijama, top proizvodi.
 * Podržava export u PDF i Excel.
 * Shows: summary, line chart by day, pie chart by category, top products.
 * Supports export to PDF and Excel.
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation }                   from 'react-i18next'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'

import { useToast }                           from '../../../hooks/useToast'
import { getMonthlyReport, type ReportData }  from '../../../api/reports'
import { getSettings, type CafeSettings }     from '../../../api/settings'
import { ReportSummaryCards }                 from '../../../components/reports/ReportSummaryCards'
import { TopProductsTable }                   from '../../../components/reports/TopProductsTable'
import { ComparisonBadge }                    from '../../../components/reports/ComparisonBadge'
import { exportReportToPdf }                  from '../../../utils/exportPdf'
import { exportReportToExcel }                from '../../../utils/exportExcel'

/** Paleta boja za pie chart / Pie chart color palette */
const PIE_COLORS = ['#6366f1', '#fbbf24', '#34d399', '#f87171', '#60a5fa', '#a78bfa', '#fb923c', '#4ade80']

/**
 * Formatira iznos u srpski format sa oznakom RSD.
 * Formats amount in Serbian format with RSD label.
 */
function formatRsd(amount: number): string {
  return `${amount.toLocaleString('sr-RS', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} RSD`
}

/**
 * Stranica mesečnog izveštaja.
 * Monthly report page.
 *
 * @returns {JSX.Element} Stranica / Page
 */
export function MonthlyReportPage() {
  const { t, i18n }   = useTranslation()
  const { showToast } = useToast()
  const lang          = i18n.language.startsWith('en') ? 'en' : 'sr'

  const currentMonth = new Date().toISOString().slice(0, 7)

  const [month,        setMonth]        = useState<string>(currentMonth)
  const [data,         setData]         = useState<ReportData | null>(null)
  const [loading,      setLoading]      = useState(false)
  const [cafeSettings, setCafeSettings] = useState<CafeSettings>({})

  const load = useCallback(async (m: string) => {
    setLoading(true)
    try {
      const result = await getMonthlyReport(m)
      setData(result)
    } catch (err) {
      showToast((err as Error).message || t('common.unknown_error'), 'error')
    } finally {
      setLoading(false)
    }
  }, [t, showToast])

  useEffect(() => { void load(month) }, [month, load])

  useEffect(() => {
    void getSettings().then(s => setCafeSettings(s)).catch(() => { /* nema kritičnu ulogu */ })
  }, [])

  const monthTitle = `Mesečni izveštaj — ${month.slice(5, 7)}.${month.slice(0, 4)}`

  const handleExportPdf = () => {
    if (!data) return
    exportReportToPdf({
      title:        monthTitle,
      filename:     `izvestaj_mesecni_${month}.pdf`,
      cafeSettings,
      reportData:   data,
      lang,
    })
  }

  const handleExportExcel = async () => {
    if (!data) return
    try {
      await exportReportToExcel({
        title:        monthTitle,
        filename:     `izvestaj_mesecni_${month}.xlsx`,
        cafeSettings,
        reportData:   data,
        lang,
      })
    } catch (err) {
      showToast((err as Error).message || t('common.unknown_error'), 'error')
    }
  }

  // Podaci za line chart / Data for line chart
  const lineData = data?.revenueByDay.map(d => ({
    name:  d.date.slice(8),   // DD
    total: Math.round(d.total),
    white: Math.round(d.white),
    black: Math.round(d.black),
  })) ?? []

  // Podaci za pie chart / Data for pie chart
  const pieData = data?.categoryBreakdown.map(c => ({
    name:  lang === 'en' ? c.nameEn : c.nameSr,
    value: Math.round(c.total),
  })) ?? []

  return (
    <div className="p-6 space-y-6">
      {/* Naslov + picker + export dugmad / Title + picker + export buttons */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-white">{t('reports.monthly.title')}</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-gray-400 text-sm">{t('reports.monthly.selectMonth')}</label>
          <input
            type="month"
            value={month}
            max={currentMonth}
            onChange={e => setMonth(e.target.value)}
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

          {/* Line grafikon / Line chart */}
          <div className="bg-surface-card rounded-2xl border border-white/5 p-5">
            <h2 className="text-white font-semibold mb-4">{t('reports.monthly.revenueByDay')}</h2>
            {lineData.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">{t('reports.noData')}</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={lineData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
                  <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e1e2e', border: '1px solid #ffffff20', borderRadius: '8px' }}
                    labelStyle={{ color: '#e5e7eb' }}
                    itemStyle={{ color: '#e5e7eb' }}
                  />
                  <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                  <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} dot={false} name={t('reports.summary.total')} />
                  <Line type="monotone" dataKey="white" stroke="#94a3b8" strokeWidth={2} dot={false} name={t('reports.summary.white')} />
                  <Line type="monotone" dataKey="black" stroke="#fbbf24" strokeWidth={2} dot={false} name={t('reports.summary.black')} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Pie chart i kategorije / Pie chart and categories */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie chart */}
            <div className="bg-surface-card rounded-2xl border border-white/5 p-5">
              <h2 className="text-white font-semibold mb-4">{t('reports.monthly.byCategory')}</h2>
              {pieData.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">{t('reports.noData')}</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {pieData.map((_entry, index) => (
                        <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e1e2e', border: '1px solid #ffffff20', borderRadius: '8px' }}
                      formatter={(value) => [formatRsd(Number(value ?? 0)), '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Tabela kategorija / Category table */}
            <div className="bg-surface-card rounded-2xl border border-white/5 overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5">
                <h2 className="text-white font-semibold">{t('reports.monthly.byCategory')}</h2>
              </div>
              {data.categoryBreakdown.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-6">{t('reports.noData')}</p>
              ) : (
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
                                style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
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
              )}
            </div>
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
