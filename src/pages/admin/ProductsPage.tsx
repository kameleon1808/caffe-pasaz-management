/**
 * @file src/pages/admin/ProductsPage.tsx
 * @description CRUD stranica za upravljanje proizvodima (samo admin).
 *              CRUD page for managing products (admin only).
 *
 * Funkcionalnosti / Features:
 * - Prikaz liste proizvoda sa pretragom i filtrom po kategoriji
 * - Kreiranje, izmena i deaktivacija proizvoda
 * - Toast notifikacije za sve akcije
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { useToast }       from '../../hooks/useToast'
import { Badge }          from '../../components/ui/Badge'
import { Modal }          from '../../components/ui/Modal'
import { ConfirmDialog }  from '../../components/ui/ConfirmDialog'
import { FormField }      from '../../components/ui/FormField'
import { DataTable }      from '../../components/ui/DataTable'
import type { ColumnDef } from '../../components/ui/DataTable'

import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  type CreateProductPayload,
} from '../../api/products'
import { fetchCategories, type CategoryWithCount } from '../../api/categories'
import type { Product } from '../../types'

const UNITS = ['kom', 'lit', 'dcl', 'flaša'] as const

interface ProductForm {
  categoryId:    string
  nameSr:        string
  nameEn:        string
  price:         string
  stockQuantity: string
  unit:          string
  active?:       boolean
}

interface FormErrors {
  categoryId?:    string
  nameSr?:        string
  nameEn?:        string
  price?:         string
  stockQuantity?: string
  unit?:          string
}

const EMPTY_FORM: ProductForm = {
  categoryId:    '',
  nameSr:        '',
  nameEn:        '',
  price:         '',
  stockQuantity: '0',
  unit:          'kom',
}

/**
 * Stranica za upravljanje proizvodima.
 * Product management page.
 */
