/**
 * @file src/components/ErrorBoundary.tsx
 * @description React Error Boundary koji hvata neočekivane greške u renderovanju.
 *              React Error Boundary that catches unexpected rendering errors.
 *
 * Prikazuje user-friendly poruku umesto belog ekrana.
 * Displays a user-friendly message instead of a white screen.
 *
 * Upotreba / Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 * ```
 */

import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  /** Sadržaj koji se štiti / Content to protect */
  children: ReactNode
  /** Opcionalna fallback komponenta / Optional fallback component */
  fallback?: ReactNode
}

interface State {
  hasError:  boolean
  error:     Error | null
  errorInfo: ErrorInfo | null
}

/**
 * Granica greške — hvata JavaScript greške u podstablu komponente.
 * Error boundary — catches JavaScript errors in the component subtree.
 *
 * Mora biti klasna komponenta (React zahtev za Error Boundaries).
 * Must be a class component (React requirement for Error Boundaries).
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo })

    // Loguj grešku u konzolu (Electron loguje i u fajl via electron-log)
    // Log error to console (Electron also logs to file via electron-log)
    console.error('[ErrorBoundary] Neočekivana greška / Unexpected error:', error)
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack)

    // Pokušaj da loguje u Electron main process ako je dostupno
    // Try to log to Electron main process if available
    try {
      const api = (window as Window & { electronAPI?: { logError?: (p: { message: string; stack?: string; componentStack?: string }) => void } }).electronAPI
      if (api?.logError) {
        void api.logError({
          message:        error.message,
          stack:          error.stack,
          componentStack: errorInfo.componentStack ?? undefined,
        })
      }
    } catch {
      // Ignoriši greške pri logovanju / Ignore logging errors
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="min-h-screen bg-surface flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            {/* Ikonica greške / Error icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-red-900/30 border border-red-500/30 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              </div>
            </div>

            {/* Naslov / Title */}
            <h1 className="text-xl font-semibold text-white mb-2">
              Došlo je do neočekivane greške
            </h1>
            <p className="text-sm text-white/50 mb-1">
              An unexpected error has occurred
            </p>

            {/* Opis / Description */}
            <p className="text-sm text-white/70 mb-6 mt-4">
              Aplikacija je naišla na problem koji nije mogla da reši.
              Osvežite stranicu da biste nastavili sa radom.
            </p>
            <p className="text-xs text-white/40 mb-6">
              The application encountered a problem it could not resolve.
              Refresh the page to continue.
            </p>

            {/* Detalji greške (development mode) / Error details (development mode) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left mb-6 bg-red-950/30 border border-red-900/50 rounded-lg p-3">
                <summary className="text-xs text-red-400 cursor-pointer font-medium mb-2">
                  Detalji greške (development) / Error details (development)
                </summary>
                <pre className="text-xs text-white/60 overflow-auto max-h-40 whitespace-pre-wrap">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            {/* Dugmad / Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2.5 bg-primary-500 hover:bg-primary-500/80 text-black font-medium rounded-lg transition-colors text-sm"
              >
                Osveži stranicu / Refresh Page
              </button>
              <button
                onClick={this.handleReset}
                className="px-6 py-2.5 bg-white/10 hover:bg-white/15 text-white/80 font-medium rounded-lg transition-colors text-sm"
              >
                Pokušaj ponovo / Try Again
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
