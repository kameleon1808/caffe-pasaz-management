/**
 * @file src/pages/admin/TableLayoutPage.tsx
 * @description Admin stranica za upravljanje stolovima (kreiranje, brisanje, pozicije).
 *              Admin page for managing tables (create, delete, positions).
 *
 * Funkcionalnosti / Features:
 * - Lista stolova po zonama (INDOOR / OUTDOOR tabovi)
 * - Kreiranje novog stola
 * - Izmena podataka stola
 * - Soft delete uz potvrdu
 * - Resetovanje pozicija na default raspored
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation }                   from 'react-i18next'
import { useToast }                         from '../../hooks/useToast'
import { Modal }                            from '../../components/ui/Modal'
import { ConfirmDialog }                    from '../../components/ui/ConfirmDialog'
import { FormField }                        from '../../components/ui/FormField'
import { Badge }                            from '../../components/ui/Badge'
import {
  fetchTables,
  createTable,
  updateTable,
  updateTablePosition,
  deleteTable,
} from '../../api/tables'
import type { TableWithStatus, Zone } from '../../types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TableForm {
  label:     string
  zone:      Zone
  positionX: string
  positionY: string
}

interface FormErrors {
  label?:     string
  zone?:      string
  positionX?: string
  positionY?: string
}

// ─── Default pozicije / Default positions ─────────────────────────────────────

/**
 * Računa default pozicije za stolove u datoj zoni.
 * Calculates default positions for tables in a given zone.
 */
function getDefaultPositions(
  tables: TableWithStatus[],
  zone: Zone
): { id: number; positionX: number; positionY: number }[] {
  const zoneTables = tables.filter(t => t.zone === zone)
  const cols = zone === 'INDOOR' ? 3 : 4

  return zoneTables.map((table, i) => ({
    id:        table.id,
    positionX: (i % cols) * 200 + 50,
    positionY: Math.floor(i / cols) * 200 + 50,
  }))
}

// ─── Zone Tab ─────────────────────────────────────────────────────────────────

interface ZoneTabProps {
  zone:    Zone
  active:  boolean
  count:   number
  onClick: () => void
}

