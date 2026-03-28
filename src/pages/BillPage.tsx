/**
 * @file src/pages/BillPage.tsx
 * @description Stranica za prikaz i upravljanje računom za jedan sto.
 *              Page for viewing and managing a bill for one table.
 *
 * Layout / Layout:
 * - Leva strana: kategorije + proizvodi za dodavanje na račun
 * - Desna strana: stavke računa, ukupni iznosi, akcije
 * Left side: categories + products to add to bill
 * Right side: bill items, totals, actions
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate }           from 'react-router-dom'
import { useTranslation }                   from 'react-i18next'
import { useToast }                         from '../hooks/useToast'
import {
  fetchBill,
  addBillItem,
  updateBillItem,
  removeBillItem,
  setBillDiscount,
  transferBill,
  payBill,
  cancelBill,
} from '../api/bills'
import { printReceipt } from '../api/print'
import { fetchCategories } from '../api/categories'
import { fetchProducts }   from '../api/products'
import { fetchTables }     from '../api/tables'
import type { Bill, BillItem, Category, Product, TableWithStatus } from '../types'

// ─── Pomocna komponenta: Spinner ──────────────────────────────────────────────

function Spinner({ small }: { small?: boolean }) {
  return (
    <div className={`
      border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin
      ${small ? 'w-4 h-4' : 'w-6 h-6'}
    `} />
  )
}

// ─── Leva strana: Meni ────────────────────────────────────────────────────────

interface MenuPanelProps {
  categories:      Category[]
  products:        Product[]
  selectedCatId:   number | null
  onCatSelect:     (id: number) => void
  onAddProduct:    (product: Product) => void
  addingProductId: number | null
  lang:            'Sr' | 'En'
}

/**
 * Leva strana ekrana — prikaz kategorija i proizvoda.
 * Left panel — categories and products display.
 */
