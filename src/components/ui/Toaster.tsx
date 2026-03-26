/**
 * @file src/components/ui/Toaster.tsx
 * @description Prikazuje aktivne toast notifikacije iz ToastContext-a.
 *              Renders active toast notifications from ToastContext.
 *
 * Postaviti jednom u korenu aplikacije (unutar ToastProvider-a):
 * Place once at the root of the app (inside ToastProvider):
 * ```tsx
 * <ToastProvider>
 *   <Toaster />
 *   {children}
 * </ToastProvider>
 * ```
 */

import { useToast }              from '../../hooks/useToast'
import type { ToastType }        from '../../context/ToastContext'

/** Boje i ikonice po tipu notifikacije / Colors and icons by notification type */
const TOAST_STYLES: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: 'bg-green-900/90',  border: 'border-green-500/50', icon: '✓' },
  error:   { bg: 'bg-red-900/90',    border: 'border-red-500/50',   icon: '✕' },
  warning: { bg: 'bg-amber-900/90',  border: 'border-amber-500/50', icon: '⚠' },
  info:    { bg: 'bg-blue-900/90',   border: 'border-blue-500/50',  icon: 'ℹ' },
}

const TEXT_COLOR: Record<ToastType, string> = {
  success: 'text-green-400',
  error:   'text-red-400',
  warning: 'text-amber-400',
  info:    'text-blue-400',
}

/**
 * Kontejner za toast notifikacije (donji desni ugao).
 * Toast notification container (bottom-right corner).
 */
export function Toaster() {
  const { toasts, hideToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map(toast => {
        const style = TOAST_STYLES[toast.type]
        return (
          <div
            key={toast.id}
            role="alert"
            className={`
              pointer-events-auto flex items-start gap-3
              px-4 py-3 rounded-lg border backdrop-blur-sm
              shadow-lg min-w-[280px] max-w-sm
              ${style.bg} ${style.border}
            `}
          >
            <span className={`text-lg leading-none mt-0.5 ${TEXT_COLOR[toast.type]}`}>
              {style.icon}
            </span>
            <p className="flex-1 text-sm text-white/90 break-words">{toast.message}</p>
            <button
              onClick={() => hideToast(toast.id)}
              className="text-white/40 hover:text-white/80 transition-colors flex-shrink-0"
              aria-label="Zatvori / Close"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )
      })}
    </div>
  )
}
