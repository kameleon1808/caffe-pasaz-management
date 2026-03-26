/**
 * @file src/components/ui/DataTable.tsx
 * @description Generička tipizirana tabela sa sortiranjem, pretragom i praznim/loading stanjima.
 *              Generic typed table with sorting, search, and empty/loading states.
 *
 * @example
 * ```tsx
 * <DataTable
 *   columns={[
 *     { key: 'nameSr', header: 'Naziv', sortable: true },
 *     { key: 'price',  header: 'Cena',  render: (row) => `${row.price} RSD` },
 *   ]}
 *   rows={products}
 *   loading={isLoading}
 *   keyExtractor={(r) => r.id}
 * />
 * ```
 */

import { useState, useMemo } from 'react'
import { useTranslation }    from 'react-i18next'

/** Definicija kolone / Column definition */
export interface ColumnDef<T> {
  /** Ključ za pristup podatku / Key for data access */
  key:        keyof T | string
  /** Zaglavlje kolone / Column header */
  header:     string
  /** Da li se može sortirati / Whether sortable */
  sortable?:  boolean
  /** Prilagođeni render / Custom render */
  render?:    (row: T) => React.ReactNode
  /** CSS klase za ćeliju / CSS classes for cell */
  className?: string
}

/** Smer sortiranja / Sort direction */
type SortDir = 'asc' | 'desc'

export interface DataTableProps<T> {
  /** Kolone / Columns */
  columns:       ColumnDef<T>[]
  /** Redovi podataka / Data rows */
  rows:          T[]
  /** Da li se učitava / Whether loading */
  loading?:      boolean
  /** Funkcija za ključ reda / Row key extractor */
  keyExtractor:  (row: T) => string | number
  /** Callback na klik reda / Row click callback */
  onRowClick?:   (row: T) => void
  /** Tekst kad nema podataka / Empty state text */
  emptyText?:    string
  /** Prilagođeni wrapper klase / Custom wrapper classes */
  className?:    string
}

/**
 * Generička tabela sa klijentskim sortiranjem.
 * Generic table with client-side sorting.
 */
export function DataTable<T extends object>({
  columns,
  rows,
  loading = false,
  keyExtractor,
  onRowClick,
  emptyText,
  className = '',
}: DataTableProps<T>) {
  const { t } = useTranslation()
  const [sortKey, setSortKey]   = useState<string | null>(null)
  const [sortDir, setSortDir]   = useState<SortDir>('asc')

  const sorted = useMemo(() => {
    if (!sortKey) return rows
    return [...rows].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey]
      const bv = (b as Record<string, unknown>)[sortKey]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av
      }
      const as = String(av).toLowerCase()
      const bs = String(bv).toLowerCase()
      if (as < bs) return sortDir === 'asc' ? -1 : 1
      if (as > bs) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [rows, sortKey, sortDir])

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return (
    <div className={`overflow-x-auto rounded-xl border border-white/10 ${className}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/5">
            {columns.map(col => (
              <th
                key={String(col.key)}
                className={`px-4 py-3 text-left text-xs font-semibold text-white/50 uppercase tracking-wider select-none ${col.className ?? ''} ${col.sortable ? 'cursor-pointer hover:text-white/80 transition-colors' : ''}`}
                onClick={col.sortable ? () => handleSort(String(col.key)) : undefined}
              >
                <span className="flex items-center gap-1">
                  {col.header}
                  {col.sortable && (
                    <span className={`transition-colors ${sortKey === String(col.key) ? 'text-primary-400' : 'text-white/20'}`}>
                      {sortKey === String(col.key) && sortDir === 'desc' ? '↓' : '↑'}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-white/40">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-primary-500/50 border-t-primary-500 rounded-full animate-spin" />
                  <span>{t('common.loading')}</span>
                </div>
              </td>
            </tr>
          ) : sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-white/40">
                {emptyText ?? t('common.no_data')}
              </td>
            </tr>
          ) : (
            sorted.map(row => (
              <tr
                key={keyExtractor(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`transition-colors ${onRowClick ? 'cursor-pointer hover:bg-white/5' : ''}`}
              >
                {columns.map(col => (
                  <td key={String(col.key)} className={`px-4 py-3 text-white/80 ${col.className ?? ''}`}>
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key as string] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
