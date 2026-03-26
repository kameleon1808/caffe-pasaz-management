/**
 * @file src/components/ui/Modal.tsx
 * @description Generički modalni dijalog.
 *              Generic modal dialog.
 *
 * @example
 * ```tsx
 * <Modal open={open} onClose={() => setOpen(false)} title="Naslov">
 *   <p>Sadržaj modala</p>
 * </Modal>
 * ```
 */

import { useEffect, useRef, ReactNode } from 'react'

/** Veličina modala / Modal size */
export type ModalSize = 'sm' | 'md' | 'lg'

export interface ModalProps {
  /** Da li je modal otvoren / Whether modal is open */
  open:       boolean
  /** Callback za zatvaranje / Close callback */
  onClose:    () => void
  /** Naslov modala / Modal title */
  title?:     string
  /** Sadržaj / Content */
  children:   ReactNode
  /** Veličina / Size (default: 'md') */
  size?:      ModalSize
  /** Sakrij dugme X / Hide X button */
  hideClose?: boolean
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
}

/**
 * Modalni dijalog sa pozadinskim overlay-em.
 * Modal dialog with background overlay.
 */
export function Modal({ open, onClose, title, children, size = 'md', hideClose = false }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // Zatvori na Escape / Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Spreči scroll pozadine / Prevent background scroll
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div
        className={`relative w-full ${sizeClasses[size]} bg-surface border border-white/10 rounded-xl shadow-2xl`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {/* Header */}
        {(title || !hideClose) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            {title && (
              <h2 id="modal-title" className="text-lg font-semibold text-white">
                {title}
              </h2>
            )}
            {!hideClose && (
              <button
                onClick={onClose}
                className="ml-auto p-1 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Zatvori / Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="px-6 py-4">
          {children}
        </div>
      </div>
    </div>
  )
}
