/**
 * @file src/pages/DashboardPage.tsx
 * @description Kontrolna tabla — početna stranica za ulogovane korisnike.
 *              Dashboard — home page for logged-in users.
 *
 * Prikazuje:
 * - Pozdravnu poruku sa imenom korisnika
 * - Rolu korisnika
 * - Brze statistike (placeholder za buduće faze)
 * - Admin-specifične informacije
 *
 * Shows:
 * - Welcome message with user's name
 * - User role
 * - Quick statistics (placeholder for future phases)
 * - Admin-specific information
 */

import { useTranslation } from 'react-i18next'
import { useNavigate }    from 'react-router-dom'
import { useAuth }        from '../hooks/useAuth'
import { useShift }       from '../hooks/useShift'

/**
 * Komponenta za statističku karticu.
 * Stat card component.
 */
function StatCard({
  label,
  value,
  icon,
  color
}: {
  label: string
  value: string | number
  icon:  string
  color: string
}) {
  return (
    <div className={`
      bg-surface-card rounded-2xl p-5
      border border-white/5
      flex items-center gap-4
    `}>
      <div className={`
        w-12 h-12 rounded-xl flex items-center justify-center
        text-2xl flex-shrink-0
        ${color}
      `}>
        {icon}
      </div>
      <div>
        <p className="text-gray-400 text-xs font-medium mb-0.5">{label}</p>
        <p className="text-white text-2xl font-bold">{value}</p>
      </div>
    </div>
  )
}

/**
 * Dashboard stranica aplikacije.
 * Application dashboard page.
 *
 * @returns {JSX.Element} Dashboard sadržaj / Dashboard content
 */
export function DashboardPage() {
  const { t }                                  = useTranslation()
  const navigate                               = useNavigate()
  const { user }                               = useAuth()
  const { activeShift, isProcessing, startShift, endShift } = useShift()

  if (!user) return null

  const isAdmin = user.role === 'ADMIN'

  // Formatiranje vremena početka smene / Format shift start time
  const shiftStartTime = activeShift
    ? new Date(activeShift.startedAt).toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="p-6 space-y-6">
      {/* Pozdravna sekcija / Welcome section */}
      <div className="bg-gradient-to-br from-primary-500/20 to-primary-700/10 rounded-2xl p-6 border border-primary-500/20">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">
              {t('dashboard.welcome', { name: user.fullName })}
            </h1>
            <div className="flex items-center gap-2">
              <span className={`
                inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                ${isAdmin
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }
              `}>
                {isAdmin ? '👑' : '🤵'} {t(`roles.${user.role}`)}
              </span>
              <span className="text-gray-500 text-sm">
                @{user.username}
              </span>
            </div>
          </div>
          <div className="text-5xl opacity-30">☕</div>
        </div>
      </div>

      {/* Brze statistike / Quick stats */}
      <div>
        <h2 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-3">
          {t('dashboard.quick_stats')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label={t('dashboard.today_revenue')}
            value="— RSD"
            icon="💰"
            color="bg-green-500/10"
          />
          <StatCard
            label={t('dashboard.open_bills')}
            value="—"
            icon="🧾"
            color="bg-blue-500/10"
          />
          <StatCard
            label={t('dashboard.occupied_tables')}
            value="—"
            icon="🪑"
            color="bg-orange-500/10"
          />
        </div>
      </div>

      {/* Status smene / Shift status */}
      <div className={`
        rounded-2xl p-5 border
        ${activeShift
          ? 'bg-green-500/5 border-green-500/20'
          : 'bg-surface-card border-white/5'
        }
      `}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {activeShift && (
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              )}
              <h3 className="text-white font-semibold">
                {activeShift
                  ? t('shifts.activeSince', { time: shiftStartTime ?? '' })
                  : t('dashboard.no_active_shift')
                }
              </h3>
            </div>
            <p className="text-gray-400 text-sm">
              {isAdmin
                ? t('dashboard.shift_desc_admin')
                : t('dashboard.shift_desc_waiter')}
            </p>
          </div>
          <button
            onClick={() => activeShift ? void endShift() : void startShift()}
            disabled={isProcessing}
            className={`
              px-4 py-2 font-medium rounded-xl
              transition-colors duration-200
              text-sm disabled:opacity-50 disabled:cursor-not-allowed
              ${activeShift
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
                : 'bg-primary-500 hover:bg-primary-600 text-black'
              }
            `}
          >
            {isProcessing
              ? t('common.loading')
              : activeShift
                ? t('dashboard.end_shift')
                : t('dashboard.start_shift')
            }
          </button>
        </div>
      </div>

      {/* Admin paneli / Admin panels */}
      {isAdmin && (
        <div>
          <h2 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-3">
            Admin
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { titleKey: 'dashboard.admin_table_layout_title', descKey: 'dashboard.admin_table_layout_desc', icon: '🪑', path: '/admin/table-layout' },
              { titleKey: 'dashboard.admin_users_title',    descKey: 'dashboard.admin_users_desc',    icon: '👥', path: '/users' },
              { titleKey: 'dashboard.admin_reports_title',  descKey: 'dashboard.admin_reports_desc',  icon: '📊', path: '/reports' },
              { titleKey: 'dashboard.admin_settings_title', descKey: 'dashboard.admin_settings_desc', icon: '⚙️', path: '/settings' }
            ].map(card => (
              <div
                key={card.path}
                onClick={() => navigate(card.path)}
                className="
                  bg-surface-card hover:bg-white/5
                  rounded-2xl p-5 border border-white/5
                  cursor-pointer transition-all duration-200
                  group
                "
              >
                <div className="text-3xl mb-3">{card.icon}</div>
                <h3 className="text-white font-semibold text-sm mb-1 group-hover:text-primary-400 transition-colors">
                  {t(card.titleKey)}
                </h3>
                <p className="text-gray-500 text-xs">{t(card.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
