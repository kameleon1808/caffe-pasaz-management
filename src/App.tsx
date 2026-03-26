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
import { AuthProvider } from './context/AuthContext'

// Komponente / Components
import { ProtectedRoute } from './components/ProtectedRoute'
import { MainLayout }     from './components/Layout/MainLayout'

// Stranice / Pages
import { LoginPage }     from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'

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
    <BrowserRouter>
      <AuthProvider>
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
                  <PlaceholderPage titleKey="nav.tables" icon="🪑" />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/bills"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <PlaceholderPage titleKey="nav.bills" icon="🧾" />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/products"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <PlaceholderPage titleKey="nav.products" icon="📦" />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/inventory"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <PlaceholderPage titleKey="nav.inventory" icon="🗃️" />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/shifts"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <PlaceholderPage titleKey="nav.shifts" icon="⏰" />
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
                  <PlaceholderPage titleKey="nav.categories" icon="🏷️" />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/users"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <MainLayout>
                  <PlaceholderPage titleKey="nav.users" icon="👥" />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <MainLayout>
                  <PlaceholderPage titleKey="nav.reports" icon="📊" />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <MainLayout>
                  <PlaceholderPage titleKey="nav.settings" icon="⚙️" />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Default redirect / Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* 404 / Not found */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
