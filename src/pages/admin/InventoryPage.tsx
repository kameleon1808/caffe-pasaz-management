/**
 * @file src/pages/admin/InventoryPage.tsx
 * @description Pregled stanja magacina sa upozorenjem za nisko stanje i ručnom korekcijom.
 *              Inventory overview with low-stock warning and manual stock adjustment.
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Link }           from 'react-router-dom'

import { useToast }      from '../../hooks/useToast'
import { Badge }         from '../../components/ui/Badge'
import { Modal }         from '../../components/ui/Modal'
import { FormField }     from '../../components/ui/FormField'
import { DataTable }     from '../../components/ui/DataTable'
import type { ColumnDef } from '../../components/ui/DataTable'

import {
  fetchInventory,
  submitAdjustment,
  type InventoryItem,
} from '../../api/inventory'
import { fetchCategories, type CategoryWithCount } from '../../api/categories'

interface AdjustForm {
  changeQty: string
  note:      string
}

interface AdjustErrors {
  changeQty?: string
  note?:      string
}

/**
 * Stranica za pregled inventara.
 * Inventory overview page.
 */
export function InventoryPage() {
  const { t }         = useTranslation()
  const { showToast } = useToast()

  const [items,       setItems]       = useState<InventoryItem[]>([])
  const [categories,  setCategories]  = useState<CategoryWithCount[]>([])
  const [loading,     setLoading]     = useState(true)
  const [filterCatId, setFilterCatId] = useState<number | undefined>()

  const [adjustTarget, setAdjustTarget] = useState<InventoryItem | null>(null)
  const [adjustForm,   setAdjustForm]   = useState<AdjustForm>({ changeQty: '', note: '' })
  const [adjustErrors, setAdjustErrors] = useState<AdjustErrors>({})
  const [adjusting,    setAdjusting]    = useState(false)

  // ─── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [inv, cats] = await Promise.all([
        fetchInventory(filterCatId),
        fetchCategories(false),
      ])
      setItems(inv)
      setCategories(cats)
    } catch {
      showToast(t('inventory.error_load'), 'error')
    } finally {
      setLoading(false)
    }
  }, [filterCatId, showToast, t])

  useEffect(() => { load() }, [load])

  const lowStockItems = items.filter(i => i.isLowStock)

  // ─── Adjust modal ──────────────────────────────────────────────────────────

  function openAdjust(item: InventoryItem) {
    setAdjustTarget(item)
    setAdjustForm({ changeQty: '', note: '' })
    setAdjustErrors({})
  }

  function validateAdjust(): boolean {
    const e: AdjustErrors = {}
    const qty = parseInt(adjustForm.changeQty)
    if (isNaN(qty) || qty === 0) e.changeQty = t('inventory.adjust_change')
    if (!adjustForm.note.trim()) e.note = t('inventory.adjust_note')
    if (adjustTarget && !isNaN(qty) && adjustTarget.stockQuantity + qty < 0) {
      e.changeQty = t('inventory.error_negative')
    }
    setAdjustErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleAdjust() {
    if (!adjustTarget || !validateAdjust()) return
    setAdjusting(true)
    try {
      await submitAdjustment(
        adjustTarget.id,
        parseInt(adjustForm.changeQty),
        adjustForm.note.trim()
      )
      showToast(t('inventory.success_adjust'), 'success')
      setAdjustTarget(null)
      load()
    } catch {
      showToast(t('inventory.error_adjust'), 'error')
    } finally {
      setAdjusting(false)
    }
  }

  // ─── Columns ───────────────────────────────────────────────────────────────

  const columns: ColumnDef<InventoryItem>[] = [
    {
      key:      'nameSr',
      header:   t('products.name_sr'),
      sortable: true,
      render:   row => (
        <div>
          <p className="font-medium text-white">{row.nameSr}</p>
          <p className="text-xs text-white/40">{row.nameEn}</p>
        </div>
      ),
    },
    {
      key:    'category',
      header: t('products.category'),
      render: row => <span className="text-white/60">{row.category?.nameSr ?? '—'}</span>,
    },
    {
      key:      'stockQuantity',
      header:   t('inventory.stock_col'),
      sortable: true,
      render:   row => (
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${row.isLowStock ? 'text-red-400' : 'text-white'}`}>
            {row.stockQuantity}
          </span>
          {row.isLowStock && <Badge variant="low-stock" />}
        </div>
      ),
    },
    {
      key:    'unit',
      header: t('inventory.unit_col'),
      render: row => <span className="text-white/50 text-sm">{row.unit}</span>,
    },
    {
      key:    'actions' as keyof InventoryItem,
      header: t('inventory.actions_col'),
      render: row => (
        <button
          onClick={() => openAdjust(row)}
          className="px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
        >
          {t('inventory.adjust_title')}
        </button>
      ),
    },
  ]

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">{t('inventory.title')}</h1>
        <Link
          to="/inventory/purchase"
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-black font-medium rounded-lg hover:bg-primary-600 transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('inventory.purchase_link')}
        </Link>
      </div>

      {/* Low stock warning */}
      {!loading && lowStockItems.length > 0 && (
        <div className="mb-4 p-4 rounded-xl bg-red-900/30 border border-red-500/30">
          <p className="text-sm font-semibold text-red-400 mb-2">{t('inventory.low_stock_warning')}</p>
          <div className="flex flex-wrap gap-2">
            {lowStockItems.map(item => (
              <span key={item.id} className="px-2 py-1 text-xs bg-red-900/50 text-red-300 rounded-lg">
                {item.nameSr} — {item.stockQuantity} {item.unit}
              </span>
            ))}
          </div>
        </div>
      )}

      {!loading && lowStockItems.length === 0 && (
        <div className="mb-4 p-3 rounded-xl bg-green-900/20 border border-green-500/20">
          <p className="text-sm text-green-400">{t('inventory.all_ok')}</p>
        </div>
      )}

      {/* Category filter */}
      <div className="mb-4">
        <select
          value={filterCatId ?? ''}
          onChange={e => setFilterCatId(e.target.value ? parseInt(e.target.value) : undefined)}
          className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-primary-500 text-sm"
        >
          <option value="">{t('inventory.all_categories')}</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.nameSr}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <DataTable<InventoryItem>
        columns={columns}
        rows={items}
        loading={loading}
        keyExtractor={r => r.id}
      />

      {/* Adjust Modal */}
      <Modal
        open={!!adjustTarget}
        onClose={() => { if (!adjusting) setAdjustTarget(null) }}
        title={t('inventory.adjust_title')}
        size="sm"
      >
        {adjustTarget && (
          <div className="flex flex-col gap-4">
            <div className="p-3 bg-white/5 rounded-lg">
              <p className="text-sm text-white/50">{t('inventory.adjust_product')}</p>
              <p className="font-semibold text-white">{adjustTarget.nameSr}</p>
              <p className="text-sm text-white/60 mt-1">
                {t('inventory.adjust_current')}: <strong className="text-white">{adjustTarget.stockQuantity} {adjustTarget.unit}</strong>
              </p>
            </div>

            <FormField
              label={t('inventory.adjust_change')}
              error={adjustErrors.changeQty}
              hint={t('inventory.adjust_change_hint')}
              required
            >
              <input
                type="number"
                value={adjustForm.changeQty}
                onChange={e => setAdjustForm(f => ({ ...f, changeQty: e.target.value }))}
                placeholder="npr. +10 ili -3"
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-primary-500 text-sm"
              />
            </FormField>

            <FormField label={t('inventory.adjust_note')} error={adjustErrors.note} required>
              <textarea
                value={adjustForm.note}
                onChange={e => setAdjustForm(f => ({ ...f, note: e.target.value }))}
                placeholder={t('inventory.adjust_note_placeholder')}
                rows={3}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-primary-500 text-sm resize-none"
              />
            </FormField>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setAdjustTarget(null)}
                disabled={adjusting}
                className="px-4 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleAdjust}
                disabled={adjusting}
                className="px-4 py-2 bg-primary-500 text-black text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                {adjusting ? t('common.loading') : t('inventory.adjust_submit')}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
