/**
 * @file src/pages/admin/AdminDashboardPage.tsx
 * @description Admin dashboard stranica sa statistikama i grafikonima.
 *              Admin dashboard page with statistics and charts.
 *
 * Prikazuje:
 * - 4 statističke kartice (današnji prihod, mesečni prihod, broj računa, prosečan račun)
 * - Grafikon prometa poslednjih 7 dana (složeni stubičasti grafikon)
 * - Top 5 artikala po prodanoj količini (horizontalni stubičasti grafikon)
 * - Odnos Belo/Crno (kružni grafikon - donut)
 * - Raspodela prihoda po kategorijama (kružni grafikon)
 *
 * Shows:
 * - 4 stat cards (today revenue, monthly revenue, bill count, avg bill)
 * - Last 7 days revenue chart (stacked bar chart)
 * - Top 5 products by quantity (horizontal bar chart)
 * - White/Black ratio (donut pie chart)
 * - Revenue by category (pie chart)
 */

import { useState, useEffect }        from 'react'
import { useTranslation }             from 'react-i18next'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'

import { useToast }                   from '../../hooks/useToast'
import {
  getDashboardStats,
  type DashboardData,
} from '../../api/dashboard'

// ─── Helperi / Helpers ────────────────────────────────────────────────────────

/**
 * Formatira broj u srpski format sa oznakom RSD.
 * Formats a number in Serbian format with RSD label.
 *
 * @param {number} amount - Iznos / Amount
 * @returns {string} Formatiran iznos / Formatted amount
 */
function formatRsd(amount: number): string {
  return `${amount.toLocaleString('sr-RS', {
    minimumFractionDigits:  0,
    maximumFractionDigits:  0,
  })} RSD`
}

/** Skraćenice dana u sedmici (sr) / Weekday abbreviations (sr) */
const DAY_ABBR_SR: Record<string, string> = {
  Mon: 'Pon',
  Tue: 'Uto',
  Wed: 'Sre',
  Thu: 'Čet',
  Fri: 'Pet',
  Sat: 'Sub',
  Sun: 'Ned',
}

/** Skraćenice dana u sedmici (en) / Weekday abbreviations (en) */
const DAY_ABBR_EN: Record<string, string> = {
  Mon: 'Mon',
  Tue: 'Tue',
  Wed: 'Wed',
  Thu: 'Thu',
  Fri: 'Fri',
  Sat: 'Sat',
  Sun: 'Sun',
}

/**
 * Konvertuje YYYY-MM-DD string u skraćenicu dana.
 * Converts a YYYY-MM-DD string to a day abbreviation.
 *
 * @param {string} dateStr - Datum / Date string
 * @param {'sr'|'en'} lang - Jezik / Language
 * @returns {string} Skraćenica dana / Day abbreviation
 */
function toDayAbbr(dateStr: string, lang: 'sr' | 'en'): string {
  const d   = new Date(dateStr + 'T12:00:00')
  const key = d.toLocaleDateString('en-US', { weekday: 'short' })
  return lang === 'en' ? (DAY_ABBR_EN[key] ?? key) : (DAY_ABBR_SR[key] ?? key)
}

/** Boje za grafikon kategorija / Colors for category chart */
const CATEGORY_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
]

// ─── Pod-komponente / Sub-components ─────────────────────────────────────────

/**
 * Kartica sa statistikom.
 * Statistics card.
 */
