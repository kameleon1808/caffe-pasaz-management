/**
 * @file src/pages/admin/UsersPage.tsx
 * @description CRUD stranica za upravljanje korisnicima sistema (samo admin).
 *              CRUD page for managing system users (admin only).
 *
 * Funkcionalnosti / Features:
 * - Prikaz liste korisnika u tabeli
 * - Kreiranje novog korisnika
 * - Izmena podataka korisnika (ime, username, lozinka)
 * - Deaktivacija i reaktivacija korisnika
 * - Toast notifikacije za sve akcije
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation }                   from 'react-i18next'

import { useToast }                         from '../../hooks/useToast'
import { useAuth }                          from '../../hooks/useAuth'
import { DataTable }                        from '../../components/ui/DataTable'
import { Modal }                            from '../../components/ui/Modal'
import { ConfirmDialog }                    from '../../components/ui/ConfirmDialog'
import { FormField }                        from '../../components/ui/FormField'
import {
  getUsers,
  createUser,
  updateUser,
  deactivateUser,
  reactivateUser,
  type User,
} from '../../api/users'

// ─── Typy formi / Form types ──────────────────────────────────────────────────

interface CreateForm {
  fullName: string
  username: string
  password: string
  role:     string
}

interface EditForm {
  fullName: string
  username: string
  password: string
}

interface FormErrors {
  fullName?: string
  username?: string
  password?: string
  role?:     string
}

// ─── Komponenta / Component ───────────────────────────────────────────────────

/**
 * Stranica za upravljanje korisnicima.
 * User management page.
 *
 * @returns {JSX.Element} Stranica / Page
 */
