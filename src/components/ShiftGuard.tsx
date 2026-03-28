/**
 * @file src/components/ShiftGuard.tsx
 * @description Komponenta koja blokira pristup sadržaju ako korisnik nema aktivnu smenu.
 *              Component that blocks access to content if the user has no active shift.
 *
 * Prikazuje full-screen poruku sa dugmetom za početak smene.
 * Displays a full-screen message with a button to start the shift.
 */

import { ReactNode }    from 'react'
import { useTranslation } from 'react-i18next'
import { useShift }       from '../hooks/useShift'

/**
 * Props za ShiftGuard komponentu.
 * Props for the ShiftGuard component.
 */
interface ShiftGuardProps {
  /** Sadržaj koji se prikazuje ako je smena aktivna / Content shown if shift is active */
  children: ReactNode
}

/**
 * Omotač koji proverava da li korisnik ima aktivnu smenu.
 * Wrapper that checks whether the user has an active shift.
 *
 * Ako nema, prikazuje ekran za početak smene.
 * If not, shows the shift start screen.
 *
 * @param {ShiftGuardProps} props - Props komponente / Component props
 */
export function ShiftGuard({ children }: ShiftGuardProps) {
  const { t }                                      = useTranslation()
  const { activeShift, isLoading, isProcessing, startShift } = useShift()

  // Dok se smena učitava, prikaži loader
  // While shift is loading, show loader
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary-500/50 border-t-primary-500 rounded-full animate-spin" />
      </div>
    )
  }

  // Ako ima aktivnu smenu, prikaži sadržaj / If active shift, show content
  if (activeShift) {
    return <>{children}</>
  }

  // Nema aktivne smene — prikaži ekran za početak
  // No active shift — show start screen
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md px-6">
        {/* Ikona / Icon */}
        <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-10 h-10 text-amber-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Naslov / Title */}
        <h2 className="text-xl font-bold text-white mb-2">
          {t('shifts.guard.title')}
        </h2>

        {/* Poruka / Message */}
        <p className="text-gray-400 text-sm mb-8">
          {t('shifts.guard.message')}
        </p>

        {/* Dugme za početak smene / Start shift button */}
        <button
          onClick={() => void startShift()}
          disabled={isProcessing}
          className="
            inline-flex items-center gap-2
            px-6 py-3 bg-primary-500 hover:bg-primary-600
            text-black font-semibold rounded-xl
            transition-colors duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              {t('common.loading')}
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
              </svg>
              {t('shifts.guard.startButton')}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