export function ProductsPage() {
  const { t }         = useTranslation()
  const { showToast } = useToast()

  const [products,     setProducts]     = useState<Product[]>([])
  const [categories,   setCategories]   = useState<CategoryWithCount[]>([])
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [deleting,     setDeleting]     = useState(false)

  const [search,       setSearch]       = useState('')
  const [filterCatId,  setFilterCatId]  = useState<number | undefined>()
  const [showInactive, setShowInactive] = useState(false)

  const [modalOpen,    setModalOpen]    = useState(false)
  const [editTarget,   setEditTarget]   = useState<Product | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)

  const [form,   setForm]   = useState<ProductForm>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})

  // ─── Load ──────────────────────────────────────────────────────────────────

  const loadCategories = useCallback(async () => {
    try {
      const data = await fetchCategories(true)
      setCategories(data)
    } catch { /* categories not critical */ }
  }, [])

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchProducts({
        categoryId:   filterCatId,
        search:       search || undefined,
        showInactive,
      })
      setProducts(data)
    } catch {
      showToast(t('products.error_load'), 'error')
    } finally {
      setLoading(false)
    }
  }, [filterCatId, search, showInactive, showToast, t])

  useEffect(() => { loadCategories() }, [loadCategories])
  useEffect(() => { loadProducts() },   [loadProducts])

  // ─── Filtered search (client-side live) ────────────────────────────────────

  const displayed = useMemo(() => {
    if (!search) return products
    const q = search.toLowerCase()
    return products.filter(p =>
      p.nameSr.toLowerCase().includes(q) || p.nameEn.toLowerCase().includes(q)
    )
  }, [products, search])

  // ─── Modal helpers ─────────────────────────────────────────────────────────

  function openCreate() {
    setEditTarget(null)
    setForm({ ...EMPTY_FORM, categoryId: filterCatId ? String(filterCatId) : '' })
    setErrors({})
    setModalOpen(true)
  }

  function openEdit(product: Product) {
    setEditTarget(product)
    setForm({
      categoryId:    String(product.categoryId),
      nameSr:        product.nameSr,
      nameEn:        product.nameEn,
      price:         String(product.price),
      stockQuantity: String(product.stockQuantity),
      unit:          product.unit,
      active:        product.active,
    })
    setErrors({})
    setModalOpen(true)
  }

  function closeModal() {
    if (saving) return
    setModalOpen(false)
  }

  // ─── Validation ────────────────────────────────────────────────────────────

  function validate(): boolean {
    const e: FormErrors = {}
    if (!form.categoryId) e.categoryId = t('products.category')
    if (!form.nameSr.trim()) e.nameSr = t('products.name_sr')
    if (!form.nameEn.trim()) e.nameEn = t('products.name_en')
    const price = parseFloat(form.price)
    if (isNaN(price) || price <= 0) e.price = t('products.price')
    const qty = parseInt(form.stockQuantity)
    if (isNaN(qty) || qty < 0) e.stockQuantity = t('products.stock')
    if (!form.unit) e.unit = t('products.unit')
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ─── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      const payload: CreateProductPayload = {
        categoryId:    parseInt(form.categoryId),
        nameSr:        form.nameSr.trim(),
        nameEn:        form.nameEn.trim(),
        price:         parseFloat(form.price),
        stockQuantity: parseInt(form.stockQuantity),
        unit:          form.unit,
      }
      if (editTarget) {
        await updateProduct(editTarget.id, { ...payload, active: form.active })
        showToast(t('products.success_update'), 'success')
      } else {
        await createProduct(payload)
        showToast(t('products.success_create'), 'success')
      }
      setModalOpen(false)
      loadProducts()
    } catch {
      showToast(t('products.error_save'), 'error')
    } finally {
      setSaving(false)
    }
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteProduct(deleteTarget.id)
      showToast(t('products.success_delete'), 'success')
      setDeleteTarget(null)
      loadProducts()
    } catch {
      showToast(t('products.error_delete'), 'error')
    } finally {
      setDeleting(false)
    }
  }

  // ─── Table columns ─────────────────────────────────────────────────────────

  const columns: ColumnDef<Product>[] = [
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
      key:      'categoryId',
      header:   t('products.category'),
      render:   row => {
        const cat = categories.find(c => c.id === row.categoryId)
        return <span className="text-white/70">{cat?.nameSr ?? '—'}</span>
      },
    },
    {
      key:      'price',
      header:   t('products.price'),
      sortable: true,
      render:   row => <span className="text-amber-400 font-medium">{row.price} RSD</span>,
    },
    {
      key:      'stockQuantity',
      header:   t('inventory.stock_col'),
      sortable: true,
      render:   row => (
        <span className={row.stockQuantity <= 5 ? 'text-red-400 font-medium' : 'text-white/70'}>
          {row.stockQuantity} {row.unit}
        </span>
      ),
    },
    {
      key:    'active',
      header: t('common.status_active'),
      render: row => <Badge variant={row.active ? 'active' : 'inactive'} />,
    },
    {
      key:    'actions' as keyof Product,
      header: t('inventory.actions_col'),
      render: row => (
        <div className="flex items-center gap-1">
          <button
            onClick={e => { e.stopPropagation(); openEdit(row) }}
            className="p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={e => { e.stopPropagation(); setDeleteTarget(row) }}
            className="p-1.5 rounded-md text-white/40 hover:text-red-400 hover:bg-white/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ),
    },
  ]

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">{t('products.title')}</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-black font-medium rounded-lg hover:bg-primary-600 transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('products.add')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('products.search_placeholder')}
          className="flex-1 min-w-[200px] px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-primary-500 text-sm"
        />
        <select
          value={filterCatId ?? ''}
          onChange={e => setFilterCatId(e.target.value ? parseInt(e.target.value) : undefined)}
          className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-primary-500 text-sm"
        >
          <option value="">{t('products.all_categories')}</option>
          {categories.filter(c => c.active).map(c => (
            <option key={c.id} value={c.id}>{c.nameSr}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={e => setShowInactive(e.target.checked)}
            className="rounded border-white/20 bg-white/10 text-primary-400 focus:ring-primary-500"
          />
          {t('products.show_inactive')}
        </label>
      </div>

      {/* Table */}
      <DataTable<Product>
        columns={columns}
        rows={displayed}
        loading={loading}
        keyExtractor={r => r.id}
        emptyText={t('common.no_data')}
      />

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editTarget ? t('products.edit') : t('products.create')}
        size="md"
      >
        <div className="flex flex-col gap-4">
          <FormField label={t('products.category')} error={errors.categoryId} required>
            <select
              value={form.categoryId}
              onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-primary-500 text-sm"
            >
              <option value="">{t('products.all_categories')}</option>
              {categories.filter(c => c.active).map(c => (
                <option key={c.id} value={c.id}>{c.nameSr}</option>
              ))}
            </select>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label={t('products.name_sr')} error={errors.nameSr} required>
              <input
                type="text"
                value={form.nameSr}
                onChange={e => setForm(f => ({ ...f, nameSr: e.target.value }))}
                placeholder={t('products.name_sr_placeholder')}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-primary-500 text-sm"
              />
            </FormField>
            <FormField label={t('products.name_en')} error={errors.nameEn} required>
              <input
                type="text"
                value={form.nameEn}
                onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))}
                placeholder={t('products.name_en_placeholder')}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-primary-500 text-sm"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <FormField label={t('products.price')} error={errors.price} required hint={t('products.price_hint')}>
              <input
                type="number"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                min={0}
                step={0.01}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-primary-500 text-sm"
              />
            </FormField>
            <FormField label={t('products.stock')} error={errors.stockQuantity} hint={t('products.stock_hint')}>
              <input
                type="number"
                value={form.stockQuantity}
                onChange={e => setForm(f => ({ ...f, stockQuantity: e.target.value }))}
                min={0}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-primary-500 text-sm"
              />
            </FormField>
            <FormField label={t('products.unit')} error={errors.unit} hint={t('products.unit_hint')}>
              <select
                value={form.unit}
                onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-primary-500 text-sm"
              >
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </FormField>
          </div>

          {editTarget && (
            <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
              <input
                type="checkbox"
                checked={form.active ?? true}
                onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                className="rounded border-white/20 bg-white/10 text-primary-400 focus:ring-primary-500"
              />
              {t('common.status_active')}
            </label>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={closeModal}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-primary-500 text-black text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              {saving ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('products.delete_title')}
        message={t('products.delete_message', { name: deleteTarget?.nameSr ?? '' })}
        variant="danger"
        confirmLabel={t('common.delete')}
        loading={deleting}
      />
    </div>
  )
}
