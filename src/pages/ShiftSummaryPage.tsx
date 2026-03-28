/**
 * @file src/pages/ShiftSummaryPage.tsx
 * @description Sumarni izveštaj smene — prikazuje promet, prodaju po artiklima i stanje magacina
 *              sa mogućnošću ručne korekcije inventara pre završetka smene.
 *
 *              Shift summary report — shows revenue, sales by product, and warehouse state
 *              with manual inventory adjustment capability before ending the shift.
 *
 * Pristup: svi ulogovani korisnici sa aktivnom smenom.
 * Access: all logged-in users with an active shift.
 *
 * Faza 6.1 + 6.2 / Phase 6.1 + 6.2
 */

import { useEffect, useState }            from 'react'
import { useNavigate }                    from 'react-router-dom'
import { useTranslation }                 from 'react-i18next'
import { useShift }                       from '../hooks/useShift'
import { useAuth }                        from '../hooks/useAuth'
import { useToast }                       from '../hooks/useToast'
import {
  getShiftSummary,
  getShiftInventorySummary,
  adjustShiftInventory,
  endShiftById,
  printShiftSummary,
}                                         from '../api/shifts'
import type {
  ShiftSummary,
  ShiftInventorySummary,
  InventorySummaryItem,
}                                         from '../types'

// ==============================================================================
// POMOĆNE KOMPONENTE / HELPER COMPONENTS
// ==============================================================================

/**
 * Kartica sa jednom metrikom prometa.
 * Single revenue metric card.
 */
function RevenueCard({
  label,
  value,
  icon,
  accent,
}: {
  label:  string
  value:  string
  icon:   string
  accent: string
}) {
  return (
    <div className="bg-surface-card rounded-2xl p-5 border border-white/5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${accent}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-gray-400 text-xs font-medium mb-0.5 truncate">{label}</p>
        <p className="text-white text-xl font-bold">{value}</p>
      </div>
    </div>
  )
}

// ==============================================================================
// FORMATOVANJE / FORMATTING
// ==============================================================================

/**
 * Formatuje broj kao iznos u RSD.
 * Formats a number as an RSD amount.
 */
function fmtRsd(value: number): string {
  return `${value.toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RSD`
}

/**
 * Formatuje broj kao ceo broj.
 * Formats a number as an integer.
 */
function fmtInt(value: number): string {
  return value.toLocaleString('sr-RS')
}

/**
 * Formatuje broj sa do 2 decimale.
 * Formats a number with up to 2 decimal places.
 */
function fmtQty(value: number): string {
  return value.toLocaleString('sr-RS', { maximumFractionDigits: 2 })
}

// ==============================================================================
// MODAL ZA KOREKCIJU INVENTARA / INVENTORY ADJUSTMENT MODAL
// ==============================================================================

interface AdjustModalProps {
  item:      InventorySummaryItem
  lang:      string
  onClose:   () => void
  onConfirm: (changeQty: number, type: 'WASTE' | 'ADJUSTMENT', note: string) => Promise<void>
}

/**
 * Modal za unos ručne korekcije inventara.
 * Modal for entering a manual inventory adjustment.
 *
 * @param {AdjustModalProps} props
 */
