/**
 * @file src/main.tsx
 * @description Ulazna tačka React renderer procesa.
 *              Entry point of the React renderer process.
 *
 * Inicijalizuje:
 * - i18n internacionalizaciju
 * - React aplikaciju
 * - Tailwind CSS stilove
 *
 * Initializes:
 * - i18n internationalization
 * - React application
 * - Tailwind CSS styles
 */

// i18n mora biti importovan pre App-a / i18n must be imported before App
import './i18n'

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Pokreni React aplikaciju / Start React application
const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error(
    '[main] #root element nije pronađen u DOM-u / ' +
    '[main] #root element not found in DOM'
  )
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