function StatCard({
  label,
  value,
  sub,
  subPositive,
  icon,
}: {
  label:       string
  value:       string
  sub?:        string
  subPositive?: boolean
  icon:        React.ReactNode
}) {
  return (
    <div className="bg-gray-800 rounded-xl p-6 flex items-center gap-4">
      <div className="p-3 rounded-full bg-indigo-500/20 text-indigo-400 flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-gray-400 text-sm">{label}</p>
        <p className="text-white text-2xl font-bold">{value}</p>
        {sub !== undefined && (
          <p className={`text-xs mt-0.5 ${subPositive ? 'text-green-400' : 'text-red-400'}`}>
            {sub}
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * SVG ikona za prihod.
 * SVG icon for revenue.
 */
function IconRevenue() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

/**
 * SVG ikona za kalendar.
 * SVG icon for calendar.
 */
function IconCalendar() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8"  y1="2" x2="8"  y2="6" />
      <line x1="3"  y1="10" x2="21" y2="10" />
    </svg>
  )
}

/**
 * SVG ikona za račun.
 * SVG icon for bill.
 */
function IconBill() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

/**
 * SVG ikona za prosek.
 * SVG icon for average.
 */
function IconAvg() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

// ─── Tooltip stilovi / Tooltip styles ────────────────────────────────────────

const TOOLTIP_STYLE = {
  backgroundColor: '#1f2937',
  border:          'none',
  color:           '#fff',
  borderRadius:    '8px',
}

// ─── Glavna komponenta / Main component ──────────────────────────────────────

/**
 * Admin dashboard stranica sa statistikama i grafikonima.
 * Admin dashboard page with statistics and charts.
 *
 * @returns {JSX.Element} Admin dashboard / Admin dashboard
 */
export function AdminDashboardPage() {
  const { t, i18n }   = useTranslation()
  const { showToast } = useToast()
  const lang          = i18n.language.startsWith('en') ? 'en' : 'sr'

  const [data,    setData]    = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashboardStats()
      .then(d => setData(d))
      .catch(() => showToast(t('adminDashboard.loadError'), 'error'))
      .finally(() => setLoading(false))
  }, [t, showToast])

  // ── Loading stanje / Loading state ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="text-gray-400 text-sm animate-pulse">{t('common.loading')}</div>
      </div>
    )
  }

  // ── Greška / Error state ───────────────────────────────────────────────────
  if (!data) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="text-red-400 text-sm">{t('adminDashboard.loadError')}</div>
      </div>
    )
  }

  // ── Pripremi podatke za grafikone / Prepare chart data ─────────────────────

  const chartData7Days = data.last7Days.map(d => ({
    day:   toDayAbbr(d.date, lang),
    white: Math.round(d.white),
    black: Math.round(d.black),
  }))

  const topProductsData = data.topProducts.map(p => ({
    name:     lang === 'en' ? p.nameEn : p.nameSr,
    quantity: p.quantity,
  }))

  const pieWhiteBlack = [
    { name: t('adminDashboard.white'), value: Math.round(data.whiteBlackRatio.white) },
    { name: t('adminDashboard.black'), value: Math.round(data.whiteBlackRatio.black) },
  ]

  const pieCategoryData = data.categoryBreakdown.map(c => ({
    name:  lang === 'en' ? c.nameEn : c.nameSr,
    value: Math.round(c.total),
  }))

  // ── Kartica za promenu / Change indicator ──────────────────────────────────
  const cp = data.today.changePercent
  const changeLabel = cp !== null
    ? `${cp >= 0 ? '▲' : '▼'} ${Math.abs(cp).toFixed(1)}% ${t('adminDashboard.vsYesterday')}`
    : undefined

  return (
    <div className="p-6 space-y-6">
      {/* Naslov / Title */}
      <h1 className="text-2xl font-bold text-white">{t('adminDashboard.title')}</h1>

      {/* Gornji red — 4 kartice / Top row — 4 cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t('adminDashboard.todayRevenue')}
          value={formatRsd(data.today.revenue)}
          sub={changeLabel}
          subPositive={cp !== null && cp >= 0}
          icon={<IconRevenue />}
        />
        <StatCard
          label={t('adminDashboard.monthRevenue')}
          value={formatRsd(data.monthToDate.revenue)}
          icon={<IconCalendar />}
        />
        <StatCard
          label={t('adminDashboard.todayBills')}
          value={String(data.today.billCount)}
          icon={<IconBill />}
        />
        <StatCard
          label={t('adminDashboard.avgBill')}
          value={formatRsd(data.today.avgBill)}
          icon={<IconAvg />}
        />
      </div>

      {/* Srednji red — 2 grafikona / Middle row — 2 charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Promet poslednjih 7 dana / Last 7 days revenue */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-4">{t('adminDashboard.last7Days')}</h2>
          {chartData7Days.every(d => d.white === 0 && d.black === 0) ? (
            <p className="text-gray-500 text-sm text-center py-16">{t('adminDashboard.noData')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData7Days} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="day" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                <Bar dataKey="white" stackId="a" fill="#818cf8" name={t('adminDashboard.white')} />
                <Bar dataKey="black" stackId="a" fill="#4b5563" name={t('adminDashboard.black')} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top 5 artikala / Top 5 products */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-4">{t('adminDashboard.topProducts')}</h2>
          {topProductsData.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-16">{t('adminDashboard.noData')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                layout="vertical"
                data={topProductsData}
                margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#9ca3af"
                  tick={{ fontSize: 11 }}
                  width={110}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="quantity" fill="#34d399" radius={[0, 4, 4, 0]}
                  name={t('adminDashboard.quantity')} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Donji red — 2 grafikona / Bottom row — 2 charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Belo vs Crno — donut / White vs Black — donut */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-4">{t('adminDashboard.whiteBlack')}</h2>
          {pieWhiteBlack.every(d => d.value === 0) ? (
            <p className="text-gray-500 text-sm text-center py-16">{t('adminDashboard.noData')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieWhiteBlack}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  dataKey="value"
                >
                  <Cell fill="#818cf8" />
                  <Cell fill="#4b5563" />
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => typeof v === 'number' ? formatRsd(v) : String(v)} />
                <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Po kategorijama / By category */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-4">{t('adminDashboard.byCategory')}</h2>
          {pieCategoryData.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-16">{t('adminDashboard.noData')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieCategoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                >
                  {pieCategoryData.map((_, index) => (
                    <Cell
                      key={`cat-${index}`}
                      fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => typeof v === 'number' ? formatRsd(v) : String(v)} />
                <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