function AdjustModal({ item, lang, onClose, onConfirm }: AdjustModalProps) {
  const { t }  = useTranslation()
  const [changeQty,    setChangeQty]    = useState<string>('')
  const [type,         setType]         = useState<'WASTE' | 'ADJUSTMENT'>('ADJUSTMENT')
  const [note,         setNote]         = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  const productName = lang === 'sr' ? item.nameSr : item.nameEn

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const qty = parseFloat(changeQty.replace(',', '.'))
    if (isNaN(qty) || qty === 0) {
      setError(t('shifts.summary.inventory.error_qty'))
      return
    }
    if (!note.trim()) {
      setError(t('shifts.summary.inventory.error_note'))
      return
    }
    setError(null)
    setIsSubmitting(true)
    try {
      await onConfirm(qty, type, note.trim())
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface-card rounded-2xl border border-white/10 shadow-xl w-full max-w-md p-6">
        <h3 className="text-white font-bold text-lg mb-5">
          {t('shifts.summary.inventory.modal_title')}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Proizvod / Product */}
          <div>
            <label className="text-gray-400 text-xs font-medium block mb-1">
              {t('shifts.summary.inventory.modal_product')}
            </label>
            <p className="text-white font-medium">{productName}</p>
          </div>

          {/* Trenutno stanje / Current stock */}
          <div>
            <label className="text-gray-400 text-xs font-medium block mb-1">
              {t('shifts.summary.inventory.modal_current')}
            </label>
            <p className="text-white font-mono">
              {fmtQty(item.currentStock)} {item.unit}
            </p>
          </div>

          {/* Tip korekcije / Adjustment type */}
          <div>
            <label className="text-gray-400 text-xs font-medium block mb-2">
              {t('shifts.summary.inventory.modal_type')}
            </label>
            <div className="flex gap-3">
              {(['ADJUSTMENT', 'WASTE'] as const).map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setType(opt)}
                  className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium border transition-colors ${
                    type === opt
                      ? 'bg-primary-500/20 border-primary-500/60 text-primary-400'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {opt === 'ADJUSTMENT'
                    ? t('shifts.summary.inventory.type_adjustment')
                    : t('shifts.summary.inventory.type_waste')}
                </button>
              ))}
            </div>
          </div>

          {/* Promena količine / Quantity change */}
          <div>
            <label className="text-gray-400 text-xs font-medium block mb-1">
              {t('shifts.summary.inventory.modal_change')}
            </label>
            <input
              type="number"
              step="0.01"
              value={changeQty}
              onChange={e => setChangeQty(e.target.value)}
              placeholder="+5 ili -3"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-primary-500/60 text-sm"
            />
            <p className="text-gray-500 text-xs mt-1">
              {t('shifts.summary.inventory.modal_change_hint')}
            </p>
          </div>

          {/* Napomena / Note */}
          <div>
            <label className="text-gray-400 text-xs font-medium block mb-1">
              {t('shifts.summary.inventory.modal_note')}
              <span className="text-red-400 ml-1">*</span>
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              placeholder={t('shifts.summary.inventory.modal_note_placeholder')}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-primary-500/60 text-sm resize-none"
            />
          </div>

          {/* Greška / Error */}
          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          {/* Dugmad / Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-black text-sm font-bold transition-colors"
            >
              {isSubmitting ? t('common.loading') : t('common.confirm')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ==============================================================================
// GLAVNA KOMPONENTA / MAIN COMPONENT
// ==============================================================================

/**
 * Stranica sa sumarnim izveštajem smene.
 * Shift summary report page.
 *
 * Prikazuje / Displays:
 * - Upozorenje ako ima otvorenih računa / Warning if there are open bills
 * - Sekcija A: Kartice sa prometom / Section A: Revenue cards
 * - Sekcija B: Prodaja po artiklima / Section B: Sales by product table
 * - Sekcija C: Stanje magacina sa korekcijama / Section C: Warehouse state with adjustments
 *
 * @returns {JSX.Element} Stranica izveštaja / Report page
 */
export function ShiftSummaryPage() {
  const { t, i18n }    = useTranslation()
  const navigate        = useNavigate()
  const { user }        = useAuth()
  const { activeShift, refreshShift } = useShift()
  const { showToast }   = useToast()

  const lang = i18n.language.startsWith('sr') ? 'sr' : 'en'

  const [summary,            setSummary]            = useState<ShiftSummary | null>(null)
  const [isLoading,          setIsLoading]          = useState(true)
  const [error,              setError]              = useState<string | null>(null)

  const [inventorySummary,   setInventorySummary]   = useState<ShiftInventorySummary | null>(null)
  const [isLoadingInventory, setIsLoadingInventory] = useState(true)
  const [inventoryError,     setInventoryError]     = useState<string | null>(null)

  const [adjustingItem,      setAdjustingItem]      = useState<InventorySummaryItem | null>(null)
  const [showConfirmEnd,     setShowConfirmEnd]     = useState(false)
  const [isEnding,           setIsEnding]           = useState(false)
  const [isPrinting,         setIsPrinting]         = useState(false)

  // Učitaj izveštaje kada se stranica otvori / Load reports when page opens
  useEffect(() => {
    if (!activeShift) {
      setIsLoading(false)
      setIsLoadingInventory(false)
      return
    }

    setIsLoading(true)
    setIsLoadingInventory(true)
    setError(null)
    setInventoryError(null)

    getShiftSummary(activeShift.id)
      .then(data => setSummary(data))
      .catch(() => setError(t('shifts.summary.error_load')))
      .finally(() => setIsLoading(false))

    getShiftInventorySummary(activeShift.id)
      .then(data => setInventorySummary(data))
      .catch(() => setInventoryError(t('shifts.summary.inventory.error_load')))
      .finally(() => setIsLoadingInventory(false))
  }, [activeShift, t])

  /**
   * Poziva API za korekciju, prikazuje toast i osvežava inventar.
   * Calls the adjustment API, shows toast, and refreshes inventory.
   */
  async function handleEndShift() {
    if (!activeShift) return
    setIsEnding(true)
    try {
      await endShiftById(activeShift.id)
      showToast(t('shifts.confirm.end_success'), 'success')
      await refreshShift()
      navigate('/dashboard')
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.error')
      showToast(msg, 'error')
    } finally {
      setIsEnding(false)
      setShowConfirmEnd(false)
    }
  }

  async function handlePrintSummary() {
    if (!activeShift) return
    setIsPrinting(true)
    try {
      await printShiftSummary(activeShift.id)
      showToast(t('shifts.confirm.print_success'), 'success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('shifts.confirm.print_error')
      showToast(msg, 'error')
    } finally {
      setIsPrinting(false)
    }
  }

  async function handleAdjust(
    changeQty: number,
    type:      'WASTE' | 'ADJUSTMENT',
    note:      string
  ) {
    if (!activeShift || !adjustingItem) return
    await adjustShiftInventory(activeShift.id, {
      productId: adjustingItem.productId,
      changeQty,
      type,
      note,
    })
    showToast(t('shifts.summary.inventory.adjust_success'), 'success')
    // Osveži inventar / Refresh inventory
    const fresh = await getShiftInventorySummary(activeShift.id)
    setInventorySummary(fresh)
  }

  if (!user) return null

  // Nema aktivne smene / No active shift
  if (!isLoading && !activeShift) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-64 text-center gap-4">
        <div className="text-5xl opacity-30">⏰</div>
        <p className="text-gray-400">{t('shifts.summary.error_no_shift')}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-black font-medium rounded-xl text-sm transition-colors"
        >
          {t('shifts.summary.back')}
        </button>
      </div>
    )
  }

  const threshold = inventorySummary?.minStockThreshold ?? 5

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">

      {/* Zaglavlje / Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          aria-label={t('shifts.summary.back')}
        >
          ←
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">{t('shifts.summary.title')}</h1>
          <p className="text-gray-400 text-sm mt-0.5">{t('shifts.summary.subtitle')}</p>
        </div>
      </div>

      {/* Učitavanje / Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <span className="animate-pulse">{t('shifts.summary.loading')}</span>
        </div>
      )}

      {/* Greška / Error */}
      {!isLoading && error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 text-red-400">
          {error}
        </div>
      )}

      {/* Upozorenje za otvorene račune / Open bills warning */}
      {!isLoading && summary && summary.openBillsCount > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">⚠️</span>
          <div>
            <p className="text-amber-400 font-semibold mb-0.5">
              {summary.openBillsCount === 1
                ? t('shifts.summary.open_bills_warning_one')
                : t('shifts.summary.open_bills_warning', { count: summary.openBillsCount })
              }
            </p>
            <p className="text-amber-400/70 text-sm">
              {t('shifts.endWithOpenBills')}
            </p>
          </div>
        </div>
      )}

      {!isLoading && summary && (
        <>
          {/* ============================================================
              SEKCIJA A: PROMET / SECTION A: REVENUE
          ============================================================ */}
          <section>
            <h2 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-3">
              {t('shifts.summary.section_revenue')}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <RevenueCard
                label={t('shifts.summary.card_total')}
                value={fmtRsd(summary.revenue.total)}
                icon="💰"
                accent="bg-green-500/10"
              />
              <RevenueCard
                label={t('shifts.summary.card_white')}
                value={fmtRsd(summary.revenue.white)}
                icon="⬜"
                accent="bg-gray-500/10"
              />
              <RevenueCard
                label={t('shifts.summary.card_black')}
                value={fmtRsd(summary.revenue.black)}
                icon="⬛"
                accent="bg-zinc-700/50"
              />
              <RevenueCard
                label={t('shifts.summary.card_paid_count')}
                value={fmtInt(summary.revenue.paidCount)}
                icon="✅"
                accent="bg-blue-500/10"
              />
              <RevenueCard
                label={t('shifts.summary.card_cancelled_count')}
                value={fmtInt(summary.revenue.cancelledCount)}
                icon="❌"
                accent="bg-red-500/10"
              />
              <RevenueCard
                label={t('shifts.summary.card_average')}
                value={fmtRsd(summary.revenue.averageBill)}
                icon="📊"
                accent="bg-primary-500/10"
              />
            </div>
          </section>

          {/* ============================================================
              SEKCIJA B: PRODAJA PO ARTIKLIMA / SECTION B: SALES BY PRODUCT
          ============================================================ */}
          <section>
            <h2 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-3">
              {t('shifts.summary.section_sales')}
            </h2>

            {summary.salesByProduct.length === 0 ? (
              <div className="bg-surface-card rounded-2xl p-8 border border-white/5 text-center text-gray-500">
                {t('shifts.summary.no_sales')}
              </div>
            ) : (
              <div className="bg-surface-card rounded-2xl border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="px-4 py-3 text-left text-gray-400 font-medium">
                          {t('shifts.summary.col_product')}
                        </th>
                        <th className="px-4 py-3 text-left text-gray-400 font-medium">
                          {t('shifts.summary.col_category')}
                        </th>
                        <th className="px-4 py-3 text-right text-gray-400 font-medium">
                          {t('shifts.summary.col_sold_total')}
                        </th>
                        <th className="px-4 py-3 text-right text-gray-400 font-medium">
                          {t('shifts.summary.col_sold_white')}
                        </th>
                        <th className="px-4 py-3 text-right text-gray-400 font-medium">
                          {t('shifts.summary.col_sold_black')}
                        </th>
                        <th className="px-4 py-3 text-right text-gray-400 font-medium">
                          {t('shifts.summary.col_amount')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.salesByProduct.map(item => (
                        <tr
                          key={item.productId}
                          className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors"
                        >
                          <td className="px-4 py-3 text-white font-medium">
                            {lang === 'sr' ? item.nameSr : item.nameEn}
                          </td>
                          <td className="px-4 py-3 text-gray-400">
                            {lang === 'sr' ? item.categorySr : item.categoryEn}
                          </td>
                          <td className="px-4 py-3 text-right text-white font-semibold">
                            {fmtInt(item.soldTotal)}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-300">
                            {fmtInt(item.soldWhite)}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-300">
                            {fmtInt(item.soldBlack)}
                          </td>
                          <td className="px-4 py-3 text-right text-primary-400 font-medium tabular-nums">
                            {fmtRsd(item.totalAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* Red sa totalima / Totals row */}
                    <tfoot>
                      <tr className="bg-white/5 border-t border-white/10">
                        <td className="px-4 py-3 text-white font-bold" colSpan={2}>
                          {t('shifts.summary.row_total')}
                        </td>
                        <td className="px-4 py-3 text-right text-white font-bold">
                          {fmtInt(
                            summary.salesByProduct.reduce((s, i) => s + i.soldTotal, 0)
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-white font-bold">
                          {fmtInt(
                            summary.salesByProduct.reduce((s, i) => s + i.soldWhite, 0)
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-white font-bold">
                          {fmtInt(
                            summary.salesByProduct.reduce((s, i) => s + i.soldBlack, 0)
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-primary-400 font-bold tabular-nums">
                          {fmtRsd(
                            summary.salesByProduct.reduce((s, i) => s + i.totalAmount, 0)
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {/* ============================================================
          SEKCIJA C: STANJE MAGACINA / SECTION C: WAREHOUSE STATE
      ============================================================ */}
      <section>
        <h2 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-3">
          {t('shifts.summary.section_inventory')}
        </h2>

        {isLoadingInventory && (
          <div className="flex items-center justify-center py-10 text-gray-400">
            <span className="animate-pulse">{t('shifts.summary.loading')}</span>
          </div>
        )}

        {!isLoadingInventory && inventoryError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 text-red-400">
            {inventoryError}
          </div>
        )}

        {!isLoadingInventory && inventorySummary && (
          <>
            {/* Legenda / Legend */}
            <div className="flex gap-5 mb-3 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-red-500/30 border border-red-500/40 inline-block" />
                {t('shifts.summary.inventory.legend_low', { threshold })}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-yellow-500/30 border border-yellow-500/40 inline-block" />
                {t('shifts.summary.inventory.legend_zero')}
              </span>
            </div>

            <div className="bg-surface-card rounded-2xl border border-white/5 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="px-4 py-3 text-left text-gray-400 font-medium">
                        {t('shifts.summary.inventory.col_product')}
                      </th>
                      <th className="px-4 py-3 text-right text-gray-400 font-medium">
                        {t('shifts.summary.inventory.col_start')}
                      </th>
                      <th className="px-4 py-3 text-right text-gray-400 font-medium">
                        {t('shifts.summary.inventory.col_sold')}
                      </th>
                      <th className="px-4 py-3 text-right text-gray-400 font-medium">
                        {t('shifts.summary.inventory.col_purchased')}
                      </th>
                      <th className="px-4 py-3 text-right text-gray-400 font-medium">
                        {t('shifts.summary.inventory.col_adjusted')}
                      </th>
                      <th className="px-4 py-3 text-right text-gray-400 font-medium">
                        {t('shifts.summary.inventory.col_current')}
                      </th>
                      <th className="px-4 py-3 text-center text-gray-400 font-medium w-24">
                        {t('shifts.summary.inventory.col_action')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventorySummary.items.map(item => {
                      const isZero = item.currentStock === 0
                      const isLow  = !isZero && item.currentStock < threshold

                      const rowClass = isZero
                        ? 'bg-yellow-500/10 border-b border-yellow-500/10'
                        : isLow
                          ? 'bg-red-500/10 border-b border-red-500/10'
                          : 'border-b border-white/5'

                      return (
                        <tr
                          key={item.productId}
                          className={`${rowClass} last:border-0 transition-colors`}
                        >
                          <td className="px-4 py-3">
                            <p className="text-white font-medium">
                              {lang === 'sr' ? item.nameSr : item.nameEn}
                            </p>
                            <p className="text-gray-500 text-xs">
                              {lang === 'sr' ? item.categorySr : item.categoryEn}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-300 tabular-nums">
                            {fmtQty(item.startStock)} {item.unit}
                          </td>
                          <td className="px-4 py-3 text-right text-red-400 tabular-nums">
                            {item.sold > 0 ? `-${fmtQty(item.sold)}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-right text-green-400 tabular-nums">
                            {item.purchased > 0 ? `+${fmtQty(item.purchased)}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-right text-blue-400 tabular-nums">
                            {item.adjusted !== 0
                              ? `${item.adjusted > 0 ? '+' : ''}${fmtQty(item.adjusted)}`
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            <span className={`font-bold ${
                              isZero
                                ? 'text-yellow-400'
                                : isLow
                                  ? 'text-red-400'
                                  : 'text-white'
                            }`}>
                              {fmtQty(item.currentStock)} {item.unit}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => setAdjustingItem(item)}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-colors"
                            >
                              {t('shifts.summary.inventory.btn_adjust')}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>

      {/* ============================================================
          SEKCIJA D: POTVRDA ZAVRŠETKA / SECTION D: CONFIRM END SHIFT
      ============================================================ */}
      {activeShift && (
        <section className="border-t border-white/10 pt-6">
          <h2 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-3">
            {t('shifts.confirm.title')}
          </h2>
          <div className="bg-surface-card rounded-2xl border border-white/5 p-5">
            <p className="text-gray-400 text-sm mb-5">
              {t('shifts.confirm.subtitle')}
            </p>

            {/* Blokiran završetak ako ima otvorenih računa / Blocked if open bills */}
            {summary && summary.openBillsCount > 0 && (
              <p className="text-amber-400 text-sm mb-4 flex items-center gap-2">
                <span>⚠️</span>
                {t('shifts.confirm.open_bills_block')}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowConfirmEnd(true)}
                disabled={isEnding || (summary?.openBillsCount ?? 0) > 0}
                className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold rounded-xl text-sm transition-colors"
              >
                {isEnding ? t('shifts.confirm.ending') : t('shifts.confirm.btn_end')}
              </button>
              <button
                onClick={handlePrintSummary}
                disabled={isPrinting}
                className="flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 disabled:opacity-40 text-gray-300 font-medium rounded-xl text-sm border border-white/10 transition-colors"
              >
                {isPrinting ? t('shifts.confirm.printing') : t('shifts.confirm.btn_print')}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Modal za korekciju / Adjustment modal */}
      {adjustingItem && (
        <AdjustModal
          item={adjustingItem}
          lang={lang}
          onClose={() => setAdjustingItem(null)}
          onConfirm={handleAdjust}
        />
      )}

      {/* Dijalog za potvrdu završetka smene / Confirm end shift dialog */}
      {showConfirmEnd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowConfirmEnd(false)} />
          <div className="relative bg-surface-card rounded-2xl border border-white/10 shadow-xl w-full max-w-sm p-6 text-center">
            <div className="text-4xl mb-4">⏹️</div>
            <h3 className="text-white font-bold text-lg mb-2">
              {t('shifts.confirm.dialog_title')}
            </h3>
            <p className="text-gray-400 text-sm mb-6">
              {t('shifts.confirm.dialog_message')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmEnd(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleEndShift}
                disabled={isEnding}
                className="flex-1 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black text-sm font-bold transition-colors"
              >
                {isEnding ? t('shifts.confirm.ending') : t('shifts.confirm.dialog_confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
