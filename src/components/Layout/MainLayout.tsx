/**
 * @file src/components/Layout/MainLayout.tsx
 * @description Glavni layout aplikacije sa sidebarom i headerom.
 *              Main application layout with sidebar and header.
 *
 * Struktura / Structure:
 * ┌─────────┬───────────────────────────────────┐
 * │         │ Header                            │
 * │ Sidebar ├───────────────────────────────────┤
 * │         │ Content (children)                │
 * │         │                                   │
 * └─────────┴───────────────────────────────────┘
 */

import { ReactNode } from 'react'
import { Sidebar }   from './Sidebar'
import { Header }    from './Header'

/**
 * Props za MainLayout komponentu.
 * Props for the MainLayout component.
 */
interface MainLayoutProps {
  /** Sadržaj stranice / Page content */
  children: ReactNode
}

/**
 * Glavni layout sa sidebarom i headerom.
 * Main layout with sidebar and header.
 *
 * @param {MainLayoutProps} props - Props sa children sadržajem / Props with children content
 * @returns {JSX.Element} Layout komponenta / Layout component
 */
export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      {/* Sidebar — fiksiran sa leve strane / Fixed on the left */}
      <Sidebar />

      {/* Desna strana — header + sadržaj / Right side — header + content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header na vrhu / Header at the top */}
        <Header />

        {/* Scrollable sadržaj stranice / Scrollable page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
