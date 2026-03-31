# Kafic App — Technical Documentation

## Contents
1. [System Architecture](#1-system-architecture)
2. [Technologies and Versions](#2-technologies-and-versions)
3. [Project Structure](#3-project-structure)
4. [Database](#4-database)
5. [API Reference](#5-api-reference)
6. [Running the Dev Server](#6-running-the-dev-server)
7. [Creating a Production Build](#7-creating-a-production-build)
8. [Adding a New Module](#8-adding-a-new-module)

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Electron (Main Process)                 │
│  electron/main.ts                                         │
│  ├── BrowserWindow (Renderer)                             │
│  ├── Express API Server (port 3001)                       │
│  ├── IPC Handlers (backup, window controls, logging)      │
│  └── Auto-backup on close                                 │
└─────────────────────────────────────────────────────────┘
         │ startServer()                   │ IPC
         ▼                                 ▼
┌─────────────────┐              ┌─────────────────────────┐
│  Express Server │              │  React SPA (Renderer)    │
│  server/index.ts│              │  src/                    │
│  port 3001      │◄────HTTP────►│  React Router 6          │
│                 │              │  Tailwind CSS             │
│  Routes         │              │  react-i18next           │
│  Services       │              │  recharts                │
│  Prisma ORM     │              └─────────────────────────┘
│  SQLite DB      │
└─────────────────┘
```

### Data Flow

1. User interacts with the **React UI** (renderer process)
2. React component calls a function from **src/api/** (fetch wrapper)
3. Fetch sends an HTTP request to **localhost:3001/api/v1/**
4. **Express router** parses the request and calls the appropriate **Service**
5. Service executes a **Prisma** query against the **SQLite** database
6. The response is returned through the same chain

---

## 2. Technologies and Versions

### Frontend
| Technology | Version | Role |
|------------|---------|------|
| React | 18.3.x | UI framework |
| React Router | 6.28.x | SPA routing |
| Tailwind CSS | 3.4.x | Styling |
| react-i18next | 15.1.x | Internationalization |
| recharts | 3.8.x | Charts |
| pdfmake | 0.3.x | PDF generation |
| exceljs | 4.4.x | Excel generation |
| @dnd-kit | 6.x / 10.x | Drag & Drop |

### Backend
| Technology | Version | Role |
|------------|---------|------|
| Express | 4.21.x | HTTP server |
| Prisma | 5.22.x | ORM |
| SQLite | via Prisma | Database |
| jsonwebtoken | 9.0.x | JWT authentication |
| bcryptjs | 2.4.x | Password hashing |
| node-thermal-printer | 4.6.x | Thermal printer |

### Desktop
| Technology | Version | Role |
|------------|---------|------|
| Electron | 33.2.x | Desktop runtime |
| electron-vite | 2.3.x | Build tool |
| electron-builder | 25.1.x | Packaging (.exe) |
| electron-log | 5.4.x | File logging |
| TypeScript | 5.7.x | Type system |

---

## 3. Project Structure

```
caffe-pasaz-management/
│
├── electron/                    # Electron main process
│   ├── main.ts                  # Entry point, BrowserWindow, IPC handlers
│   ├── preload.ts               # IPC bridge (contextIsolation)
│   └── backupService.ts         # SQLite backup/restore logic
│
├── server/                      # Express API server
│   ├── index.ts                 # App factory, route mounting
│   ├── middleware/
│   │   ├── auth.ts              # requireAuth, requireAdmin middleware
│   │   ├── logger.ts            # Request logger
│   │   ├── errorHandler.ts      # Global error handler
│   │   └── checkActiveShift.ts  # Active shift verification
│   ├── routes/
│   │   ├── auth.ts              # POST /auth/login, /auth/me
│   │   ├── categories.ts        # CRUD /categories
│   │   ├── products.ts          # CRUD /products
│   │   ├── inventory.ts         # GET /inventory, POST /inventory/adjust
│   │   ├── tables.ts            # CRUD /tables
│   │   ├── shifts.ts            # Shift management
│   │   ├── bills.ts             # POS bills
│   │   ├── settings.ts          # GET/PUT /settings
│   │   ├── print.ts             # POST /print/bill, /print/shift-summary
│   │   ├── users.ts             # CRUD /users (admin)
│   │   ├── salaries.ts          # GET/POST /salaries (admin)
│   │   ├── reports.ts           # GET /reports/daily|weekly|monthly|custom
│   │   └── dashboard.ts         # GET /dashboard (admin)
│   └── services/
│       ├── authService.ts
│       ├── categoryService.ts
│       ├── productService.ts
│       ├── inventoryService.ts
│       ├── tableService.ts
│       ├── shiftService.ts
│       ├── billService.ts
│       ├── settingsService.ts
│       ├── printService.ts
│       ├── userService.ts
│       ├── salaryService.ts
│       ├── reportService.ts
│       └── dashboardService.ts
│
├── src/                         # React frontend (renderer)
│   ├── index.html               # Entry HTML
│   ├── main.tsx                 # React entry point
│   ├── App.tsx                  # Router, routes, layout
│   ├── api/                     # Fetch wrappers (mirrors server/routes 1:1)
│   │   ├── apiClient.ts         # Base fetch with JWT header
│   │   ├── auth.ts
│   │   ├── categories.ts
│   │   ├── products.ts
│   │   ├── inventory.ts
│   │   ├── tables.ts
│   │   ├── shifts.ts
│   │   ├── bills.ts
│   │   ├── settings.ts
│   │   ├── print.ts
│   │   ├── backup.ts
│   │   ├── users.ts
│   │   ├── salaries.ts
│   │   ├── reports.ts
│   │   └── dashboard.ts
│   ├── components/
│   │   ├── ui/                  # Generic reusable UI components
│   │   │   ├── DataTable.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   ├── Toaster.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   └── SkeletonLoader.tsx
│   │   ├── reports/             # Report-specific components
│   │   │   ├── ReportSummaryCards.tsx
│   │   │   ├── TopProductsTable.tsx
│   │   │   └── ComparisonBadge.tsx
│   │   ├── ShiftGuard.tsx       # Blocks access without an active shift
│   │   └── ErrorBoundary.tsx    # React error boundary
│   ├── context/
│   │   ├── AuthContext.tsx      # JWT auth state
│   │   ├── ToastContext.tsx     # Global toast notifications
│   │   └── ShiftContext.tsx     # Active shift state
│   ├── hooks/
│   │   └── useKeyboardShortcuts.ts
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── CategoriesPage.tsx
│   │   ├── ProductsPage.tsx
│   │   ├── InventoryPage.tsx
│   │   ├── TablesPage.tsx
│   │   ├── BillPage.tsx         # POS screen
│   │   └── shift/
│   │       └── ShiftSummaryPage.tsx
│   └── pages/admin/
│       ├── AdminDashboardPage.tsx
│       ├── UsersPage.tsx
│       ├── SalariesPage.tsx
│       ├── ShiftsHistoryPage.tsx
│       ├── SettingsPage.tsx
│       └── reports/
│           ├── DailyReportPage.tsx
│           ├── WeeklyReportPage.tsx
│           ├── MonthlyReportPage.tsx
│           └── CustomReportPage.tsx
│   ├── i18n/
│   │   ├── sr.json              # Serbian translations (default)
│   │   └── en.json              # English translations
│   ├── types/
│   │   └── index.ts             # TypeScript interfaces
│   └── utils/
│       ├── token.ts             # JWT storage/retrieval (localStorage)
│       ├── exportPdf.ts         # pdfmake PDF export
│       └── exportExcel.ts       # exceljs Excel export
│
├── prisma/
│   ├── schema.prisma            # DB schema
│   ├── seed.ts                  # Demo data
│   └── dev.db                   # SQLite file (development)
│
├── build/
│   └── icon.ico                 # Application icon
│
├── docs/                        # Documentation
├── electron-builder.yml         # Build configuration
├── electron.vite.config.ts      # Vite configuration
├── package.json
└── tsconfig.json
```

---

## 4. Database

### Schema and Relations

```
User ──────┬──── Shift (userId)
           ├──── Bill (userId)
           ├──── Salary (userId) as UserSalaries
           └──── Salary (paidById) as PaidSalaries

Shift ─────┬──── Bill (shiftId)
           └──── InventoryLog (shiftId)

TableUnit ─┴──── Bill (tableId)

Category ──┴──── Product (categoryId)

Product ───┬──── BillItem (productId)
           └──── InventoryLog (productId)

Bill ───────┴──── BillItem (billId)

Setting (key/value store, standalone)
```

### Models

| Model | Description | Key Fields |
|-------|-------------|------------|
| User | System users | username, password (bcrypt), role, active |
| Shift | Work shift | userId, startedAt, endedAt, active |
| TableUnit | Cafe table | label, zone, positionX/Y, isOccupied |
| Category | Product category | nameSr, nameEn, sortOrder |
| Product | Menu item | nameSr, nameEn, price, stockQuantity, unit, normQuantity |
| Bill | Receipt/bill | tableId, shiftId, userId, status, totalAmount, discount |
| BillItem | Line item on bill | billId, productId, quantity, unitPrice, color |
| InventoryLog | Inventory audit log | productId, shiftId, changeQty, type, note |
| Setting | App settings (k/v) | key, value |
| Salary | Salary payment | userId, amount, paidById, note, paidAt |

### String Enum Values (SQLite limitation)

SQLite does not support native enum types in Prisma. String fields with service-layer validation are used:

| Field | Allowed Values |
|-------|---------------|
| User.role | `"ADMIN"` \| `"WAITER"` |
| TableUnit.zone | `"INDOOR"` \| `"OUTDOOR"` |
| Bill.status | `"OPEN"` \| `"PAID"` \| `"CANCELLED"` |
| BillItem.color | `"WHITE"` \| `"BLACK"` |
| InventoryLog.type | `"PURCHASE"` \| `"SALE"` \| `"ADJUSTMENT"` \| `"WASTE"` |

---

## 5. API Reference

All endpoints are under base path: `http://localhost:3001/api/v1/`

Authentication: `Authorization: Bearer <JWT_TOKEN>`

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | No | Login, returns JWT token |
| GET | `/auth/me` | Yes | Current user |

**POST /auth/login**
```json
// Request
{ "username": "admin", "password": "admin123" }

// Response 200
{ "token": "eyJ...", "user": { "id": 1, "username": "admin", "role": "ADMIN" } }
```

### Categories

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/categories` | Yes | List all active categories |
| POST | `/categories` | Admin | Create category |
| PUT | `/categories/:id` | Admin | Update category |
| DELETE | `/categories/:id` | Admin | Deactivate |

### Products

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/products` | Yes | List all active products |
| GET | `/products?categoryId=1` | Yes | Filter by category |
| POST | `/products` | Admin | Create product |
| PUT | `/products/:id` | Admin | Update |
| DELETE | `/products/:id` | Admin | Deactivate |

### Inventory

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/inventory` | Yes | Current stock levels |
| POST | `/inventory/adjust` | Admin | Manual stock adjustment |
| POST | `/inventory/purchase` | Admin | Stock replenishment |

### Tables

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/tables` | Yes | List active tables |
| POST | `/tables` | Admin | Create table |
| PUT | `/tables/:id` | Admin | Update (position, label) |
| DELETE | `/tables/:id` | Admin | Deactivate |

### Shifts

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/shifts/active` | Yes | Active shift |
| POST | `/shifts/start` | Yes | Start shift |
| GET | `/shifts/:id/summary` | Yes | Shift report |
| GET | `/shifts/:id/inventory-summary` | Yes | Shift inventory |
| POST | `/shifts/:id/inventory-adjust` | Yes | In-shift stock adjustment |
| POST | `/shifts/:id/end` | Yes | End shift |
| POST | `/shifts/:id/print-summary` | Yes | Print shift summary |
| GET | `/shifts` | Admin | All shifts history |

### Bills

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/bills` | Yes | Active (OPEN) bills |
| GET | `/bills/:id` | Yes | Bill details |
| POST | `/bills` | Yes | Open new bill |
| POST | `/bills/:id/items` | Yes | Add item |
| PUT | `/bills/:id/items/:itemId` | Yes | Update item |
| DELETE | `/bills/:id/items/:itemId` | Yes | Remove item |
| POST | `/bills/:id/pay` | Yes | Pay bill |
| POST | `/bills/:id/cancel` | Yes | Cancel bill |
| POST | `/bills/:id/transfer` | Yes | Transfer to another table |
| POST | `/bills/:id/discount` | Yes | Set discount |

### Settings

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/settings` | Yes | All settings (k/v map) |
| PUT | `/settings` | Admin | Bulk update settings |

### Reports

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/reports/daily?date=2025-03-15` | Admin | Daily report |
| GET | `/reports/weekly?date=2025-03-15` | Admin | Weekly report |
| GET | `/reports/monthly?year=2025&month=3` | Admin | Monthly report |
| GET | `/reports/custom?from=2025-03-01&to=2025-03-31` | Admin | Custom range |

### Dashboard

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/dashboard` | Admin | Admin statistics |

### Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users` | Admin | List users |
| POST | `/users` | Admin | Create user |
| PUT | `/users/:id` | Admin | Update |
| DELETE | `/users/:id` | Admin | Deactivate |
| POST | `/users/:id/reactivate` | Admin | Reactivate |

### Salaries

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/salaries` | Admin | List payments (filter: userId, from, to) |
| POST | `/salaries` | Admin | Record payment |

---

## 6. Running the Dev Server

```bash
# Install dependencies
npm install

# Create database and generate Prisma client
npx prisma db push

# Seed with demo data
tsx prisma/seed.ts

# Start dev server (Electron + Express + React Vite)
npm run dev
```

The dev server starts:
- **Vite dev server** at `http://localhost:5173` (hot reload)
- **Express API** at `http://localhost:3001`
- **Electron** window loading the Vite URL

---

## 7. Creating a Production Build

```bash
# Build React + Express + Electron
npm run build

# Create .exe installer (NSIS)
npm run dist

# Or both at once:
npm run package
```

Output:
```
dist/
└── Kafic-App-Setup-1.0.0.exe    # NSIS installer
```

### Production Database

In production mode, Electron automatically creates the database at:
```
%APPDATA%\Kafic App\kafic.db
```
(e.g. `C:\Users\Marko\AppData\Roaming\Kafic App\kafic.db`)

The `DATABASE_URL` environment variable is set to this path before the Express server starts.

---

## 8. Adding a New Module

Example: adding a `Reservations` module.

### Step 1 — Prisma Schema

```prisma
// prisma/schema.prisma
model Reservation {
  id        Int      @id @default(autoincrement())
  tableId   Int
  name      String
  phone     String?
  date      DateTime
  note      String?
  active    Boolean  @default(true)
  createdAt DateTime @default(now())

  table     TableUnit @relation(fields: [tableId], references: [id])
}
```

```bash
npx prisma db push
```

### Step 2 — Service

```typescript
// server/services/reservationService.ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export async function getAll() {
  return prisma.reservation.findMany({ where: { active: true }, include: { table: true } })
}

export async function create(data: { tableId: number; name: string; date: Date }) {
  return prisma.reservation.create({ data })
}
```

### Step 3 — Route

```typescript
// server/routes/reservations.ts
import { Router } from 'express'
import { authenticateToken, requireAdmin } from '../middleware/auth'
import * as svc from '../services/reservationService'

export const reservationsRouter = Router()

reservationsRouter.get('/', authenticateToken, async (req, res) => {
  res.json(await svc.getAll())
})

reservationsRouter.post('/', authenticateToken, requireAdmin, async (req, res) => {
  res.status(201).json(await svc.create(req.body))
})
```

### Step 4 — Mount in server/index.ts

```typescript
import { reservationsRouter } from './routes/reservations'
app.use('/api/v1/reservations', reservationsRouter)
```

### Step 5 — API Client

```typescript
// src/api/reservations.ts
import { apiFetch } from './apiClient'

export async function getReservations() {
  return apiFetch<Reservation[]>('/reservations')
}
```

### Step 6 — React Page + i18n + App.tsx

Add the page to `src/pages/admin/ReservationsPage.tsx`, translations to `sr.json`/`en.json`, and a route to `App.tsx`.
