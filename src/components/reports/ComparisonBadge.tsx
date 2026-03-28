/**
 * @file src/components/reports/ComparisonBadge.tsx
 * @description Bedž koji prikazuje procentualnu promenu u odnosu na prethodni period.
 *              Badge showing percentage change compared to previous period.
 *
 * Zelena boja za rast, crvena za pad.
 * Green color for growth, red for decline.
 */

import { useTranslation }  from 'react-i18next'
import type { Comparison } from '../../api/reports'

interface Props {
  comparison: Comparison
}

/**
 * Bedž sa poređenjem prihoda u odnosu na prethodni period.
 * Revenue comparison badge vs. previous period.
 *
 * @param {Props} props - Prop poređenja / Comparison props
 */
export function ComparisonBadge({ comparison }: Props) {
  const { t } = useTranslation()

  if (comparison.changePercent === null) {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20">
        {t('reports.comparison.noData')}
      </span>
    )
  }

  const isPositive = comparison.changePercent >= 0
  const sign       = isPositive ? '+' : ''
  const pct        = comparison.changePercent.toFixed(1)

  return (
    <span className={`
      inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border
      ${isPositive
        ? 'bg-green-500/10 text-green-400 border-green-500/20'
        : 'bg-red-500/10 text-red-400 border-red-500/20'
      }
    `}>
      <span>{isPositive ? '↑' : '↓'}</span>
      <span>{sign}{pct}%</span>
      <span className="text-gray-400 font-normal">{t('reports.comparison.vs')}</span>
    </span>
  )
}
