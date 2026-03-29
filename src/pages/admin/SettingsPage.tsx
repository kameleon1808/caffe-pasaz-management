/**
 * @file src/pages/admin/SettingsPage.tsx
 * @description Stranica za upravljanje podešavanjima kafića i backup-om baze (admin only).
 *              Page for managing cafe settings and database backup (admin only).
 *
 * Sekcije / Sections:
 * 1. Podešavanja kafića (naziv, adresa, PIB, telefon, prag zaliha, valuta)
 * 2. Backup baze podataka (kreiranje, lista, restore, promena foldera)
 */

import { useState, useEffect, useCallback }  from 'react'
import { useTranslation }                    from 'react-i18next'
import { useNavigate }                       from 'react-router-dom'

import { useToast }                          from '../../hooks/useToast'
import { getSettings, updateSettings }       from '../../api/settings'
import type { CafeSettings }                 from '../../api/settings'
import {
  createBackup,
  listBackups,
  restoreBackup,
  getBackupFolder,
  setBackupFolder,
  pickBackupFolder,
  isBackupAvailable,
} from '../../api/backup'
import type { BackupInfo }                   from '../../api/backup'
import { ConfirmDialog }                     from '../../components/ui/ConfirmDialog'

// ─── Pomoćna funkcija za formatiranje veličine fajla ──────────────────────────

/**
 * Formatira veličinu fajla u čitljiv format.
 * Formats file size into a human-readable format.
 */