function ZoneTab({ zone, active, count, onClick }: ZoneTabProps) {
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
      {label}
      <span className="text-xs bg-white/10 text-white/40 px-1.5 py-0.5 rounded-full">
        {count}
      </span>
    </button>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

/**
 * Admin stranica za raspored stolova.
 * Admin page for table layout.
 */
export function TableLayoutPage() {
  const { t }         = useTranslation()
  const { showToast } = useToast()

  const [tables,       setTables]       = useState<TableWithStatus[]>([])
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [deleting,     setDeleting]     = useState(false)
  const [resetting,    setResetting]    = useState(false)
  const [activeZone,   setActiveZone]   = useState<Zone>('INDOOR')

  // Modal state
  const [modalOpen,    setModalOpen]    = useState(false)
  const [editTarget,   setEditTarget]   = useState<TableWithStatus | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TableWithStatus | null>(null)
  const [resetConfirm, setResetConfirm] = useState(false)

  // Form state
  const [form,   setForm]   = useState<TableForm>({ label: '', zone: 'INDOOR', positionX: '0', positionY: '0' })
  const [errors, setErrors] = useState<FormErrors>({})

  // ─── Load ──────────────────────────────────────────────────────────────────

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

  useEffect(() => { void load() }, [load])

  // ─── Modal helpers ─────────────────────────────────────────────────────────

  function openCreate() {
    setEditTarget(null)
    setForm({ label: '', zone: activeZone, positionX: '0', positionY: '0' })
    setErrors({})
    setModalOpen(true)
  }

  function openEdit(table: TableWithStatus) {
    setEditTarget(table)
    setForm({
      label:     table.label,
      zone:      table.zone,
      positionX: String(table.positionX),
      positionY: String(table.positionY),
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
    if (!form.label.trim()) e.label = t('tableLayout.form.label')
    if (!form.zone)         e.zone  = t('tableLayout.form.zone')
    const x = parseFloat(form.positionX)
    const y = parseFloat(form.positionY)
    if (isNaN(x)) e.positionX = t('tableLayout.form.positionX')
    if (isNaN(y)) e.positionY = t('tableLayout.form.positionY')
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ─── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      const payload = {
        label:     form.label.trim(),
        zone:      form.zone,
        positionX: parseFloat(form.positionX),
        positionY: parseFloat(form.positionY),
      }

      if (editTarget) {
        await updateTable(editTarget.id, payload)
        showToast(t('tableLayout.success_update'), 'success')
      } else {
        await createTable(payload)
        showToast(t('tableLayout.success_create'), 'success')
      }
      setModalOpen(false)
      void load()
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'TABLE_DUPLICATE') {
        showToast(t('tableLayout.error_duplicate'), 'error')
      } else {
        showToast(t('tableLayout.error_save'), 'error')
      }
    } finally {
      setSaving(false)
    }
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteTable(deleteTarget.id)
      showToast(t('tableLayout.success_delete'), 'success')
      setDeleteTarget(null)
      void load()
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'TABLE_HAS_OPEN_BILLS') {
        showToast(t('tableLayout.error_has_open_bills'), 'error')
      } else {
        showToast(t('tableLayout.error_delete'), 'error')
      }
    } finally {
      setDeleting(false)
    }
  }

  // ─── Reset positions ───────────────────────────────────────────────────────

  async function handleResetPositions() {
    setResetting(true)
    try {
      const indoorPositions  = getDefaultPositions(tables, 'INDOOR')
      const outdoorPositions = getDefaultPositions(tables, 'OUTDOOR')
      const allPositions = [...indoorPositions, ...outdoorPositions]

      await Promise.all(
        allPositions.map(p => updateTablePosition(p.id, p.positionX, p.positionY))
      )

      showToast(t('tableLayout.success_reset'), 'success')
      setResetConfirm(false)
      void load()
    } catch {
      showToast(t('tableLayout.error_reset'), 'error')
    } finally {
      setResetting(false)
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const zoneTables   = tables.filter(t => t.zone === activeZone)
  const indoorCount  = tables.filter(t => t.zone === 'INDOOR').length
  const outdoorCount = tables.filter(t => t.zone === 'OUTDOOR').length

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('tableLayout.title')}</h1>
          <p className="text-sm text-white/40 mt-0.5">
            {t('common.status_active')}: {tables.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setResetConfirm(true)}
            className="px-4 py-2 text-sm text-white/60 hover:text-white border border-white/10 hover:border-white/30 rounded-lg transition-colors"
          >
            {t('tableLayout.resetPositions')}
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-black font-medium rounded-lg hover:bg-primary-600 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('tableLayout.addTable')}
          </button>
        </div>
      </div>

      {/* Zone tabovi / Zone tabs */}
      <div className="flex gap-2 mb-4">
        <ZoneTab
          zone="INDOOR"
          active={activeZone === 'INDOOR'}
          count={indoorCount}
          onClick={() => setActiveZone('INDOOR')}
        />
        <ZoneTab
          zone="OUTDOOR"
          active={activeZone === 'OUTDOOR'}
          count={outdoorCount}
          onClick={() => setActiveZone('OUTDOOR')}
        />
      </div>

      {/* Tabela / Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary-500/50 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : zoneTables.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-white/30 text-sm">{t('tables.noTables')}</p>
          <button
            onClick={openCreate}
            className="mt-4 text-sm text-primary-400 hover:text-primary-300 transition-colors"
          >
            {t('tableLayout.addTable')}
          </button>
        </div>
      ) : (
        <div className="bg-white/3 rounded-xl border border-white/10 overflow-hidden">
          {/* Header tabele / Table header */}
          <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 px-4 py-3 border-b border-white/10 text-xs font-medium text-white/40 uppercase tracking-wider">
            <span>{t('tableLayout.table.label')}</span>
            <span>{t('tableLayout.table.zone')}</span>
            <span>{t('tableLayout.table.position')}</span>
            <span>{t('tableLayout.table.status')}</span>
            <span>{t('tableLayout.table.actions')}</span>
          </div>

          {/* Redovi / Rows */}
          {zoneTables.map(table => (
            <div
              key={table.id}
              className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 px-4 py-3 border-b border-white/5 last:border-0 items-center hover:bg-white/3 transition-colors"
            >
              <span className="text-white font-medium text-sm">{table.label}</span>
              <span className="text-white/50 text-sm">
                {table.zone === 'INDOOR' ? t('tables.zones.indoor') : t('tables.zones.outdoor')}
              </span>
              <span className="text-white/40 text-xs font-mono">
                ({Math.round(table.positionX)}, {Math.round(table.positionY)})
              </span>
              <span>
                <Badge variant={table.active ? 'active' : 'inactive'} />
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEdit(table)}
                  className="p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                  title={t('tableLayout.editTable')}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => setDeleteTarget(table)}
                  className="p-1.5 rounded-md text-white/40 hover:text-red-400 hover:bg-white/10 transition-colors"
                  title={t('tableLayout.deleteTable')}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editTarget ? t('tableLayout.editTable') : t('tableLayout.addTable')}
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <FormField label={t('tableLayout.form.label')} error={errors.label} required>
            <input
              type="text"
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              placeholder={t('tableLayout.form.labelPlaceholder')}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-primary-500 text-sm"
            />
          </FormField>

          <FormField label={t('tableLayout.form.zone')} error={errors.zone} required>
            <select
              value={form.zone}
              onChange={e => setForm(f => ({ ...f, zone: e.target.value as Zone }))}
              className="w-full px-3 py-2 bg-[#1e2433] border border-white/20 rounded-lg text-white focus:outline-none focus:border-primary-500 text-sm"
            >
              <option value="INDOOR">{t('tables.zones.indoor')}</option>
              <option value="OUTDOOR">{t('tables.zones.outdoor')}</option>
            </select>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label={t('tableLayout.form.positionX')} error={errors.positionX}>
              <input
                type="number"
                value={form.positionX}
                onChange={e => setForm(f => ({ ...f, positionX: e.target.value }))}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-primary-500 text-sm"
              />
            </FormField>

            <FormField label={t('tableLayout.form.positionY')} error={errors.positionY}>
              <input
                type="number"
                value={form.positionY}
                onChange={e => setForm(f => ({ ...f, positionY: e.target.value }))}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-primary-500 text-sm"
              />
            </FormField>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={closeModal}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={() => void handleSave()}
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
        onConfirm={() => void handleDelete()}
        title={t('tableLayout.deleteTable')}
        message={t('tableLayout.deleteConfirm', { label: deleteTarget?.label ?? '' })}
        variant="danger"
        confirmLabel={t('common.delete')}
        loading={deleting}
      />

      {/* Reset positions confirm */}
      <ConfirmDialog
        open={resetConfirm}
        onClose={() => setResetConfirm(false)}
        onConfirm={() => void handleResetPositions()}
        title={t('tableLayout.resetPositions')}
        message={t('tableLayout.resetConfirm')}
        variant="warning"
        confirmLabel={t('common.confirm')}
        loading={resetting}
      />
    </div>
  )
}
