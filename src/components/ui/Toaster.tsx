/**
 * @file src/components/ui/Toaster.tsx
 * @description Prikazuje aktivne toast notifikacije iz ToastContext-a.
 *              Renders active toast notifications from ToastContext.
 *
 * Pravila prikaza / Display rules:
 * - Max 3 notifikacije istovremeno / Max 3 notifications at once
 * - Greške imaju "sticky" indikator i ostaju dok ih korisnik ne zatvori
 * - Ostali tipovi imaju traku napretka koja pokazuje preostalo vreme
 * - Errors have a "sticky" indicator and stay until the user closes them
 * - Other types have a progress bar showing remaining time
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

import { useToast }       from '../../hooks/useToast'
import type { ToastType } from '../../context/ToastContext'

/** Boje i ikonice po tipu notifikacije / Colors and icons by notification type */
const TOAST_STYLES: Record<ToastType, {
  bg:     string
  border: string
  icon:   string
  text:   string
  bar:    string
}> = {
  success: { bg: 'bg-green-900/90',  border: 'border-green-500/50',  icon: '✓', text: 'text-green-400',  bar: 'bg-green-500'  },
  error:   { bg: 'bg-red-900/90',    border: 'border-red-500/50',    icon: '✕', text: 'text-red-400',    bar: 'bg-red-500'    },
  warning: { bg: 'bg-amber-900/90',  border: 'border-amber-500/50',  icon: '⚠', text: 'text-amber-400',  bar: 'bg-amber-500'  },
  info:    { bg: 'bg-blue-900/90',   border: 'border-blue-500/50',   icon: 'ℹ', text: 'text-blue-400',   bar: 'bg-blue-500'   },
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
            style={{ animation: 'toast-slide-in 0.25s ease-out' }}
            className={`
              pointer-events-auto flex flex-col overflow-hidden
              rounded-lg border backdrop-blur-sm shadow-lg
              min-w-[280px] max-w-sm
              ${style.bg} ${style.border}
            `}
          >
            {/* Sadržaj / Content */}
            <div className="flex items-start gap-3 px-4 py-3">
              <span className={`text-lg leading-none mt-0.5 flex-shrink-0 ${style.text}`}>
                {style.icon}
              </span>
              <p className="flex-1 text-sm text-white/90 break-words">{toast.message}</p>
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Indikator za "sticky" greške / Indicator for sticky errors */}
                {!toast.autoDismiss && (
                  <span
                    title="Kliknite X da zatvorite / Click X to close"
                    className={`text-xs font-medium px-1.5 py-0.5 rounded ${style.text} bg-white/10`}
                  >
                    ●
                  </span>
                )}
                <button
                  onClick={() => hideToast(toast.id)}
                  className="text-white/40 hover:text-white/80 transition-colors"
                  aria-label="Zatvori / Close"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Traka napretka (samo za auto-dismiss) / Progress bar (auto-dismiss only) */}
            {toast.autoDismiss && (
              <div className="h-0.5 w-full bg-white/10">
                <div
                  className={`h-full ${style.bar} opacity-60`}
                  style={{ animation: 'toast-progress 5s linear forwards' }}
                />
              </div>
            )}
          </div>
        )
      })}

      {/* CSS animacije / CSS animations */}
      <style>{`
        @keyframes toast-slide-in {
          from { opacity: 0; transform: translateX(100%); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes toast-progress {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  )
}
