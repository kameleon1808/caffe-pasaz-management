/**
 * @file src/pages/admin/CategoriesPage.tsx
 * @description CRUD stranica za upravljanje kategorijama (samo admin).
 *              CRUD page for managing categories (admin only).
 *
 * Funkcionalnosti / Features:
 * - Prikaz liste kategorija sa drag-and-drop reorder (@dnd-kit)
 * - Kreiranje, izmena i brisanje kategorija
 * - Prikaz/sakrivanje neaktivnih kategorija
 * - Toast notifikacije za sve akcije
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { useToast }                        from '../../hooks/useToast'
import { Badge }                           from '../../components/ui/Badge'
import { Modal }                           from '../../components/ui/Modal'
import { ConfirmDialog }                   from '../../components/ui/ConfirmDialog'
import { FormField }                       from '../../components/ui/FormField'
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  type CategoryWithCount,
} from '../../api/categories'

// ─── Sortable Row ─────────────────────────────────────────────────────────────

interface SortableRowProps {
  cat:       CategoryWithCount
  onEdit:    (cat: CategoryWithCount) => void
  onDelete:  (cat: CategoryWithCount) => void
  onToggle:  (cat: CategoryWithCount) => void
}

function SortableRow({ cat, onEdit, onDelete, onToggle }: SortableRowProps) {
  const { t } = useTranslation()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/8 rounded-lg border border-white/10 transition-colors"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="text-white/30 hover:text-white/60 cursor-grab active:cursor-grabbing touch-none"
        title={t('categories.drag_to_reorder')}
        aria-label={t('categories.drag_to_reorder')}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M4 8h16M4 12h16M4 16h16" />
        </svg>
      </button>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className={`font-medium truncate ${cat.active ? 'text-white' : 'text-white/40'}`}>
          {cat.nameSr}
        </p>
        <p className="text-xs text-white/40 truncate">{cat.nameEn}</p>
      </div>

      {/* Product count */}
      <span className="text-sm text-white/50 hidden sm:block">
        {cat._count.products} {t('categories.product_count')}
      </span>

      {/* Status badge */}
      <Badge variant={cat.active ? 'active' : 'inactive'} />

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onToggle(cat)}
          title={t('categories.toggle_active')}
          className="p-1.5 rounded-md text-white/40 hover:text-amber-400 hover:bg-white/10 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d={cat.active
                ? 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636'
                : 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'} />
          </svg>
        </button>
        <button
          onClick={() => onEdit(cat)}
          className="p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={() => onDelete(cat)}
          className="p-1.5 rounded-md text-white/40 hover:text-red-400 hover:bg-white/10 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ─── Category Form ─────────────────────────────────────────────────────────────

interface CategoryForm {
  nameSr:    string
  nameEn:    string
  sortOrder: string
}

interface FormErrors {
  nameSr?:    string
  nameEn?:    string
  sortOrder?: string
}

// ─── Main Page ────────────────────────────────────────────────────────────────

/**
 * Stranica za upravljanje kategorijama.
 * Category management page.
 */
