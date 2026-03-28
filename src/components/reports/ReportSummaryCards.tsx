/**
 * @file src/components/reports/ReportSummaryCards.tsx
 * @description Komponenta za prikaz kartica sa sažetkom izveštaja.
 *              Component for displaying report summary cards.
 *
 * Prikazuje 5 kartica: ukupan promet, belo, crno, broj računa, prosečan račun.
 * Shows 5 cards: total revenue, white, black, bill count, average bill.
 */

import { useTranslation }  from 'react-i18next'
import type { ReportSummary } from '../../api/reports'

/**
 * Formatira iznos u srpski format sa oznakom RSD.
 * Formats amount in Serbian format with RSD label.
 *
 * @param {number} amount - Iznos za formatiranje / Amount to format
 */
function formatRsd(amount: number): string {
  return `${amount.toLocaleString('sr-RS', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} RSD`
}

interface Props {
  summary: ReportSummary
}

/**
 * Kartice sa sažetkom finansijskog izveštaja.
 * Financial report summary cards.
 *
 * @param {Props} props - Prop sažetka / Summary props
 */
export function ReportSummaryCards({ summary }: Props) {
  const { t } = useTranslation()

  const cards = [
    {
      label: t('reports.summary.total'),
      value: formatRsd(summary.total),
      icon:  '💰',
      color: 'bg-primary-500/10 text-primary-400',
    },
    {
      label: t('reports.summary.white'),
      value: formatRsd(summary.white),
      icon:  '☕',
      color: 'bg-gray-500/10 text-gray-300',
    },
    {
      label: t('reports.summary.black'),
      value: formatRsd(summary.black),
      icon:  '🍺',
      color: 'bg-yellow-500/10 text-yellow-400',
    },
    {
      label: t('reports.summary.billCount'),
      value: summary.billCount,
      icon:  '🧾',
      color: 'bg-blue-500/10 text-blue-400',
    },
    {
      label: t('reports.summary.avgBill'),
      value: formatRsd(summary.avgBill),
      icon:  '📊',
      color: 'bg-green-500/10 text-green-400',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map(card => (
        <div
          key={card.label}
          className="bg-surface-card rounded-2xl p-4 border border-white/5 flex flex-col gap-2"
        >
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${card.color}`}>
            {card.icon}
          </div>
          <p className="text-gray-400 text-xs font-medium leading-tight">{card.label}</p>
          <p className="text-white text-lg font-bold leading-tight">{card.value}</p>
        </div>
      ))}
    </div>
  )
}
