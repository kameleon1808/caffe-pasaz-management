/**
 * @file src/pages/admin/SalariesPage.tsx
 * @description Stranica za pregled i isplatu plata konobarima (samo admin).
 *              Page for viewing and paying waiter salaries (admin only).
 *
 * Funkcionalnosti / Features:
 * - Kartice sa ukupno isplaćenim i poslednjom isplatom po konobaru
 * - Tabela istorije isplata sa filterima (konobar, datum od/do)
 * - Modal za isplatu plate
 * - Toast notifikacije za sve akcije
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation }                             from 'react-i18next'

import { useToast }                                   from '../../hooks/useToast'
import { DataTable }                                  from '../../components/ui/DataTable'
import { Modal }                                      from '../../components/ui/Modal'
import { FormField }                                  from '../../components/ui/FormField'
import { getUsers, type User }                        from '../../api/users'
import {
  getSalaries,
  createSalary,
  type SalaryRecord,
} from '../../api/salaries'

// ─── Tip forme / Form type ────────────────────────────────────────────────────

interface PayForm {
  userId:  number | ''
  amount:  string
  note:    string
  paidAt:  string
}

interface PayErrors {
  userId?: string
  amount?: string
}

// ─── Komponenta / Component ───────────────────────────────────────────────────

/**
 * Stranica za isplate plata.
 * Salary payments page.
 *
 * @returns {JSX.Element} Stranica / Page
 */