export function CategoriesPage() {
  const { t }          = useTranslation()
  const { showToast }  = useToast()

  const [categories,    setCategories]    = useState<CategoryWithCount[]>([])
  const [loading,       setLoading]       = useState(true)
  const [showInactive,  setShowInactive]  = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [deleting,      setDeleting]      = useState(false)

  // Modal state
  const [modalOpen,     setModalOpen]     = useState(false)
  const [editTarget,    setEditTarget]    = useState<CategoryWithCount | null>(null)
  const [deleteTarget,  setDeleteTarget]  = useState<CategoryWithCount | null>(null)

  // Form state
  const [form,   setForm]   = useState<CategoryForm>({ nameSr: '', nameEn: '', sortOrder: '' })
  const [errors, setErrors] = useState<FormErrors>({})

  const sensors = useSensors(useSensor(PointerSensor))

  // ─── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchCategories(showInactive)
      setCategories(data)
    } catch {
      showToast(t('categories.error_load'), 'error')
    } finally {
      setLoading(false)
    }
  }, [showInactive, showToast, t])

  useEffect(() => { load() }, [load])

  // ─── Modal helpers ─────────────────────────────────────────────────────────

  function openCreate() {
    setEditTarget(null)
    setForm({ nameSr: '', nameEn: '', sortOrder: String(categories.length + 1) })
    setErrors({})
    setModalOpen(true)
  }

  function openEdit(cat: CategoryWithCount) {
    setEditTarget(cat)
    setForm({ nameSr: cat.nameSr, nameEn: cat.nameEn, sortOrder: String(cat.sortOrder) })
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
    if (!form.nameSr.trim()) e.nameSr = t('categories.name_sr') + ' ' + t('common.error').toLowerCase()
    if (!form.nameEn.trim()) e.nameEn = t('categories.name_en') + ' ' + t('common.error').toLowerCase()
    const so = parseInt(form.sortOrder)
    if (isNaN(so) || so < 0) e.sortOrder = t('categories.sort_order')
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ─── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      const payload = {
        nameSr:    form.nameSr.trim(),
        nameEn:    form.nameEn.trim(),
        sortOrder: parseInt(form.sortOrder),
      }
      if (editTarget) {
        await updateCategory(editTarget.id, payload)
        showToast(t('categories.success_update'), 'success')
      } else {
        await createCategory(payload)
        showToast(t('categories.success_create'), 'success')
      }
      setModalOpen(false)
      load()
    } catch {
      showToast(t('categories.error_save'), 'error')
    } finally {
      setSaving(false)
    }
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteCategory(deleteTarget.id)
      showToast(t('categories.success_delete'), 'success')
      setDeleteTarget(null)
      load()
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'CATEGORY_HAS_PRODUCTS') {
        showToast(t('categories.error_has_products'), 'error')
      } else {
        showToast(t('categories.error_delete'), 'error')
      }
    } finally {
      setDeleting(false)
    }
  }

  // ─── Toggle active ─────────────────────────────────────────────────────────

  async function handleToggle(cat: CategoryWithCount) {
    try {
      await updateCategory(cat.id, { active: !cat.active })
      showToast(t('categories.success_update'), 'success')
      load()
    } catch {
      showToast(t('categories.error_save'), 'error')
    }
  }

  // ─── Drag and drop reorder ─────────────────────────────────────────────────

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = categories.findIndex(c => c.id === active.id)
    const newIndex = categories.findIndex(c => c.id === over.id)
    const reordered = arrayMove(categories, oldIndex, newIndex)

    // Optimistic update
    setCategories(reordered)

    try {
      await reorderCategories(reordered.map((c, i) => ({ id: c.id, sortOrder: i + 1 })))
      showToast(t('categories.success_reorder'), 'success')
    } catch {
      showToast(t('categories.error_reorder'), 'error')
      load() // revert
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('categories.title')}</h1>
          <p className="text-sm text-white/50 mt-1">{t('categories.drag_to_reorder')}</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={e => setShowInactive(e.target.checked)}
              className="rounded border-white/20 bg-white/10 text-primary-400 focus:ring-primary-500"
            />
            {t('categories.show_inactive')}
          </label>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-black font-medium rounded-lg hover:bg-primary-600 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('categories.add')}
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary-500/50 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : categories.length === 0 ? (
        <p className="text-center py-16 text-white/40">{t('common.no_data')}</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2">
              {categories.map(cat => (
                <SortableRow
                  key={cat.id}
                  cat={cat}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editTarget ? t('categories.edit') : t('categories.create')}
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <FormField label={t('categories.name_sr')} error={errors.nameSr} required>
            <input
              type="text"
              value={form.nameSr}
              onChange={e => setForm(f => ({ ...f, nameSr: e.target.value }))}
              placeholder={t('categories.name_sr_placeholder')}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-primary-500 text-sm"
            />
          </FormField>

          <FormField label={t('categories.name_en')} error={errors.nameEn} required>
            <input
              type="text"
              value={form.nameEn}
              onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))}
              placeholder={t('categories.name_en_placeholder')}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-primary-500 text-sm"
            />
          </FormField>

          <FormField
            label={t('categories.sort_order')}
            error={errors.sortOrder}
            hint={t('categories.sort_order_hint')}
          >
            <input
              type="number"
              value={form.sortOrder}
              onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))}
              min={1}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-primary-500 text-sm"
            />
          </FormField>

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
        title={t('categories.delete_title')}
        message={t('categories.delete_message', { name: deleteTarget?.nameSr ?? '' })}
        variant="danger"
        confirmLabel={t('common.delete')}
        loading={deleting}
      />
    </div>
  )
}
