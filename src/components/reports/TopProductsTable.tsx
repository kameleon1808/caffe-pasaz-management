/**
 * @file src/components/reports/TopProductsTable.tsx
 * @description Tabela top 10 artikala u izveštaju.
 *              Table of top 10 products in the report.
 */

import { useTranslation }  from 'react-i18next'
import type { TopProduct } from '../../api/reports'

interface Props {
  products: TopProduct[]
}

/**
 * Formatira iznos u srpski format sa oznakom RSD.
 * Formats amount in Serbian format with RSD label.
 */
function formatRsd(amount: number): string {
  return `${amount.toLocaleString('sr-RS', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} RSD`
}

/**
 * Tabela top 10 artikala po prihodu.
 * Table of top 10 products by revenue.
 *
 * @param {Props} props - Prop liste proizvoda / Product list props
 */
export function TopProductsTable({ products }: Props) {
  const { t, i18n } = useTranslation()
  const lang         = i18n.language.startsWith('en') ? 'en' : 'sr'

  if (products.length === 0) {
    return (
      <p className="text-gray-500 text-sm text-center py-4">{t('reports.noData')}</p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left py-2 px-3 text-gray-400 font-medium">#</th>
            <th className="text-left py-2 px-3 text-gray-400 font-medium">{t('reports.topProducts.product')}</th>
            <th className="text-right py-2 px-3 text-gray-400 font-medium">{t('reports.topProducts.quantity')}</th>
            <th className="text-right py-2 px-3 text-gray-400 font-medium">{t('reports.topProducts.amount')}</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, idx) => (
            <tr key={p.productId} className="border-b border-white/5 hover:bg-white/3">
              <td className="py-2 px-3 text-gray-500">{idx + 1}</td>
              <td className="py-2 px-3 text-white">
                {lang === 'en' ? p.nameEn : p.nameSr}
              </td>
              <td className="py-2 px-3 text-right text-gray-300">{p.quantity}</td>
              <td className="py-2 px-3 text-right text-primary-400 font-medium">{formatRsd(p.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
