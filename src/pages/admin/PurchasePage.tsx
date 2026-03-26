/**
 * @file src/pages/admin/PurchasePage.tsx
 * @description Stranica za grupni prijem robe (dodavanje zaliha).
 *              Page for batch goods receipt (adding stock).
 *
 * Korisnik može dodati više redova sa različitim proizvodima i količinama
 * i potom potvrditi prijem odjednom.
 *
 * User can add multiple rows with different products and quantities
 * and then confirm the receipt all at once.
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate }    from 'react-router-dom'

import { useToast }    from '../../hooks/useToast'
import { FormField }   from '../../components/ui/FormField'

import { fetchProducts }                  from '../../api/products'
import { submitPurchase, type PurchaseItem } from '../../api/inventory'
import type { Product } from '../../types'

interface PurchaseRow {
  id:        string    // local key
  productId: string
  quantity:  string
  note:      string
}

interface RowError {
  productId?: string
  quantity?:  string
}

function makeRow(): PurchaseRow {
  return {
    id:        `row-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    productId: '',
    quantity:  '',
    note:      '',
  }
}

/**
 * Stranica za prijem robe u grupnom modu.
 * Batch goods receipt page.
 */
export function PurchasePage() {
  const { t }         = useTranslation()
  const { showToast } = useToast()
  const navigate      = useNavigate()

  const [products,    setProducts]    = useState<Product[]>([])
  const [loadingProd, setLoadingProd] = useState(true)
  const [rows,        setRows]        = useState<PurchaseRow[]>([makeRow()])
  const [rowErrors,   setRowErrors]   = useState<Record<string, RowError>>({})
  const [submitting,  setSubmitting]  = useState(false)

  // ─── Load products ─────────────────────────────────────────────────────────

  const loadProducts = useCallback(async () => {
    setLoadingProd(true)
    try {
      const data = await fetchProducts({ showInactive: false })
      setProducts(data)
    } catch {
      showToast(t('products.error_load'), 'error')
    } finally {
      setLoadingProd(false)
    }
  }, [showToast, t])

  useEffect(() => { loadProducts() }, [loadProducts])

  // ─── Row management ────────────────────────────────────────────────────────

  function addRow() {
    setRows(r => [...r, makeRow()])
  }

  function removeRow(id: string) {
    setRows(r => r.filter(row => row.id !== id))
    setRowErrors(e => {
      const copy = { ...e }
      delete copy[id]
      return copy
    })
  }

  function updateRow(id: string, field: keyof PurchaseRow, value: string) {
    setRows(r => r.map(row => row.id === id ? { ...row, [field]: value } : row))
    // Clear error for that field
    setRowErrors(e => {
      if (!e[id]) return e
      const copy = { ...e, [id]: { ...e[id] } }
      delete copy[id][field as keyof RowError]
      return copy
    })
  }

  // ─── Product lookup ────────────────────────────────────────────────────────

  function getProduct(productId: string): Product | undefined {
    return products.find(p => p.id === parseInt(productId))
  }

  // ─── Validation ────────────────────────────────────────────────────────────

  function validate(): boolean {
    if (rows.length === 0) {
      showToast(t('purchase.error_empty'), 'warning')
      return false
    }

    const newErrors: Record<string, RowError> = {}
    let valid = true

    for (const row of rows) {
      const err: RowError = {}
      if (!row.productId) {
        err.productId = t('purchase.error_product_required')
        valid = false
      }
      if (!row.quantity) {
        err.quantity = t('purchase.error_quantity_required')
        valid = false
      } else {
        const qty = parseInt(row.quantity)
        if (isNaN(qty) || qty <= 0) {
          err.quantity = t('purchase.error_quantity_positive')
          valid = false
        }
      }
      if (Object.keys(err).length > 0) newErrors[row.id] = err
    }

    setRowErrors(newErrors)
    return valid
  }

  // ─── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!validate()) return
    setSubmitting(true)
    try {
      const items: PurchaseItem[] = rows.map(row => ({
        productId: parseInt(row.productId),
        quantity:  parseInt(row.quantity),
        note:      row.note.trim() || undefined,
      }))
      await submitPurchase(items)
      showToast(t('purchase.success'), 'success')
      navigate('/inventory')
    } catch {
      showToast(t('purchase.error_submit'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/inventory')}
          className="flex items-center gap-1 text-sm text-white/50 hover:text-white/80 transition-colors mb-3"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('common.back')}
        </button>
        <h1 className="text-2xl font-bold text-white">{t('purchase.title')}</h1>
        <p className="text-sm text-white/50 mt-1">{t('purchase.subtitle')}</p>
      </div>

      {/* Rows */}
      <div className="flex flex-col gap-3">
        {rows.map((row, idx) => {
          const product = getProduct(row.productId)
          const err     = rowErrors[row.id]

          return (
            <div
              key={row.id}
              className="p-4 bg-white/5 border border-white/10 rounded-xl"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-medium text-white/40 uppercase tracking-wider">
                  #{idx + 1}
                </span>
                {rows.length > 1 && (
                  <button
                    onClick={() => removeRow(row.id)}
                    className="text-white/30 hover:text-red-400 transition-colors"
                    title={t('purchase.remove_row')}
                    aria-label={t('purchase.remove_row')}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Product select */}
                <div className="sm:col-span-2">
                  <FormField label={t('purchase.product')} error={err?.productId} required>
                    <select
                      value={row.productId}
                      onChange={e => updateRow(row.id, 'productId', e.target.value)}
                      disabled={loadingProd}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-primary-500 text-sm disabled:opacity-50"
                    >
                      <option value="">{t('purchase.select_product')}</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nameSr} ({p.stockQuantity} {p.unit})
                        </option>
                      ))}
                    </select>
                  </FormField>
                  {product && (
                    <p className="text-xs text-white/40 mt-1">
                      {t('purchase.current_stock', { qty: product.stockQuantity, unit: product.unit })}
                    </p>
                  )}
                </div>

                {/* Quantity */}
                <FormField label={t('purchase.quantity')} error={err?.quantity} required>
                  <input
                    type="number"
                    value={row.quantity}
                    onChange={e => updateRow(row.id, 'quantity', e.target.value)}
                    min={1}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-primary-500 text-sm"
                  />
                </FormField>

                {/* Note */}
                <div className="sm:col-span-3">
                  <FormField label={t('purchase.note')}>
                    <input
                      type="text"
                      value={row.note}
                      onChange={e => updateRow(row.id, 'note', e.target.value)}
                      placeholder={t('purchase.note_placeholder')}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-primary-500 text-sm"
                    />
                  </FormField>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add row */}
      <button
        onClick={addRow}
        className="mt-3 w-full py-2.5 border border-dashed border-white/20 rounded-xl text-sm text-white/50 hover:text-white/80 hover:border-white/40 transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        {t('purchase.add_row')}
      </button>

      {/* Submit */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="px-6 py-2.5 bg-primary-500 text-black font-semibold rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50 text-sm"
        >
          {submitting ? t('purchase.submitting') : t('purchase.submit')}
        </button>
      </div>
    </div>
  )
}
