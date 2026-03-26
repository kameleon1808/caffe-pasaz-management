/**
 * @file src/components/ui/ConfirmDialog.tsx
 * @description Dijalog za potvrdu akcije, izgrađen na Modal komponenti.
 *              Confirmation dialog built on top of the Modal component.
 *
 * @example
 * ```tsx
 * <ConfirmDialog
 *   open={open}
 *   onClose={() => setOpen(false)}
 *   onConfirm={handleDelete}
 *   title="Obriši kategoriju"
 *   message="Da li ste sigurni?"
 *   variant="danger"
 * />
 * ```
 */

import { useTranslation } from 'react-i18next'
import { Modal }          from './Modal'

/** Varijanta dijaloga / Dialog variant */
export type ConfirmVariant = 'danger' | 'warning' | 'default'

export interface ConfirmDialogProps {
  /** Da li je otvoren / Whether open */
  open:         boolean
  /** Callback za zatvaranje / Close callback */
  onClose:      () => void
  /** Callback za potvrdu / Confirm callback */
  onConfirm:    () => void
  /** Naslov / Title */
  title:        string
  /** Poruka / Message */
  message:      string
  /** Varijanta / Variant (default: 'default') */
  variant?:     ConfirmVariant
  /** Tekst dugmeta za potvrdu / Confirm button text */
  confirmLabel?: string
  /** Da li se čeka na potvrdu / Whether waiting */
  loading?:     boolean
}

const confirmButtonClasses: Record<ConfirmVariant, string> = {
  danger:  'bg-red-600 hover:bg-red-700 text-white',
  warning: 'bg-amber-500 hover:bg-amber-600 text-black',
  default: 'bg-primary-500 hover:bg-primary-500/80 text-black',
}

/**
 * Dijalog za potvrdu (brisanje, opasna akcija).
 * Confirmation dialog (delete, dangerous action).
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  variant = 'default',
  confirmLabel,
  loading = false,
}: ConfirmDialogProps) {
  const { t } = useTranslation()

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm" hideClose={loading}>
      <p className="text-white/70 mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          {t('common.cancel')}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${confirmButtonClasses[variant]}`}
        >
          {loading ? t('common.loading') : (confirmLabel ?? t('common.confirm'))}
        </button>
      </div>
    </Modal>
  )
}
