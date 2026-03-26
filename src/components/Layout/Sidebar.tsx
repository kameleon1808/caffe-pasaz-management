/**
 * @file src/components/Layout/Sidebar.tsx
 * @description Sidebar navigacija aplikacije sa role-based prikazom stavki.
 *              Application sidebar navigation with role-based item display.
 *
 * Admin vidi sve stavke, konobar vidi ograničen skup.
 * Admin sees all items, waiter sees a limited set.
 */

import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import type { NavItem } from '../../types'

/**
 * Definicija svih navigacionih stavki.
 * Definition of all navigation items.
 */
const NAV_ITEMS: NavItem[] = [
  {
    labelKey: 'nav.dashboard',
    path:     '/dashboard',
    icon:     'grid',
    roles:    ['ADMIN', 'WAITER']
  },
  {
    labelKey: 'nav.tables',
    path:     '/tables',
    icon:     'layout',
    roles:    ['ADMIN', 'WAITER']
  },
  {
    labelKey: 'nav.bills',
    path:     '/bills',
    icon:     'file-text',
    roles:    ['ADMIN', 'WAITER']
  },
  {
    labelKey: 'nav.products',
    path:     '/products',
    icon:     'package',
    roles:    ['ADMIN', 'WAITER']
  },
  {
    labelKey: 'nav.inventory',
    path:     '/inventory',
    icon:     'archive',
    roles:    ['ADMIN', 'WAITER'],
    divider:  true
  },
  {
    labelKey: 'nav.shifts',
    path:     '/shifts',
    icon:     'clock',
    roles:    ['ADMIN', 'WAITER']
  },
  {
    labelKey: 'nav.categories',
    path:     '/categories',
    icon:     'tag',
    roles:    ['ADMIN'],
    divider:  true
  },
  {
    labelKey: 'nav.users',
    path:     '/users',
    icon:     'users',
    roles:    ['ADMIN']
  },
  {
    labelKey: 'nav.reports',
    path:     '/reports',
    icon:     'bar-chart',
    roles:    ['ADMIN']
  },
  {
    labelKey: 'nav.settings',
    path:     '/settings',
    icon:     'settings',
    roles:    ['ADMIN']
  }
]

/**
 * Vraća SVG ikonu prema imenu.
 * Returns SVG icon by name.
 * Koristi inline SVG da izbegne zavisnost od icon biblioteke.
 * Uses inline SVG to avoid icon library dependency.
 */
function Icon({ name }: { name: string }) {
  const cls = 'w-5 h-5 flex-shrink-0'
  const icons: Record<string, JSX.Element> = {
    grid:      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
    layout:    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>,
    'file-text': <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    package:   <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
    archive:   <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>,
    clock:     <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    tag:       <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>,
    users:     <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
    'bar-chart': <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
    settings:  <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  }
  return icons[name] ?? <span className={cls} />
}

/**
 * Sidebar navigaciona komponenta.
 * Sidebar navigation component.
 *
 * @returns {JSX.Element} Sidebar sa navigacionim stavkama / Sidebar with navigation items
 */
export function Sidebar() {
  const { t }    = useTranslation()
  const { user } = useAuth()

  if (!user) return null

  // Filtriraj stavke prema roli korisnika / Filter items by user role
  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(user.role))

  return (
    <aside className="
      w-64 flex-shrink-0 bg-surface-sidebar
      flex flex-col h-screen
      border-r border-white/5
    ">
      {/* Logo / Branding */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
            ☕
          </div>
          <div>
            <h1 className="text-white font-semibold text-sm leading-tight">Kafić Pasaz</h1>
            <p className="text-gray-400 text-xs">Management v1.0</p>
          </div>
        </div>
      </div>

      {/* Navigacione stavke / Navigation items */}
      <nav className="flex-1 overflow-y-auto py-4 px-3" role="navigation" aria-label="Main navigation">
        <ul className="space-y-0.5">
          {visibleItems.map((item) => (
            <li key={item.path}>
              {item.divider && (
                <hr className="border-white/10 my-3 mx-2" />
              )}
              <NavLink
                to={item.path}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2.5 rounded-lg
                  text-sm font-medium transition-all duration-150
                  ${isActive
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }
                `}
              >
                <Icon name={item.icon} />
                <span>{t(item.labelKey)}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Informacije o korisniku / User info */}
      <div className="px-4 py-4 border-t border-white/10 bg-black/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{user.fullName}</p>
            <p className="text-gray-400 text-xs">{t(`roles.${user.role}`)}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
