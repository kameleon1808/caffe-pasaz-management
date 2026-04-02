# Kafic Pasaz — Management App

A desktop management system for small cafes and bars. Built as a self-contained Windows application — no internet connection, no cloud, no subscriptions.

---

## What problem does it solve?

Running a cafe involves tracking orders, tables, cash flow, inventory, and staff — usually across handwritten notes, spreadsheets, or expensive POS systems. This app consolidates everything into a single offline desktop tool built specifically for small venues.

**Core workflow:**

1. Waiter opens a shift → tables become active
2. Waiter taps a table → POS screen opens → adds items to the bill
3. Guest pays → receipt prints automatically → table is freed
4. Waiter ends shift → shift report shows total revenue, inventory consumed, sales by product
5. Admin reviews reports, manages staff, tracks salary payments

**Key capabilities:**

| Feature | Description |
|---------|-------------|
| Table layout | Visual map of indoor/outdoor tables with occupied/free status |
| POS screen | Add products to bills, adjust quantities, apply discounts, transfer tables |
| White/Black tracking | Separate official and off-the-books transactions per bill item |
| Thermal printer | Auto-print receipts on payment (USB or network printer) |
| Shift reports | Revenue, product sales, inventory summary per shift |
| Inventory management | Stock levels, purchase logging, waste/adjustment entries |
| Admin dashboard | Daily/weekly/monthly stats with charts, top products, category breakdown |
| Reports | Daily, weekly, monthly, custom period — exportable to PDF and Excel |
| User management | CRUD for waiters, role-based access (ADMIN / WAITER) |
| Salary payments | Record and track salary payments per employee |
| Automatic backups | SQLite database backed up on every app close |
| Bilingual UI | Serbian (default) and English, switchable at runtime |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Electron 33 |
| Frontend | React 18, React Router 6, Tailwind CSS, react-i18next |
| Backend (embedded) | Express 4, Prisma 5, SQLite |
| Auth | JWT + bcryptjs |
| Charts | recharts |
| Export | pdfmake (PDF), exceljs (Excel) |
| Build | electron-vite 2, electron-builder 25 |
| Language | TypeScript throughout |

Everything runs locally inside the Electron process — no external server required.

---

## Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| OS | Windows 10 64-bit | Windows 11 64-bit |
| RAM | 4 GB | 8 GB |
| Disk | 500 MB free | 1 GB free |
| Node.js (dev only) | 18.x | 20.x LTS |

---

## Installation (end user)

1. Obtain `Kafic-App-Setup-x.x.x.exe` from the build output
2. Run the installer — if Windows SmartScreen appears, click **More info → Run anyway**
3. Choose an installation folder (default: `C:\Program Files\Kafic App\`)
4. Click **Install**, then **Launch**

On first launch the app creates the SQLite database and loads it with demo data.

**Default accounts:**

| Role | Username | Password |
|------|----------|----------|
| Administrator | `admin` | `admin123` |
| Waiter | `konobar` | `konobar123` |

> Change all passwords immediately after first login via **Admin → Users**.

### First-time configuration

Log in as admin and go to **Admin → Settings** to set:
- Cafe name, address, tax ID, phone number
- Currency (default: RSD)
- Thermal printer (USB / Network / Disabled)

---

## Development Setup

```bash
# 1. Clone the repo
git clone https://github.com/your-org/caffe-pasaz-management.git
cd caffe-pasaz-management

# 2. Install dependencies
npm install

# 3. Create the database and generate Prisma client
npx prisma db push

# 4. Seed with demo data
npx tsx prisma/seed.ts

# 5. Start the dev server (Electron + Express + Vite HMR)
npm run dev
```

Dev server starts:
- **Vite** at `http://localhost:5173` (hot reload)
- **Express API** at `http://localhost:3001`
- **Electron** window loading the Vite URL

---

## Building the Installer

**Quick way — double-click `BUILDUJ.bat`** in the project root. It handles all steps automatically and opens the `dist/` folder when done.

**Manual build:**

```bash
# Build all layers (React + Express + Electron)
npm run build

# Package as Windows .exe installer
npm run dist

# Or both in one command
npm run package
```

Output: `dist/Kafic-App-Setup-1.0.0.exe`

> Windows builds must be created on a Windows machine.

---

## Project Structure

```
caffe-pasaz-management/
├── electron/          # Electron main process (IPC, window, backups)
├── server/            # Express API — routes/ + services/ + middleware/
├── src/               # React SPA — pages/, components/, api/, i18n/
├── prisma/            # Schema, migrations, seed, dev.db
├── docs/              # Full documentation (SR + EN)
│   ├── SR/            # Serbian documentation
│   └── EN/            # English documentation
├── build/             # App icon
├── BUILDUJ.bat        # One-click build script
└── electron-builder.yml
```

---

## Documentation

Full documentation is in the `docs/` folder:

| File | Description |
|------|-------------|
| [docs/EN/INSTALLATION.md](docs/EN/INSTALLATION.md) | End-user installation guide |
| [docs/EN/USER_GUIDE.md](docs/EN/USER_GUIDE.md) | Waiter workflow guide |
| [docs/EN/ADMIN_GUIDE.md](docs/EN/ADMIN_GUIDE.md) | Administrator guide |
| [docs/EN/TECHNICAL_DOCUMENTATION.md](docs/EN/TECHNICAL_DOCUMENTATION.md) | Architecture, API reference, DB schema |
| [docs/EN/BUILD_GUIDE.md](docs/EN/BUILD_GUIDE.md) | Build and packaging instructions |
| [docs/EN/TROUBLESHOOTING.md](docs/EN/TROUBLESHOOTING.md) | Common issues and fixes |

---

## License

Private project — not licensed for public distribution.