function formatSize(bytes: number): string {
  if (bytes < 1024)         return `${bytes} B`
  if (bytes < 1024 * 1024)  return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/**
 * Stranica za podešavanja kafića i backup baze.
 * Cafe settings and database backup page.
 *
 * @returns {JSX.Element} Stranica podešavanja / Settings page
 */
export function SettingsPage() {
  const { t }         = useTranslation()
  const { showToast } = useToast()
  const navigate      = useNavigate()

  // ── Stanje podešavanja / Settings state ─────────────────────────────────────
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [settings, setSettings] = useState<CafeSettings>({
    cafe_name:           '',
    cafe_address:        '',
    cafe_pib:            '',
    cafe_phone:          '',
    min_stock_threshold: '5',
    currency:            'RSD',
  })

  // ── Stanje backup-a / Backup state ──────────────────────────────────────────
  const hasElectron        = isBackupAvailable()
  const [backupFolder,     setBackupFolderState]   = useState<string>('')
  const [backups,          setBackups]              = useState<BackupInfo[]>([])
  const [backupsLoading,   setBackupsLoading]       = useState(false)
  const [creatingBackup,   setCreatingBackup]       = useState(false)
  const [restoreTarget,    setRestoreTarget]        = useState<BackupInfo | null>(null)
  const [restoringBackup,  setRestoringBackup]      = useState(false)

  // ── Učitavanje podešavanja / Load settings ──────────────────────────────────
  useEffect(() => {
    void (async () => {
      try {
        const data = await getSettings()
        setSettings({
          cafe_name:           data.cafe_name           ?? '',
          cafe_address:        data.cafe_address        ?? '',
          cafe_pib:            data.cafe_pib            ?? '',
          cafe_phone:          data.cafe_phone          ?? '',
          min_stock_threshold: data.min_stock_threshold ?? '5',
          currency:            data.currency            ?? 'RSD',
        })
      } catch (err) {
        showToast((err as Error).message || t('common.unknown_error'), 'error')
      } finally {
        setLoading(false)
      }
    })()
  }, [t, showToast])

  // ── Učitavanje backup info / Load backup info ────────────────────────────────
  const loadBackupData = useCallback(async () => {
    if (!hasElectron) return
    setBackupsLoading(true)
    try {
      const [folder, list] = await Promise.all([getBackupFolder(), listBackups()])
      setBackupFolderState(folder)
      setBackups(list.slice(0, 10))
    } catch (err) {
      showToast((err as Error).message || t('backup.error_list'), 'error')
    } finally {
      setBackupsLoading(false)
    }
  }, [hasElectron, showToast, t])

  useEffect(() => {
    void loadBackupData()
  }, [loadBackupData])

  // ── Čuvanje podešavanja / Save settings ─────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateSettings(settings)
      showToast(t('settings.saved'), 'success')
    } catch (err) {
      showToast((err as Error).message || t('settings.saveError'), 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Kreiranje backup-a / Create backup ──────────────────────────────────────
  const handleCreateBackup = async () => {
    setCreatingBackup(true)
    try {
      const info = await createBackup()
      showToast(`${t('backup.success_create')}: ${info.filename}`, 'success')
      void loadBackupData()
    } catch (err) {
      showToast((err as Error).message || t('backup.error_create'), 'error')
    } finally {
      setCreatingBackup(false)
    }
  }

  // ── Promena foldera / Change folder ─────────────────────────────────────────
  const handleChangeFolder = async () => {
    try {
      const chosen = await pickBackupFolder()
      if (!chosen) return
      await setBackupFolder(chosen)
      setBackupFolderState(chosen)
      showToast(t('backup.success_folder'), 'success')
      void loadBackupData()
    } catch (err) {
      showToast((err as Error).message || t('backup.error_folder'), 'error')
    }
  }

  // ── Restore / Restore ────────────────────────────────────────────────────────
  const handleRestoreConfirm = async () => {
    if (!restoreTarget) return
    setRestoringBackup(true)
    try {
      await restoreBackup(restoreTarget.path)
      showToast(t('backup.success_restore'), 'info')
      // Aplikacija se restartuje u main procesu / App restarts in main process
    } catch (err) {
      showToast((err as Error).message || t('backup.error_restore'), 'error')
      setRestoringBackup(false)
    }
    setRestoreTarget(null)
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-400 text-sm">{t('common.loading')}</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Zaglavlje / Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-gray-400 hover:text-white transition-colors text-sm"
        >
          ← {t('common.back')}
        </button>
        <h1 className="text-2xl font-bold text-white">{t('settings.title')}</h1>
      </div>

      {/* ── Sekcija 1: Podešavanja kafića / Cafe settings ── */}
      <form onSubmit={e => void handleSubmit(e)} className="space-y-5">
        <div className="bg-surface-card rounded-2xl border border-white/5 p-6 space-y-5">

          {/* Naziv kafića / Cafe name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-gray-300 text-sm font-medium">{t('settings.cafeName')}</label>
            <input
              type="text"
              value={settings.cafe_name ?? ''}
              onChange={e => setSettings(s => ({ ...s, cafe_name: e.target.value }))}
              placeholder="Kafić Pasaz"
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm
                         focus:outline-none focus:border-primary-500 placeholder:text-gray-600"
            />
          </div>

          {/* Adresa / Address */}
          <div className="flex flex-col gap-1.5">
            <label className="text-gray-300 text-sm font-medium">{t('settings.cafeAddress')}</label>
            <input
              type="text"
              value={settings.cafe_address ?? ''}
              onChange={e => setSettings(s => ({ ...s, cafe_address: e.target.value }))}
              placeholder="Ulica i broj, Grad"
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm
                         focus:outline-none focus:border-primary-500 placeholder:text-gray-600"
            />
          </div>

          {/* PIB */}
          <div className="flex flex-col gap-1.5">
            <label className="text-gray-300 text-sm font-medium">{t('settings.cafePib')}</label>
            <input
              type="text"
              value={settings.cafe_pib ?? ''}
              onChange={e => setSettings(s => ({ ...s, cafe_pib: e.target.value }))}
              placeholder="npr. 123456789"
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm
                         focus:outline-none focus:border-primary-500 placeholder:text-gray-600"
            />
          </div>

          {/* Telefon / Phone */}
          <div className="flex flex-col gap-1.5">
            <label className="text-gray-300 text-sm font-medium">{t('settings.cafePhone')}</label>
            <input
              type="text"
              value={settings.cafe_phone ?? ''}
              onChange={e => setSettings(s => ({ ...s, cafe_phone: e.target.value }))}
              placeholder="+381 11 000 0000"
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm
                         focus:outline-none focus:border-primary-500 placeholder:text-gray-600"
            />
          </div>

          {/* Prag zaliha / Stock threshold */}
          <div className="flex flex-col gap-1.5">
            <label className="text-gray-300 text-sm font-medium">{t('settings.minStockThreshold')}</label>
            <input
              type="number"
              min={0}
              value={settings.min_stock_threshold ?? '5'}
              onChange={e => setSettings(s => ({ ...s, min_stock_threshold: e.target.value }))}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm
                         focus:outline-none focus:border-primary-500 w-40"
            />
          </div>

          {/* Valuta / Currency */}
          <div className="flex flex-col gap-1.5">
            <label className="text-gray-300 text-sm font-medium">{t('settings.currency')}</label>
            <input
              type="text"
              value={settings.currency ?? 'RSD'}
              onChange={e => setSettings(s => ({ ...s, currency: e.target.value }))}
              placeholder="RSD"
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm
                         focus:outline-none focus:border-primary-500 w-40"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-black font-medium
                       rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? t('common.loading') : t('settings.save')}
          </button>
        </div>
      </form>

      {/* ── Sekcija 2: Backup (Electron only) / Backup section ── */}
      {hasElectron && (
        <div className="bg-surface-card rounded-2xl border border-white/5 p-6 space-y-5">
          {/* Naslov sekcije / Section title */}
          <div>
            <h2 className="text-lg font-semibold text-white">{t('backup.title')}</h2>
            <p className="text-xs text-white/40 mt-1">{t('backup.auto_backup_note')}</p>
          </div>

          {/* Backup folder / Backup folder */}
          <div className="flex flex-col gap-2">
            <label className="text-gray-300 text-sm font-medium">{t('backup.folder_label')}</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={backupFolder}
                readOnly
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/70 text-sm
                           focus:outline-none cursor-default"
              />
              <button
                type="button"
                onClick={() => void handleChangeFolder()}
                className="px-3 py-2 bg-white/10 hover:bg-white/15 text-white/80 text-sm rounded-lg transition-colors whitespace-nowrap"
              >
                {t('backup.change_folder')}
              </button>
            </div>
            <p className="text-xs text-white/30">{t('backup.folder_hint')}</p>
          </div>

          {/* Dugme za kreiranje backup-a / Create backup button */}
          <div>
            <button
              type="button"
              onClick={() => void handleCreateBackup()}
              disabled={creatingBackup}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 hover:bg-primary-500/80 text-black
                         font-medium rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creatingBackup ? (
                <>
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  {t('backup.creating')}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  {t('backup.create')}
                </>
              )}
            </button>
          </div>

          {/* Lista backup-ova / Backup list */}
          <div>
            <h3 className="text-sm font-medium text-white/70 mb-3">{t('backup.list_title')}</h3>

            {backupsLoading ? (
              <p className="text-sm text-white/40">{t('backup.list_loading')}</p>
            ) : backups.length === 0 ? (
              <p className="text-sm text-white/40">{t('backup.list_empty')}</p>
            ) : (
              <div className="space-y-2">
                {backups.map(backup => (
                  <div
                    key={backup.path}
                    className="flex items-center justify-between gap-3 px-4 py-3
                               bg-white/5 border border-white/5 rounded-lg"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-white/80 truncate font-mono">{backup.filename}</p>
                      <p className="text-xs text-white/40 mt-0.5">
                        {new Date(backup.createdAt).toLocaleString('sr-RS')}
                        {' · '}
                        {formatSize(backup.sizeBytes)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRestoreTarget(backup)}
                      className="flex-shrink-0 px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30
                                 text-amber-400 text-xs font-medium rounded-lg transition-colors"
                    >
                      {t('backup.restore')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dijalog potvrde restore-a / Restore confirmation dialog */}
      <ConfirmDialog
        open={restoreTarget !== null}
        onClose={() => setRestoreTarget(null)}
        onConfirm={() => void handleRestoreConfirm()}
        title={t('backup.restore_confirm_title')}
        message={`${t('backup.restore_confirm_message')}\n\n${restoreTarget?.filename ?? ''}`}
        confirmLabel={restoringBackup ? t('backup.restoring') : t('backup.restore_confirm_btn')}
        variant="danger"
        loading={restoringBackup}
      />
    </div>
  )
}
