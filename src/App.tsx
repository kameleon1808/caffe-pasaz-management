/**
 * @file src/App.tsx
 * @description Korenska komponenta aplikacije sa routing konfiguracijom.
 *              Root application component with routing configuration.
 *
 * Postavlja:
 * - AuthProvider (globalni auth kontekst)
 * - React Router sa zaštićenim rutama
 * - Osnovna struktura ruta
 *
 * Sets up:
 * - AuthProvider (global auth context)
 * - React Router with protected routes
 * - Basic route structure
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// Kontekst / Context
import { AuthProvider }  from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { ShiftProvider } from './context/ShiftContext'

// Komponente / Components
import { ProtectedRoute } from './components/ProtectedRoute'
import { MainLayout }     from './components/Layout/MainLayout'
import { Toaster }        from './components/ui/Toaster'
import { ErrorBoundary }  from './components/ErrorBoundary'

// Stranice / Pages
import { LoginPage }     from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'

// Admin stranice — Faza 2 / Admin pages — Phase 2
import { CategoriesPage }        from './pages/admin/CategoriesPage'
import { ProductsPage }          from './pages/admin/ProductsPage'
import { InventoryPage }         from './pages/admin/InventoryPage'
import { PurchasePage }          from './pages/admin/PurchasePage'

// Admin stranice — Faza 5 / Admin pages — Phase 5
import { PrinterSettingsPage }   from './pages/admin/PrinterSettingsPage'

// Stranice — Faza 3 / Pages — Phase 3
import { TablesPage }      from './pages/TablesPage'
import { TableLayoutPage } from './pages/admin/TableLayoutPage'
import { BillPage }        from './pages/BillPage'

// Stranice — Faza 6 / Pages — Phase 6
import { ShiftSummaryPage }   from './pages/ShiftSummaryPage'
import { ShiftsHistoryPage }  from './pages/admin/ShiftsHistoryPage'

// Admin stranice — Faza 7 / Admin pages — Phase 7
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { UsersPage }    from './pages/admin/UsersPage'
import { SalariesPage } from './pages/admin/SalariesPage'
import { SettingsPage } from './pages/admin/SettingsPage'

// Izveštaji — Faza 7.2 / Reports — Phase 7.2
import { DailyReportPage }   from './pages/admin/reports/DailyReportPage'
import { WeeklyReportPage }  from './pages/admin/reports/WeeklyReportPage'
import { MonthlyReportPage } from './pages/admin/reports/MonthlyReportPage'
import { CustomReportPage }  from './pages/admin/reports/CustomReportPage'

// Placeholder stranice za buduće faze / Placeholder pages for future phases
import { PlaceholderPage } from './pages/PlaceholderPage'

/**
 * Korenska komponenta sa svim provajderima i rutama.
 * Root component with all providers and routes.
 *
 * @returns {JSX.Element} Aplikacija / Application
 */
function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <ToastProvider>
        <Toaster />
        <AuthProvider>
        <ShiftProvider>
        <Routes>
          {/* Javne rute / Public routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Zaštićene rute — dostupne svim ulogovanim korisnicima */}
          {/* Protected routes — available to all logged-in users */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <DashboardPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/tables"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <TablesPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/bills/:id"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <BillPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/products"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <MainLayout>
                  <ProductsPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/inventory"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <MainLayout>
                  <InventoryPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/inventory/purchase"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <MainLayout>
                  <PurchasePage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Admin dashboard — Faza 7.4 / Admin dashboard — Phase 7.4 */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <MainLayout>
                  <AdminDashboardPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Istorija smena — admin / Shift history — admin (Faza 6.3) */}
          <Route
            path="/admin/shifts"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <MainLayout>
                  <ShiftsHistoryPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/shifts"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <MainLayout>
                  <ShiftsHistoryPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Sumarni izveštaj smene — Faza 6.1 / Shift summary report — Phase 6.1 */}
          <Route
            path="/shift/summary"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ShiftSummaryPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Raspored stolova — admin / Table layout — admin */}
          <Route
            path="/admin/table-layout"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <MainLayout>
                  <TableLayoutPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Admin-only rute / Admin-only routes */}
          <Route
            path="/categories"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <MainLayout>
                  <CategoriesPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/users"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <MainLayout>
                  <UsersPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/users"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <MainLayout>
                  <UsersPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/salaries"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <MainLayout>
                  <SalariesPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <MainLayout>
                  <DailyReportPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/reports/daily"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <MainLayout>
                  <DailyReportPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/reports/weekly"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <MainLayout>
                  <WeeklyReportPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/reports/monthly"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <MainLayout>
                  <MonthlyReportPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/reports/custom"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <MainLayout>
                  <CustomReportPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <MainLayout>
                  <SettingsPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Podešavanja kafića — Faza 7.3 / Cafe settings — Phase 7.3 */}
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <MainLayout>
                  <SettingsPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Podešavanja štampača — Faza 5 / Printer settings — Phase 5 */}
          <Route
            path="/admin/settings/printer"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <MainLayout>
                  <PrinterSettingsPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Default redirect / Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* 404 / Not found */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </ShiftProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