export function UsersPage() {
  const { t }        = useTranslation()
  const { showToast } = useToast()
  const { user: me } = useAuth()

  const [users,       setUsers]       = useState<User[]>([])
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)

  // Modali / Modals
  const [createOpen,  setCreateOpen]  = useState(false)
  const [editTarget,  setEditTarget]  = useState<User | null>(null)
  const [deactTarget, setDeactTarget] = useState<User | null>(null)

  // Forme / Forms
  const [createForm,  setCreateForm]  = useState<CreateForm>({ fullName: '', username: '', password: '', role: 'WAITER' })
  const [editForm,    setEditForm]    = useState<EditForm>({ fullName: '', username: '', password: '' })
  const [errors,      setErrors]      = useState<FormErrors>({})

  // ── Učitavanje / Load ────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getUsers()
      setUsers(data)
    } catch {
      showToast(t('users.messages.createError'), 'error')
    } finally {
      setLoading(false)
    }
  }, [t, showToast])

  useEffect(() => { void load() }, [load])

  // ── Validacija / Validation ──────────────────────────────────────────────

  function validateCreate(form: CreateForm): FormErrors {
    const e: FormErrors = {}
    if (!form.fullName.trim()) e.fullName = t('users.validation.fullNameRequired')
    if (!form.username.trim()) e.username = t('users.validation.usernameRequired')
    if (!form.password.trim()) e.password = t('users.validation.passwordRequired')
    else if (form.password.trim().length < 6) e.password = t('users.validation.passwordMin')
    if (!form.role)            e.role     = t('users.validation.roleRequired')
    return e
  }

  function validateEdit(form: EditForm): FormErrors {
    const e: FormErrors = {}
    if (!form.fullName.trim()) e.fullName = t('users.validation.fullNameRequired')
    if (!form.username.trim()) e.username = t('users.validation.usernameRequired')
    if (form.password.trim() !== '' && form.password.trim().length < 6) {
      e.password = t('users.validation.passwordMin')
    }
    return e
  }

  // ── Handlers / Handlers ──────────────────────────────────────────────────

  async function handleCreate() {
    const errs = validateCreate(createForm)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setSaving(true)
    try {
      await createUser({
        fullName: createForm.fullName.trim(),
        username: createForm.username.trim(),
        password: createForm.password.trim(),
        role:     createForm.role,
      })
      showToast(t('users.messages.created'), 'success')
      setCreateOpen(false)
      setCreateForm({ fullName: '', username: '', password: '', role: 'WAITER' })
      setErrors({})
      await load()
    } catch (err) {
      showToast((err as Error).message || t('users.messages.createError'), 'error')
    } finally {
      setSaving(false)
    }
  }

  function openEdit(user: User) {
    setEditTarget(user)
    setEditForm({ fullName: user.fullName, username: user.username, password: '' })
    setErrors({})
  }

  async function handleEdit() {
    if (!editTarget) return
    const errs = validateEdit(editForm)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setSaving(true)
    try {
      const payload: { fullName?: string; username?: string; password?: string } = {
        fullName: editForm.fullName.trim(),
        username: editForm.username.trim(),
      }
      if (editForm.password.trim()) payload.password = editForm.password.trim()

      await updateUser(editTarget.id, payload)
      showToast(t('users.messages.updated'), 'success')
      setEditTarget(null)
      setErrors({})
      await load()
    } catch (err) {
      showToast((err as Error).message || t('users.messages.updateError'), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate() {
    if (!deactTarget) return
    setSaving(true)
    try {
      await deactivateUser(deactTarget.id)
      showToast(t('users.messages.deactivated'), 'success')
      setDeactTarget(null)
      await load()
    } catch (err) {
      showToast((err as Error).message || t('users.messages.deactivateError'), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleReactivate(user: User) {
    try {
      await reactivateUser(user.id)
      showToast(t('users.messages.reactivated'), 'success')
      await load()
    } catch (err) {
      showToast((err as Error).message || t('users.messages.reactivateError'), 'error')
    }
  }

  // ── Tabela / Table ───────────────────────────────────────────────────────

  const columns = [
    {
      key: 'fullName',
      header: t('users.table.fullName'),
      sortable: true,
    },
    {
      key: 'username',
      header: t('users.table.username'),
      sortable: true,
    },
    {
      key: 'role',
      header: t('users.table.role'),
      render: (row: User) => (
        <span className={`
          inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
          ${row.role === 'ADMIN'
            ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
          }
        `}>
          {t(`users.roles.${row.role}`)}
        </span>
      ),
    },
    {
      key: 'active',
      header: t('users.table.status'),
      render: (row: User) => (
        <span className={`
          inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
          ${row.active
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
          }
        `}>
          {row.active ? t('users.status.active') : t('users.status.inactive')}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: t('users.table.createdAt'),
      sortable: true,
      render: (row: User) => new Date(row.createdAt).toLocaleDateString('sr-RS'),
    },
    {
      key: 'actions',
      header: t('users.table.actions'),
      render: (row: User) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEdit(row)}
            className="px-3 py-1 text-xs rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors border border-white/10"
          >
            {t('users.actions.edit')}
          </button>
          {row.active ? (
            // Ne prikazuj deaktivaciju za trenutnog korisnika / Don't show deactivate for current user
            me?.id !== row.id && (
              <button
                onClick={() => setDeactTarget(row)}
                className="px-3 py-1 text-xs rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors border border-red-500/20"
              >
                {t('users.actions.deactivate')}
              </button>
            )
          ) : (
            <button
              onClick={() => void handleReactivate(row)}
              className="px-3 py-1 text-xs rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 hover:text-green-300 transition-colors border border-green-500/20"
            >
              {t('users.actions.reactivate')}
            </button>
          )}
        </div>
      ),
    },
  ]

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      {/* Naslov + dugme / Title + button */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">{t('users.title')}</h1>
        <button
          onClick={() => { setCreateOpen(true); setErrors({}) }}
          className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-black font-medium rounded-xl text-sm transition-colors"
        >
          + {t('users.newUser')}
        </button>
      </div>

      {/* Tabela / Table */}
      <DataTable<User>
        columns={columns}
        rows={users}
        loading={loading}
        keyExtractor={(r) => r.id}
      />

      {/* Modal — kreiranje / Modal — create */}
      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); setErrors({}) }}
        title={t('users.newUser')}
        size="md"
      >
        <div className="space-y-4">
          <FormField label={t('users.form.fullName')} error={errors.fullName} required>
            <input
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
              value={createForm.fullName}
              onChange={e => setCreateForm(f => ({ ...f, fullName: e.target.value }))}
              placeholder={t('users.form.fullName')}
            />
          </FormField>
          <FormField label={t('users.form.username')} error={errors.username} required>
            <input
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
              value={createForm.username}
              onChange={e => setCreateForm(f => ({ ...f, username: e.target.value }))}
              placeholder={t('users.form.username')}
              autoComplete="off"
            />
          </FormField>
          <FormField label={t('users.form.password')} error={errors.password} required>
            <input
              type="password"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
              value={createForm.password}
              onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
              placeholder="••••••"
              autoComplete="new-password"
            />
          </FormField>
          <FormField label={t('users.form.role')} error={errors.role} required>
            <select
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
              value={createForm.role}
              onChange={e => setCreateForm(f => ({ ...f, role: e.target.value }))}
            >
              <option value="WAITER" style={{ backgroundColor: '#1e1e2e', color: '#fff' }}>
                {t('users.roles.WAITER')}
              </option>
              <option value="ADMIN" style={{ backgroundColor: '#1e1e2e', color: '#fff' }}>
                {t('users.roles.ADMIN')}
              </option>
            </select>
          </FormField>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => { setCreateOpen(false); setErrors({}) }}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={() => void handleCreate()}
              disabled={saving}
              className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-black font-medium rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {saving ? t('common.loading') : t('users.actions.create')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal — izmena / Modal — edit */}
      <Modal
        open={editTarget !== null}
        onClose={() => { setEditTarget(null); setErrors({}) }}
        title={t('users.actions.edit')}
        size="md"
      >
        <div className="space-y-4">
          <FormField label={t('users.form.fullName')} error={errors.fullName} required>
            <input
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
              value={editForm.fullName}
              onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))}
            />
          </FormField>
          <FormField label={t('users.form.username')} error={errors.username} required>
            <input
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
              value={editForm.username}
              onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))}
              autoComplete="off"
            />
          </FormField>
          <FormField
            label={t('users.form.newPassword')}
            error={errors.password}
            hint={t('users.form.leaveBlank')}
          >
            <input
              type="password"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
              value={editForm.password}
              onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))}
              placeholder="••••••"
              autoComplete="new-password"
            />
          </FormField>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => { setEditTarget(null); setErrors({}) }}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={() => void handleEdit()}
              disabled={saving}
              className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-black font-medium rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {saving ? t('common.loading') : t('users.actions.save')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Dijalog za potvrdu deaktivacije / Deactivation confirm dialog */}
      <ConfirmDialog
        open={deactTarget !== null}
        onClose={() => setDeactTarget(null)}
        onConfirm={() => void handleDeactivate()}
        title={t('users.confirm.deactivateTitle')}
        message={t('users.confirm.deactivate')}
        variant="danger"
        confirmLabel={t('users.actions.deactivate')}
        loading={saving}
      />
    </div>
  )
}