function MenuPanel({
  categories, products, selectedCatId, onCatSelect, onAddProduct, addingProductId, lang
}: MenuPanelProps) {
  const { t } = useTranslation()

  const visibleProducts = selectedCatId
    ? products.filter(p => p.categoryId === selectedCatId)
    : products

  return (
    <div className="flex h-full overflow-hidden">
      {/* Kategorije / Categories */}
      <div className="w-36 flex-shrink-0 overflow-y-auto border-r border-white/5 pr-1">
        <p className="text-xs text-white/30 uppercase tracking-wider px-2 py-2">
          {t('bills.menu.categories')}
        </p>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => onCatSelect(cat.id)}
            className={`
              w-full text-left px-3 py-2.5 rounded-lg text-sm mb-1 transition-colors
              ${selectedCatId === cat.id
                ? 'bg-primary-500/20 text-primary-300 font-medium'
                : 'text-white/60 hover:bg-white/5 hover:text-white/90'
              }
            `}
          >
            {cat[`name${lang}` as 'nameSr' | 'nameEn']}
          </button>
        ))}
      </div>

      {/* Proizvodi / Products */}
      <div className="flex-1 overflow-y-auto pl-3">
        <p className="text-xs text-white/30 uppercase tracking-wider px-1 py-2">
          {t('bills.menu.products')}
        </p>
        {visibleProducts.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-8">{t('bills.menu.noProducts')}</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 pr-1">
            {visibleProducts.map(product => {
              const isAdding = addingProductId === product.id
              return (
                <button
                  key={product.id}
                  onClick={() => !isAdding && onAddProduct(product)}
                  disabled={isAdding}
                  className={`
                    flex flex-col items-start p-3 rounded-xl border text-left
                    transition-all duration-150
                    ${isAdding
                      ? 'opacity-60 cursor-wait bg-white/5 border-white/10'
                      : 'bg-white/5 border-white/10 hover:bg-primary-500/15 hover:border-primary-500/40 active:scale-95'
                    }
                  `}
                >
                  <span className="text-white text-sm font-medium leading-snug line-clamp-2">
                    {product[`name${lang}` as 'nameSr' | 'nameEn']}
                  </span>
                  <span className="text-primary-400 text-xs font-semibold mt-1.5">
                    {product.price.toLocaleString('sr-RS')} RSD
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Desna strana: Stavke računa ──────────────────────────────────────────────

interface BillItemRowProps {
  item:       BillItem
  onUpdate:   (itemId: number, data: { quantity?: number; color?: string; discount?: number }) => void
  onRemove:   (itemId: number) => void
  onDiscount: (item: BillItem) => void
  busy:       boolean
  lang:       'Sr' | 'En'
}

/**
 * Jedan red stavke u računu.
 * One row in the bill items list.
 */
function BillItemRow({ item, onUpdate, onRemove, onDiscount, busy, lang }: BillItemRowProps) {
  const lineTotal = item.quantity * item.unitPrice * (1 - item.discount / 100)
  const isBlack   = item.color === 'BLACK'

  return (
    <div className={`
      flex items-center gap-2 px-3 py-2.5 rounded-xl border mb-1.5
      transition-colors
      ${isBlack
        ? 'bg-gray-800/60 border-gray-600/30'
        : 'bg-white/4 border-white/8'
      }
    `}>
      {/* Naziv / Name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {isBlack && (
            <span className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" title="Crno / Black" />
          )}
          <span className="text-white text-sm font-medium truncate">
            {item.product[`name${lang}` as 'nameSr' | 'nameEn']}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-white/40 text-xs">
            {item.unitPrice.toLocaleString('sr-RS')} RSD
          </span>
          {item.discount > 0 && (
            <span className="text-yellow-400/70 text-xs">-{item.discount}%</span>
          )}
        </div>
      </div>

      {/* Kontrole količine / Quantity controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => item.quantity === 1 ? onRemove(item.id) : onUpdate(item.id, { quantity: item.quantity - 1 })}
          disabled={busy}
          className="w-7 h-7 rounded-lg bg-white/8 text-white/70 hover:bg-white/15 hover:text-white
                     flex items-center justify-center text-base font-bold transition-colors
                     disabled:opacity-40"
        >
          −
        </button>
        <span className="w-7 text-center text-white text-sm font-semibold">
          {item.quantity}
        </span>
        <button
          onClick={() => onUpdate(item.id, { quantity: item.quantity + 1 })}
          disabled={busy}
          className="w-7 h-7 rounded-lg bg-white/8 text-white/70 hover:bg-white/15 hover:text-white
                     flex items-center justify-center text-base font-bold transition-colors
                     disabled:opacity-40"
        >
          +
        </button>
      </div>

      {/* Ukupno za stavku / Line total */}
      <span className="text-white text-sm font-semibold w-24 text-right flex-shrink-0">
        {lineTotal.toLocaleString('sr-RS', { maximumFractionDigits: 0 })} RSD
      </span>

      {/* Akcije / Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Toggle crno/belo / Toggle black/white */}
        <button
          onClick={() => onUpdate(item.id, { color: isBlack ? 'WHITE' : 'BLACK' })}
          disabled={busy}
          className={`
            w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-colors
            disabled:opacity-40
            ${isBlack
              ? 'bg-gray-600/50 text-gray-300 hover:bg-gray-500/50'
              : 'bg-white/8 text-white/50 hover:bg-white/15'
            }
          `}
          title={isBlack ? 'Crno → Belo' : 'Belo → Crno'}
        >
          {isBlack ? '⬛' : '⬜'}
        </button>

        {/* Popust na stavku / Item discount */}
        <button
          onClick={() => onDiscount(item)}
          disabled={busy}
          className={`
            w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-colors disabled:opacity-40
            ${item.discount > 0
              ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
              : 'bg-white/8 text-white/50 hover:bg-white/15'
            }
          `}
          title="Popust na stavku / Item discount"
        >
          %
        </button>

        {/* Obriši / Delete */}
        <button
          onClick={() => onRemove(item.id)}
          disabled={busy}
          className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20
                     flex items-center justify-center transition-colors disabled:opacity-40"
          title="Obriši stavku / Delete item"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ─── Modali / Modals ──────────────────────────────────────────────────────────

interface DiscountModalProps {
  title:    string
  current:  number
  onSave:   (pct: number) => void
  onClose:  () => void
  saving:   boolean
}

function DiscountModal({ title, current, onSave, onClose, saving }: DiscountModalProps) {
  const { t } = useTranslation()
  const [value, setValue] = useState(String(current))

  function handleSave() {
    const pct = parseFloat(value)
    if (isNaN(pct) || pct < 0 || pct > 100) return
    onSave(pct)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-card border border-white/10 rounded-2xl p-6 w-full max-w-sm">
        <h3 className="text-white font-semibold mb-4">{title}</h3>
        <div className="flex items-center gap-3 mb-6">
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={value}
            onChange={e => setValue(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5
                       text-white text-lg text-center focus:outline-none focus:border-primary-500/50"
            autoFocus
          />
          <span className="text-white/60 text-xl font-bold">%</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2.5 rounded-lg text-sm text-white/60 border border-white/10
                       hover:bg-white/5 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold
                       bg-primary-500 text-white hover:bg-primary-600 transition-colors
                       disabled:opacity-50"
          >
            {saving ? <Spinner small /> : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

interface TransferModalProps {
  tables:      TableWithStatus[]
  onTransfer:  (tableId: number) => void
  onClose:     () => void
  transferring: boolean
  lang:        'Sr' | 'En'
}

function TransferModal({ tables, onTransfer, onClose, transferring, lang: _lang }: TransferModalProps) {
  const { t } = useTranslation()

  const freeTables = tables.filter(t => !t.isOccupied)

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-card border border-white/10 rounded-2xl p-6 w-full max-w-sm">
        <h3 className="text-white font-semibold mb-1">{t('bills.transfer.title')}</h3>
        <p className="text-white/40 text-sm mb-4">{t('bills.transfer.subtitle')}</p>

        {freeTables.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-6">{t('bills.transfer.noFreeTables')}</p>
        ) : (
          <div className="flex flex-wrap gap-2 mb-4 max-h-48 overflow-y-auto">
            {freeTables.map(table => (
              <button
                key={table.id}
                onClick={() => !transferring && onTransfer(table.id)}
                disabled={transferring}
                className="px-4 py-2.5 rounded-xl bg-green-500/15 border border-green-500/30
                           text-green-300 text-sm font-medium
                           hover:bg-green-500/25 transition-colors disabled:opacity-50"
              >
                {table.label}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          disabled={transferring}
          className="w-full py-2.5 rounded-lg text-sm text-white/60 border border-white/10
                     hover:bg-white/5 transition-colors"
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  )
}

interface CancelModalProps {
  onConfirm:  (reason: string) => void
  onClose:    () => void
  cancelling: boolean
}

function CancelModal({ onConfirm, onClose, cancelling }: CancelModalProps) {
  const { t }     = useTranslation()
  const [reason, setReason] = useState('')

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-card border border-white/10 rounded-2xl p-6 w-full max-w-sm">
        <h3 className="text-white font-semibold mb-1">{t('bills.cancel.title')}</h3>
        <p className="text-white/40 text-sm mb-4">{t('bills.cancel.subtitle')}</p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder={t('bills.cancel.reasonPlaceholder')}
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5
                     text-white text-sm resize-none focus:outline-none focus:border-red-500/40 mb-4"
          autoFocus
        />
        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={cancelling}
            className="flex-1 py-2.5 rounded-lg text-sm text-white/60 border border-white/10
                       hover:bg-white/5 transition-colors"
          >
            {t('common.back')}
          </button>
          <button
            onClick={() => reason.trim() && onConfirm(reason)}
            disabled={cancelling || !reason.trim()}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold
                       bg-red-500 text-white hover:bg-red-600 transition-colors
                       disabled:opacity-40"
          >
            {cancelling ? <Spinner small /> : t('bills.cancel.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}

interface PayConfirmModalProps {
  bill:     Bill
  onPay:    () => void
  onClose:  () => void
  paying:   boolean
}

function PayConfirmModal({ bill, onPay, onClose, paying }: PayConfirmModalProps) {
  const { t } = useTranslation()

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-card border border-white/10 rounded-2xl p-6 w-full max-w-sm">
        <h3 className="text-white font-semibold mb-1">{t('bills.pay.title')}</h3>
        <p className="text-white/40 text-sm mb-4">{t('bills.pay.subtitle')}</p>

        <div className="bg-white/5 rounded-xl px-4 py-3 mb-2">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-white/50">{t('bills.totals.white')}</span>
            <span className="text-white/80">{bill.whiteTotal.toLocaleString('sr-RS', { maximumFractionDigits: 0 })} RSD</span>
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-white/50">{t('bills.totals.black')}</span>
            <span className="text-white/80">{bill.blackTotal.toLocaleString('sr-RS', { maximumFractionDigits: 0 })} RSD</span>
          </div>
          {bill.discountPercent > 0 && (
            <div className="flex justify-between text-sm mb-1">
              <span className="text-yellow-400/70">{t('bills.totals.discount')} ({bill.discountPercent}%)</span>
              <span className="text-yellow-400/70">
                −{((bill.whiteTotal + bill.blackTotal) / (1 - bill.discountPercent / 100) * (bill.discountPercent / 100))
                  .toLocaleString('sr-RS', { maximumFractionDigits: 0 })} RSD
              </span>
            </div>
          )}
          <div className="flex justify-between border-t border-white/10 pt-2 mt-2">
            <span className="text-white font-semibold">{t('bills.totals.total')}</span>
            <span className="text-green-400 text-lg font-bold">
              {bill.total.toLocaleString('sr-RS', { maximumFractionDigits: 0 })} RSD
            </span>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            disabled={paying}
            className="flex-1 py-2.5 rounded-lg text-sm text-white/60 border border-white/10
                       hover:bg-white/5 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onPay}
            disabled={paying}
            className="flex-1 py-3 rounded-lg text-sm font-bold
                       bg-green-500 text-white hover:bg-green-600 transition-colors
                       disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {paying
              ? <><Spinner small /><span>{t('bills.pay.paying')}</span></>
              : t('bills.pay.confirm')
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Glavna stranica / Main Page ──────────────────────────────────────────────

/**
 * Stranica računa — upravljanje otvorenim računom stola.
 * Bill page — managing an open table bill.
 */
export function BillPage() {
  const { t, i18n } = useTranslation()
  const { id }      = useParams<{ id: string }>()
  const navigate    = useNavigate()
  const { showToast } = useToast()

  const lang = (i18n.language === 'sr' ? 'Sr' : 'En') as 'Sr' | 'En'

  // ── State ──────────────────────────────────────────────────────────────────

  const [bill,            setBill]            = useState<Bill | null>(null)
  const [categories,      setCategories]      = useState<Category[]>([])
  const [products,        setProducts]        = useState<Product[]>([])
  const [selectedCatId,   setSelectedCatId]   = useState<number | null>(null)
  const [loading,         setLoading]         = useState(true)
  const [addingProductId, setAddingProductId] = useState<number | null>(null)
  const [updatingItemId,  setUpdatingItemId]  = useState<number | null>(null)

  const [showDiscount,    setShowDiscount]    = useState(false)
  const [savingDiscount,  setSavingDiscount]  = useState(false)

  const [discountingItem, setDiscountingItem] = useState<BillItem | null>(null)

  const [showTransfer,  setShowTransfer]  = useState(false)
  const [allTables,     setAllTables]     = useState<TableWithStatus[]>([])
  const [transferring,  setTransferring]  = useState(false)

  const [showPay,  setShowPay]  = useState(false)
  const [paying,   setPaying]   = useState(false)

  const [showCancel,  setShowCancel]  = useState(false)
  const [cancelling,  setCancelling]  = useState(false)

  const [reprinting,  setReprinting]  = useState(false)

  // ── Učitavanje podataka / Data loading ────────────────────────────────────

  const loadBill = useCallback(async () => {
    if (!id) return
    try {
      const data = await fetchBill(parseInt(id, 10))
      setBill(data)
    } catch {
      showToast(t('bills.error'), 'error')
      navigate('/tables', { replace: true })
    }
  }, [id, navigate, showToast, t])

  useEffect(() => {
    const billId = parseInt(id ?? '', 10)
    if (isNaN(billId)) return

    setLoading(true)
    Promise.all([
      fetchBill(billId),
      fetchCategories(),
      fetchProducts({ showInactive: false }),
    ])
      .then(([billData, cats, prods]) => {
        setBill(billData)
        const activeCats = cats.filter((c: Category) => c.active)
        setCategories(activeCats)
        setProducts(prods.filter((p: Product) => p.active))
        if (activeCats.length > 0) setSelectedCatId(activeCats[0].id)
      })
      .catch(() => {
        showToast(t('bills.error'), 'error')
        navigate('/tables', { replace: true })
      })
      .finally(() => setLoading(false))
  }, [id, navigate, showToast, t])

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAddProduct = useCallback(async (product: Product) => {
    if (!bill) return
    setAddingProductId(product.id)
    try {
      const updated = await addBillItem(bill.id, product.id)
      setBill(updated)
    } catch (err) {
      showToast((err as Error).message ?? t('bills.error'), 'error')
    } finally {
      setAddingProductId(null)
    }
  }, [bill, showToast, t])

  const handleUpdateItem = useCallback(async (
    itemId: number,
    data: { quantity?: number; color?: string; discount?: number }
  ) => {
    if (!bill) return
    setUpdatingItemId(itemId)
    try {
      const updated = await updateBillItem(bill.id, itemId, data)
      setBill(updated)
    } catch (err) {
      showToast((err as Error).message ?? t('bills.error'), 'error')
    } finally {
      setUpdatingItemId(null)
    }
  }, [bill, showToast, t])

  const handleRemoveItem = useCallback(async (itemId: number) => {
    if (!bill) return
    setUpdatingItemId(itemId)
    try {
      const updated = await removeBillItem(bill.id, itemId)
      setBill(updated)
    } catch (err) {
      showToast((err as Error).message ?? t('bills.error'), 'error')
    } finally {
      setUpdatingItemId(null)
    }
  }, [bill, showToast, t])

  const handleSaveDiscount = useCallback(async (pct: number) => {
    if (!bill) return
    setSavingDiscount(true)
    try {
      const updated = await setBillDiscount(bill.id, pct)
      setBill(updated)
      setShowDiscount(false)
      showToast(t('bills.discount.success'), 'success')
    } catch (err) {
      showToast((err as Error).message ?? t('bills.error'), 'error')
    } finally {
      setSavingDiscount(false)
    }
  }, [bill, showToast, t])

  const handleSaveItemDiscount = useCallback(async (pct: number) => {
    if (!discountingItem) return
    setSavingDiscount(true)
    try {
      const updated = await updateBillItem(bill!.id, discountingItem.id, { discount: pct })
      setBill(updated)
      setDiscountingItem(null)
    } catch (err) {
      showToast((err as Error).message ?? t('bills.error'), 'error')
    } finally {
      setSavingDiscount(false)
    }
  }, [discountingItem, bill, showToast, t])

  const handleOpenTransfer = useCallback(async () => {
    try {
      const tables = await fetchTables()
      setAllTables(tables)
      setShowTransfer(true)
    } catch {
      showToast(t('bills.error'), 'error')
    }
  }, [showToast, t])

  const handleTransfer = useCallback(async (tableId: number) => {
    if (!bill) return
    setTransferring(true)
    try {
      const updated = await transferBill(bill.id, tableId)
      setBill(updated)
      setShowTransfer(false)
      showToast(t('bills.transfer.success'), 'success')
    } catch (err) {
      showToast((err as Error).message ?? t('bills.error'), 'error')
    } finally {
      setTransferring(false)
    }
  }, [bill, showToast, t])

  const handlePay = useCallback(async () => {
    if (!bill) return
    setPaying(true)
    try {
      const paidBill = await payBill(bill.id)
      showToast(t('bills.pay.success'), 'success')

      // Automatska štampa — ne blokira navigaciju ako štampač nije dostupan
      // Auto-print — does not block navigation if printer is unavailable
      const printResult = await printReceipt(paidBill.id)
      if (!printResult.success) {
        // Štampač nije dostupan — prikaži upozorenje ali dozvoli naplatu
        // Printer unavailable — show warning but allow payment
        showToast(t('printer.auto_print_warning'), 'warning')
      }

      navigate('/tables', { replace: true })
    } catch (err) {
      showToast((err as Error).message ?? t('bills.error'), 'error')
      setPaying(false)
      setShowPay(false)
    }
  }, [bill, navigate, showToast, t])

  const handleReprint = useCallback(async () => {
    if (!bill) return
    setReprinting(true)
    try {
      const result = await printReceipt(bill.id)
      if (result.success) {
        showToast(t('printer.reprint_success'), 'success')
      } else {
        showToast(result.message, 'error')
      }
    } finally {
      setReprinting(false)
    }
  }, [bill, showToast, t])

  const handleCancel = useCallback(async (reason: string) => {
    if (!bill) return
    setCancelling(true)
    try {
      await cancelBill(bill.id, reason)
      showToast(t('bills.cancel.success'), 'success')
      navigate('/tables', { replace: true })
    } catch (err) {
      showToast((err as Error).message ?? t('bills.error'), 'error')
      setCancelling(false)
      setShowCancel(false)
    }
  }, [bill, navigate, showToast, t])

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Spinner />
          <p className="text-white/40 text-sm mt-3">{t('bills.loading')}</p>
        </div>
      </div>
    )
  }

  if (!bill) return null

  const isOpen     = bill.status === 'OPEN'
  const openedAt   = new Date(bill.createdAt).toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })

  // Izračunaj subtotal pre popusta za prikaz / Calc pre-discount subtotal for display
  const subtotal = bill.discountPercent > 0
    ? bill.total / (1 - bill.discountPercent / 100)
    : bill.total
  const discountAmount = subtotal - bill.total

  // Suppress unused variable warning for loadBill — it's available for manual refresh
  void loadBill

  return (
    <>
      {/* ── Modali / Modals ─────────────────────────────────────────────── */}
      {showDiscount && (
        <DiscountModal
          title={t('bills.discount.title')}
          current={bill.discountPercent}
          onSave={handleSaveDiscount}
          onClose={() => setShowDiscount(false)}
          saving={savingDiscount}
        />
      )}
      {discountingItem && (
        <DiscountModal
          title={t('bills.itemDiscount.title', { name: discountingItem.product[`name${lang}` as 'nameSr' | 'nameEn'] })}
          current={discountingItem.discount}
          onSave={handleSaveItemDiscount}
          onClose={() => setDiscountingItem(null)}
          saving={savingDiscount}
        />
      )}
      {showTransfer && (
        <TransferModal
          tables={allTables}
          onTransfer={handleTransfer}
          onClose={() => setShowTransfer(false)}
          transferring={transferring}
          lang={lang}
        />
      )}
      {showCancel && (
        <CancelModal
          onConfirm={handleCancel}
          onClose={() => setShowCancel(false)}
          cancelling={cancelling}
        />
      )}
      {showPay && bill && (
        <PayConfirmModal
          bill={bill}
          onPay={handlePay}
          onClose={() => setShowPay(false)}
          paying={paying}
        />
      )}

      {/* ── Glavni layout / Main layout ─────────────────────────────────── */}
      <div className="flex flex-col h-full overflow-hidden">
        {/* Zaglavlje / Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 flex-shrink-0">
          <button
            onClick={() => navigate('/tables')}
            className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white">
                {bill.tableUnit.label}
              </h1>
              <span className={`
                px-2 py-0.5 rounded-full text-xs font-medium
                ${isOpen ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'}
              `}>
                #{bill.id}
              </span>
            </div>
            <p className="text-xs text-white/30 truncate">
              {openedAt} · {bill.user.fullName}
            </p>
          </div>

          {/* Akcijski dugmići u zaglavlju / Header action buttons */}
          {isOpen && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDiscount(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium
                           bg-yellow-500/10 text-yellow-400 border border-yellow-500/20
                           hover:bg-yellow-500/20 transition-colors"
              >
                % {t('bills.actions.discount')}
              </button>
              <button
                onClick={handleOpenTransfer}
                className="px-3 py-1.5 rounded-lg text-xs font-medium
                           bg-blue-500/10 text-blue-400 border border-blue-500/20
                           hover:bg-blue-500/20 transition-colors"
              >
                ↔ {t('bills.actions.transfer')}
              </button>
            </div>
          )}
        </div>

        {/* Telo / Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* ── Leva strana: Meni ───────────────────────────────────────── */}
          {isOpen && (
            <div className="w-80 flex-shrink-0 border-r border-white/5 overflow-hidden flex flex-col">
              <MenuPanel
                categories={categories}
                products={products}
                selectedCatId={selectedCatId}
                onCatSelect={setSelectedCatId}
                onAddProduct={handleAddProduct}
                addingProductId={addingProductId}
                lang={lang}
              />
            </div>
          )}

          {/* ── Desna strana: Račun ──────────────────────────────────────── */}
          <div className={`flex-1 flex flex-col overflow-hidden ${!isOpen ? 'max-w-2xl mx-auto w-full' : ''}`}>
            {/* Lista stavki / Items list */}
            <div className="flex-1 overflow-y-auto p-4">
              {bill.items.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-white/20 text-4xl mb-3">🛒</p>
                    <p className="text-white/30 text-sm">{t('bills.emptyBill')}</p>
                  </div>
                </div>
              ) : (
                <>
                  {bill.items.map(item => (
                    <BillItemRow
                      key={item.id}
                      item={item}
                      onUpdate={handleUpdateItem}
                      onRemove={handleRemoveItem}
                      onDiscount={setDiscountingItem}
                      busy={updatingItemId === item.id}
                      lang={lang}
                    />
                  ))}
                </>
              )}
            </div>

            {/* Dno: ukupni iznosi + akcije / Bottom: totals + actions */}
            <div className="flex-shrink-0 border-t border-white/5 p-4">
              {/* Ukupni iznosi / Totals */}
              {bill.items.length > 0 && (
                <div className="bg-white/3 rounded-xl px-4 py-3 mb-3 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-white/40 inline-block" />
                      {t('bills.totals.white')}
                    </span>
                    <span className="text-white/70">
                      {bill.whiteTotal.toLocaleString('sr-RS', { maximumFractionDigits: 0 })} RSD
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-gray-500 inline-block" />
                      {t('bills.totals.black')}
                    </span>
                    <span className="text-white/70">
                      {bill.blackTotal.toLocaleString('sr-RS', { maximumFractionDigits: 0 })} RSD
                    </span>
                  </div>
                  {bill.discountPercent > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-yellow-400/70">{t('bills.totals.discount')} ({bill.discountPercent}%)</span>
                      <span className="text-yellow-400/70">
                        −{discountAmount.toLocaleString('sr-RS', { maximumFractionDigits: 0 })} RSD
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1.5 border-t border-white/8">
                    <span className="text-white font-bold">{t('bills.totals.total')}</span>
                    <span className="text-white text-xl font-bold">
                      {bill.total.toLocaleString('sr-RS', { maximumFractionDigits: 0 })} RSD
                    </span>
                  </div>
                </div>
              )}

              {/* Akcijska dugmad / Action buttons */}
              {isOpen ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCancel(true)}
                    disabled={cancelling}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium
                               bg-red-500/10 text-red-400 border border-red-500/20
                               hover:bg-red-500/20 transition-colors disabled:opacity-40"
                  >
                    {t('bills.actions.cancel')}
                  </button>
                  <button
                    onClick={() => setShowPay(true)}
                    disabled={paying || bill.items.length === 0}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold
                               bg-green-500 text-white hover:bg-green-600 transition-colors
                               disabled:opacity-40 disabled:cursor-not-allowed
                               flex items-center justify-center gap-2"
                  >
                    {paying
                      ? <><Spinner small /><span>{t('bills.pay.paying')}</span></>
                      : `${t('bills.actions.pay')} ${bill.items.length > 0 ? '· ' + bill.total.toLocaleString('sr-RS', { maximumFractionDigits: 0 }) + ' RSD' : ''}`
                    }
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <span className={`
                    inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
                    ${bill.status === 'PAID' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}
                  `}>
                    {bill.status === 'PAID' ? t('bills.status.paid') : t('bills.status.cancelled')}
                  </span>
                  {bill.status === 'PAID' && (
                    <button
                      onClick={handleReprint}
                      disabled={reprinting}
                      className="px-4 py-2 rounded-xl text-sm font-medium
                                 bg-white/8 text-white/60 border border-white/10
                                 hover:bg-white/12 hover:text-white transition-colors
                                 disabled:opacity-40 flex items-center gap-2"
                    >
                      {reprinting
                        ? <><Spinner small /><span>{t('printer.reprinting')}</span></>
                        : <>🖨 {t('printer.reprint')}</>
                      }
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