export function SalariesPage() {
  const { t }         = useTranslation()
  const { showToast } = useToast()

  const [users,     setUsers]     = useState<User[]>([])
  const [salaries,  setSalaries]  = useState<SalaryRecord[]>([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [payOpen,   setPayOpen]   = useState(false)

  // Filteri / Filters
  const [filterUserId,   setFilterUserId]   = useState<number | ''>('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo,   setFilterDateTo]   = useState('')

  // Forma / Form
  const today = new Date().toISOString().slice(0, 10)
  const [payForm,   setPayForm]   = useState<PayForm>({ userId: '', amount: '', note: '', paidAt: today })
  const [payErrors, setPayErrors] = useState<PayErrors>({})

  // ── Učitavanje / Load ────────────────────────────────────────────────────

  const loadUsers = useCallback(async () => {
    try {
      const data = await getUsers()
      setUsers(data)
    } catch {
      // Tihо — greška tabele je dovoljna / Silent — table error is enough
    }
  }, [])

  const loadSalaries = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getSalaries({
        userId:   filterUserId   !== '' ? filterUserId   : undefined,
        dateFrom: filterDateFrom !== '' ? filterDateFrom : undefined,
        dateTo:   filterDateTo   !== '' ? filterDateTo   : undefined,
      })
      setSalaries(data)
    } catch {
      showToast(t('salaries.messages.createError'), 'error')
    } finally {
      setLoading(false)
    }
  }, [filterUserId, filterDateFrom, filterDateTo, t, showToast])

  useEffect(() => { void loadUsers() }, [loadUsers])
  useEffect(() => { void loadSalaries() }, [loadSalaries])

  // ── Kartice po konobaru / Per-waiter summary cards ────────────────────────

  const waiterSummaries = useMemo(() => {
    const map = new Map<number, { user: SalaryRecord['user']; total: number; lastPaidAt: string | null }>()

    for (const s of salaries) {
      const existing = map.get(s.userId)
      if (existing) {
        existing.total += s.amount
        if (!existing.lastPaidAt || s.paidAt > existing.lastPaidAt) {
          existing.lastPaidAt = s.paidAt
        }
      } else {
        map.set(s.userId, { user: s.user, total: s.amount, lastPaidAt: s.paidAt })
      }
    }

    return Array.from(map.values()).sort((a, b) => a.user.fullName.localeCompare(b.user.fullName))
  }, [salaries])

  // ── Validacija / Validation ──────────────────────────────────────────────

  function validatePay(form: PayForm): PayErrors {
    const e: PayErrors = {}
    if (form.userId === '')         e.userId = t('salaries.validation.waiterRequired')
    if (form.amount === '')         e.amount = t('salaries.validation.amountRequired')
    else if (parseFloat(form.amount) <= 0) e.amount = t('salaries.validation.amountPositive')
    return e
  }

  // ── Isplata / Payment ────────────────────────────────────────────────────

  async function handlePay() {
    const errs = validatePay(payForm)
    if (Object.keys(errs).length > 0) { setPayErrors(errs); return }

    setSaving(true)
    try {
      await createSalary({
        userId: payForm.userId as number,
        amount: parseFloat(payForm.amount),
        note:   payForm.note.trim() || undefined,
        paidAt: payForm.paidAt || undefined,
      })
      showToast(t('salaries.messages.created'), 'success')
      setPayOpen(false)
      setPayForm({ userId: '', amount: '', note: '', paidAt: today })
      setPayErrors({})
      await loadSalaries()
    } catch (err) {
      showToast((err as Error).message || t('salaries.messages.createError'), 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Aktivni korisnici za dropdown / Active users for dropdown ─────────────

  const activeUsers = useMemo(() => users.filter(u => u.active), [users])

  // ── Tabela / Table ───────────────────────────────────────────────────────

  const columns = [
    {
      key: 'user',
      header: t('salaries.table.waiter'),
      sortable: false,
      render: (row: SalaryRecord) => (
        <span className="text-white/80">{row.user.fullName}</span>
      ),
    },
    {
      key: 'amount',
      header: t('salaries.table.amount'),
      sortable: true,
      render: (row: SalaryRecord) => (
        <span className="font-semibold text-green-400">
          {row.amount.toLocaleString('sr-RS')} RSD
        </span>
      ),
    },
    {
      key: 'paidAt',
      header: t('salaries.table.date'),
      sortable: true,
      render: (row: SalaryRecord) => new Date(row.paidAt).toLocaleDateString('sr-RS'),
    },
    {
      key: 'note',
      header: t('salaries.table.note'),
      render: (row: SalaryRecord) => (
        <span className="text-white/50 text-xs">{row.note ?? '—'}</span>
      ),
    },
    {
      key: 'paidBy',
      header: t('salaries.table.paidBy'),
      render: (row: SalaryRecord) => (
        <span className="text-white/60 text-xs">{row.paidBy.fullName}</span>
      ),
    },
  ]

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      {/* Naslov + dugme / Title + button */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">{t('salaries.title')}</h1>
        <button
          onClick={() => { setPayOpen(true); setPayErrors({}) }}
          className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-black font-medium rounded-xl text-sm transition-colors"
        >
          + {t('salaries.paySalary')}
        </button>
      </div>

      {/* Kartice po konobaru / Per-waiter summary cards */}
      {waiterSummaries.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {waiterSummaries.map(s => (
            <div
              key={s.user.id}
              className="bg-surface-card rounded-2xl p-4 border border-white/5 space-y-1"
            >
              <p className="text-white font-semibold text-sm">{s.user.fullName}</p>
              <p className="text-xs text-gray-400">{t('salaries.totalPaid')}:
                <span className="text-green-400 font-semibold ml-1">
                  {s.total.toLocaleString('sr-RS')} RSD
                </span>
              </p>
              <p className="text-xs text-gray-500">
                {t('salaries.lastPayment')}:{' '}
                {s.lastPaidAt ? new Date(s.lastPaidAt).toLocaleDateString('sr-RS') : t('salaries.noPayments')}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Filteri / Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-white/50">{t('salaries.filters.waiter')}</label>
          <select
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500 min-w-[160px]"
            value={filterUserId}
            onChange={e => setFilterUserId(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
          >
            <option value="" style={{ backgroundColor: '#1e1e2e', color: '#fff' }}>
              {t('salaries.filters.allWaiters')}
            </option>
            {users.map(u => (
              <option key={u.id} value={u.id} style={{ backgroundColor: '#1e1e2e', color: '#fff' }}>
                {u.fullName}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-white/50">{t('salaries.filters.dateFrom')}</label>
          <input
            type="date"
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
            value={filterDateFrom}
            onChange={e => setFilterDateFrom(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-white/50">{t('salaries.filters.dateTo')}</label>
          <input
            type="date"
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
            value={filterDateTo}
            onChange={e => setFilterDateTo(e.target.value)}
          />
        </div>
        {(filterUserId !== '' || filterDateFrom || filterDateTo) && (
          <button
            onClick={() => { setFilterUserId(''); setFilterDateFrom(''); setFilterDateTo('') }}
            className="px-3 py-2 text-xs rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 transition-colors"
          >
            {t('common.refresh')}
          </button>
        )}
      </div>

      {/* Tabela istorije / History table */}
      <DataTable<SalaryRecord>
        columns={columns}
        rows={salaries}
        loading={loading}
        keyExtractor={(r) => r.id}
      />

      {/* Modal za isplatu / Payment modal */}
      <Modal
        open={payOpen}
        onClose={() => { setPayOpen(false); setPayErrors({}) }}
        title={t('salaries.paySalary')}
        size="md"
      >
        <div className="space-y-4">
          <FormField label={t('salaries.form.waiter')} error={payErrors.userId} required>
            <select
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
              value={payForm.userId}
              onChange={e => setPayForm(f => ({ ...f, userId: e.target.value === '' ? '' : parseInt(e.target.value, 10) }))}
            >
              <option value="" style={{ backgroundColor: '#1e1e2e', color: '#fff' }}>
                {t('salaries.form.selectWaiter')}
              </option>
              {activeUsers.map(u => (
                <option key={u.id} value={u.id} style={{ backgroundColor: '#1e1e2e', color: '#fff' }}>
                  {u.fullName} ({t(`users.roles.${u.role}`)})
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={t('salaries.form.amount')} error={payErrors.amount} required>
            <input
              type="number"
              min="1"
              step="1"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
              value={payForm.amount}
              onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="0"
            />
          </FormField>

          <FormField label={t('salaries.form.paidAt')}>
            <input
              type="date"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
              value={payForm.paidAt}
              onChange={e => setPayForm(f => ({ ...f, paidAt: e.target.value }))}
            />
          </FormField>

          <FormField label={t('salaries.form.note')}>
            <input
              type="text"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
              value={payForm.note}
              onChange={e => setPayForm(f => ({ ...f, note: e.target.value }))}
              placeholder={t('salaries.form.note')}
            />
          </FormField>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => { setPayOpen(false); setPayErrors({}) }}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={() => void handlePay()}
              disabled={saving}
              className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-black font-medium rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {saving ? t('common.loading') : t('salaries.paySalary')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
