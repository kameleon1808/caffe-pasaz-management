/**
 * @file tailwind.config.js
 * @description Konfiguracija Tailwind CSS-a sa prilagođenom paletom boja za aplikaciju.
 *              Tailwind CSS configuration with a custom color palette for the application.
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{tsx,ts,jsx,js}',
    './src/index.html'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#fdf4e7',
          100: '#fae3be',
          200: '#f6cd8e',
          300: '#f2b65d',
          400: '#efa33a',
          500: '#ec9117',
          600: '#d47f14',
          700: '#b56a10',
          800: '#96560d',
          900: '#78450a',
        },
        surface: {
          DEFAULT: '#1a1a2e',
          card:    '#16213e',
          sidebar: '#0f3460',
          input:   '#1e2a45',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}
