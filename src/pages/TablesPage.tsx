/**
 * @file src/pages/TablesPage.tsx
 * @description Vizuelni prikaz stolova sa statusom zauzetosti.
 *              Visual display of tables with occupancy status.
 *
 * Funkcionalnosti / Features:
 * - Dva taba: Unutrašnjost (INDOOR) i Spoljna terasa (OUTDOOR)
 * - Svaki sto kao kartica: zelena = slobodan, crvena = zauzet
 * - Prikazuje ukupan iznos otvorenog računa na zauzetim stolovima
 * - ShiftGuard — korisnik mora imati aktivnu smenu
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation }                   from 'react-i18next'
import { useNavigate }                      from 'react-router-dom'
import { ShiftGuard }                       from '../components/ShiftGuard'
import { useToast }                         from '../hooks/useToast'
import { fetchTables }                      from '../api/tables'
import { createBill }                       from '../api/bills'
import type { TableWithStatus, Zone }       from '../types'

// ─── Table Card ────────────────────────────────────────────────────────────────

interface TableCardProps {
  table:    TableWithStatus
  onAction: (table: TableWithStatus) => void
  busy:     boolean
}

/**
 * Kartica jednog stola.
 * Card for a single table.
 */
function TableCard({ table, onAction, busy }: TableCardProps) {
  const { t } = useTranslation()

  const occupied = table.isOccupied

  return (
    <div
      onClick={() => !busy && onAction(table)}
      className={`
        relative flex flex-col items-center justify-center
        w-32 h-32 rounded-2xl border-2 cursor-pointer
        transition-all duration-200 select-none
        ${busy ? 'opacity-60 cursor-wait' : ''}
        ${occupied
          ? 'bg-red-500/15 border-red-500/60 hover:bg-red-500/25 hover:border-red-500'
          : 'bg-green-500/15 border-green-500/60 hover:bg-green-500/25 hover:border-green-500'
        }
      `}
      title={occupied ? t('tables.clickToView') : t('tables.clickToOpen')}
    >
      {/* Status indikator / Status indicator */}
      <div className={`
        absolute top-2.5 right-2.5
        w-2.5 h-2.5 rounded-full
        ${occupied ? 'bg-red-400' : 'bg-green-400'}
      `} />

      {/* Oznaka stola / Table label */}
      <span className={`
        font-bold text-base leading-tight text-center px-1
        ${occupied ? 'text-red-200' : 'text-green-200'}
      `}>
        {table.label}
      </span>

      {/* Iznos računa / Bill amount */}
      {occupied && table.openBillTotal > 0 && (
        <span className="text-xs text-red-300/80 mt-1.5 text-center px-1 leading-tight">
          {table.openBillTotal.toLocaleString('sr-RS')} RSD
        </span>
      )}

      {/* Status tekst / Status text */}
      {!occupied && (
        <span className="text-xs text-green-400/60 mt-1">
          {t('tables.status.free')}
        </span>
      )}
    </div>
  )
}

// ─── Zone Tab ──────────────────────────────────────────────────────────────────

interface ZoneTabProps {
  zone:     Zone
  active:   boolean
  count:    number
  occupied: number
  onClick:  () => void
}

function ZoneTab({ zone, active, count, occupied, onClick }: ZoneTabProps) {
  const { t } = useTranslation()

  const label = zone === 'INDOOR' ? t('tables.zones.indoor') : t('tables.zones.outdoor')

  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium
        transition-colors duration-150
        ${active
          ? 'bg-primary-500/20 text-primary-400 border border-primary-500/40'
          : 'text-white/50 hover:text-white/80 hover:bg-white/5 border border-transparent'
        }
      `}
    >
      <span>{label}</span>
      <span className={`
        text-xs px-1.5 py-0.5 rounded-full
        ${occupied > 0 ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white/40'}
      `}>
        {occupied}/{count}
      </span>
    </button>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

/**
 * Stranica sa vizuelnim prikazom stolova.
 * Page with visual table display.
 */
export function TablesPage() {
  const { t }         = useTranslation()
  const { showToast } = useToast()
  const navigate      = useNavigate()

  const [tables,     setTables]     = useState<TableWithStatus[]>([])
  const [loading,    setLoading]    = useState(true)
  const [activeZone, setActiveZone] = useState<Zone>('INDOOR')
  const [busyTable,  setBusyTable]  = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchTables()
      setTables(data)
    } catch {
      showToast(t('tables.error'), 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast, t])

  /**
   * Klik na sto — otvara nov račun (slobodan) ili ide na postojeći (zauzet).
   * Table click — opens a new bill (free) or navigates to existing (occupied).
   */
  const handleTableClick = useCallback(async (table: TableWithStatus) => {
    if (table.isOccupied && table.openBillId) {
      navigate(`/bills/${table.openBillId}`)
      return
    }

    setBusyTable(table.id)
    try {
      const bill = await createBill(table.id) as { id: number }
      await load()
      navigate(`/bills/${bill.id}`)
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'TABLE_ALREADY_OCCUPIED') {
        showToast(t('tables.alreadyOccupied'), 'error')
        await load()
      } else {
        showToast((err as Error).message ?? t('tables.error'), 'error')
      }
    } finally {
      setBusyTable(null)
    }
  }, [navigate, load, showToast, t])

  useEffect(() => {
    void load()
    // Osvežavaj svake 30 sekundi / Refresh every 30 seconds
    const interval = setInterval(() => { void load() }, 30_000)
    return () => clearInterval(interval)
  }, [load])

  const zoneTables = tables.filter(t => t.zone === activeZone)
  const indoorCount  = tables.filter(t => t.zone === 'INDOOR').length
  const outdoorCount = tables.filter(t => t.zone === 'OUTDOOR').length
  const indoorOccupied  = tables.filter(t => t.zone === 'INDOOR'  && t.isOccupied).length
  const outdoorOccupied = tables.filter(t => t.zone === 'OUTDOOR' && t.isOccupied).length

  return (
    <ShiftGuard>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">{t('tables.title')}</h1>
            <p className="text-sm text-white/40 mt-0.5">
              {tables.filter(t => t.isOccupied).length} / {tables.length} {t('tables.status.occupied').toLowerCase()}
            </p>
          </div>

          {/* Dugme za osvežavanje / Refresh button */}
          <button
            onClick={() => void load()}
            disabled={loading}
            className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
            title={t('common.refresh')}
          >
            <svg
              className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Zone tabovi / Zone tabs */}
        <div className="flex gap-2 mb-6">
          <ZoneTab
            zone="INDOOR"
            active={activeZone === 'INDOOR'}
            count={indoorCount}
            occupied={indoorOccupied}
            onClick={() => setActiveZone('INDOOR')}
          />
          <ZoneTab
            zone="OUTDOOR"
            active={activeZone === 'OUTDOOR'}
            count={outdoorCount}
            occupied={outdoorOccupied}
            onClick={() => setActiveZone('OUTDOOR')}
          />
        </div>

        {/* Sadržaj / Content */}
        {loading && tables.length === 0 ? (
          <div className="flex justify-center py-16">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-primary-500/50 border-t-primary-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-white/40 text-sm">{t('tables.loading')}</p>
            </div>
          </div>
        ) : zoneTables.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-white/30 text-sm">{t('tables.noTables')}</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-4">
            {zoneTables.map(table => (
              <TableCard
                key={table.id}
                table={table}
                onAction={handleTableClick}
                busy={busyTable === table.id}
              />
            ))}
          </div>
        )}
      </div>
    </ShiftGuard>
  )
}
