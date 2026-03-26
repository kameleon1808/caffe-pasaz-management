/**
 * @file src/components/Layout/Header.tsx
 * @description Header komponenta sa korisničkim opcijama i language switcherom.
 *              Header component with user options and language switcher.
 */

import { useTranslation }    from 'react-i18next'
import { useNavigate }       from 'react-router-dom'
import { useAuth }           from '../../hooks/useAuth'
import { LanguageSwitcher }  from '../LanguageSwitcher'

/**
 * Header aplikacije prikazan na vrhu svake zaštićene stranice.
 * Application header displayed at the top of every protected page.
 *
 * @returns {JSX.Element} Header komponenta / Header component
 */
export function Header() {
  const { t }      = useTranslation()
  const { user, logout } = useAuth()
  const navigate   = useNavigate()

  /**
   * Odjavljuje korisnika i vraća na login stranicu.
   * Logs out the user and redirects to the login page.
   */
  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="
      h-14 flex-shrink-0
      bg-surface-card border-b border-white/5
      flex items-center justify-between
      px-6
    ">
      {/* Leva strana — naziv trenutne stranice (placeholder za breadcrumb) */}
      {/* Left side — current page name (placeholder for breadcrumb) */}
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 bg-primary-500 rounded-full" />
        <span className="text-gray-300 text-sm font-medium">
          Kafić Pasaz
        </span>
      </div>

      {/* Desna strana — language switcher i korisničke opcije */}
      {/* Right side — language switcher and user options */}
      <div className="flex items-center gap-3">
        {/* Language switcher */}
        <LanguageSwitcher />

        {/* Separator */}
        <div className="w-px h-6 bg-white/10" />

        {/* Korisničke opcije / User options */}
        {user && (
          <div className="flex items-center gap-2">
            {/* Avatar */}
            <div className="
              w-7 h-7 bg-primary-600 rounded-full
              flex items-center justify-center
              text-white text-xs font-bold
            ">
              {user.fullName.charAt(0).toUpperCase()}
            </div>

            {/* Puno ime */}
            <span className="text-gray-300 text-sm hidden md:block">
              {user.fullName}
            </span>

            {/* Dugme za odjavu / Logout button */}
            <button
              onClick={() => void handleLogout()}
              title={t('header.logout')}
              aria-label={t('header.logout')}
              className="
                flex items-center gap-1.5 px-3 py-1.5
                text-gray-400 hover:text-red-400
                hover:bg-red-400/10
                rounded-lg border border-transparent hover:border-red-400/20
                transition-all duration-200
                text-sm
              "
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">{t('nav.logout')}</span>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
