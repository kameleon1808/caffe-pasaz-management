# Kafic App — Tehnička dokumentacija

## Sadržaj
1. [Arhitektura sistema](#1-arhitektura-sistema)
2. [Tehnologije i verzije](#2-tehnologije-i-verzije)
3. [Struktura projekta](#3-struktura-projekta)
4. [Baza podataka](#4-baza-podataka)
5. [API dokumentacija](#5-api-dokumentacija)
6. [Pokretanje razvojnog servera](#6-pokretanje-razvojnog-servera)
7. [Kreiranje production build-a](#7-kreiranje-production-build-a)
8. [Dodavanje novog modula](#8-dodavanje-novog-modula)

---

## 1. Arhitektura sistema

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

### Tok podataka

1. Korisnik interaguje sa **React UI** (renderer process)
2. React komponenta poziva funkciju iz **src/api/** (fetch wrapper)
3. Fetch šalje HTTP zahtev na **localhost:3001/api/v1/**
4. **Express router** parsira zahtev i poziva odgovarajući **Service**
5. Service izvršava **Prisma** upit nad **SQLite** bazom
6. Odgovor se vraća kroz isti lanac

---

## 2. Tehnologije i verzije

### Frontend
| Tehnologija | Verzija | Uloga |
|-------------|---------|-------|
| React | 18.3.x | UI framework |
| React Router | 6.28.x | SPA rutiranje |
| Tailwind CSS | 3.4.x | Stilizovanje |
| react-i18next | 15.1.x | Internacionalizacija |
| recharts | 3.8.x | Grafikoni |
| pdfmake | 0.3.x | Generisanje PDF |
| exceljs | 4.4.x | Generisanje Excel |
| @dnd-kit | 6.x / 10.x | Drag & Drop |

### Backend
| Tehnologija | Verzija | Uloga |
|-------------|---------|-------|
| Express | 4.21.x | HTTP server |
| Prisma | 5.22.x | ORM |
| SQLite | via Prisma | Baza podataka |
| jsonwebtoken | 9.0.x | JWT autentifikacija |
| bcryptjs | 2.4.x | Hash lozinki |
| node-thermal-printer | 4.6.x | Termalni štampač |

### Desktop
| Tehnologija | Verzija | Uloga |
|-------------|---------|-------|
| Electron | 33.2.x | Desktop runtime |
| electron-vite | 2.3.x | Build tool |
| electron-builder | 25.1.x | Pakovanje (.exe) |
| electron-log | 5.4.x | File logging |
| TypeScript | 5.7.x | Tip sistem |

---

## 3. Struktura projekta

```
caffe-pasaz-management/
│
├── electron/                    # Electron main process
│   ├── main.ts                  # Entry point, BrowserWindow, IPC handleri
│   ├── preload.ts               # IPC bridge (contextIsolation)
│   └── backupService.ts         # SQLite backup/restore logika
│
├── server/                      # Express API server
│   ├── index.ts                 # App factory, montiranje ruta
│   ├── middleware/
│   │   ├── auth.ts              # requireAuth, requireAdmin middleware
│   │   ├── logger.ts            # Request logger
│   │   ├── errorHandler.ts      # Global error handler
│   │   └── checkActiveShift.ts  # Provera aktivne smene
│   ├── routes/
│   │   ├── auth.ts              # POST /auth/login, /auth/me
│   │   ├── categories.ts        # CRUD /categories
│   │   ├── products.ts          # CRUD /products
│   │   ├── inventory.ts         # GET /inventory, POST /inventory/adjust
│   │   ├── tables.ts            # CRUD /tables
│   │   ├── shifts.ts            # Upravljanje smenama
│   │   ├── bills.ts             # POS računi
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
│   ├── App.tsx                  # Router, rute, layout
│   ├── api/                     # Fetch wrapperi (1:1 sa server/routes)
│   │   ├── apiClient.ts         # Base fetch sa JWT headerom
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
│   │   ├── ui/                  # Generičke UI komponente
│   │   │   ├── DataTable.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   ├── Toaster.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   └── SkeletonLoader.tsx
│   │   ├── reports/             # Komponente izveštaja
│   │   │   ├── ReportSummaryCards.tsx
│   │   │   ├── TopProductsTable.tsx
│   │   │   └── ComparisonBadge.tsx
│   │   ├── ShiftGuard.tsx       # Blokira pristup bez aktivne smene
│   │   └── ErrorBoundary.tsx    # React error boundary
│   ├── context/
│   │   ├── AuthContext.tsx      # JWT auth state
│   │   ├── ToastContext.tsx     # Globalne notifikacije
│   │   └── ShiftContext.tsx     # Aktivna smena state
│   ├── hooks/
│   │   └── useKeyboardShortcuts.ts
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── CategoriesPage.tsx
│   │   ├── ProductsPage.tsx
│   │   ├── InventoryPage.tsx
│   │   ├── TablesPage.tsx
│   │   ├── BillPage.tsx         # POS ekran
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
│   │   ├── sr.json              # Srpski prevodi (default)
│   │   └── en.json              # Engleski prevodi
│   ├── types/
│   │   └── index.ts             # TypeScript interfejsi
│   └── utils/
│       ├── token.ts             # JWT čuvanje/čitanje (localStorage)
│       ├── exportPdf.ts         # pdfmake PDF export
│       └── exportExcel.ts       # exceljs Excel export
│
├── prisma/
│   ├── schema.prisma            # DB šema
│   ├── seed.ts                  # Demo podaci
│   └── dev.db                   # SQLite fajl (development)
│
├── build/
│   └── icon.ico                 # Ikonica aplikacije
│
├── docs/                        # Dokumentacija
├── electron-builder.yml         # Build konfiguracija
├── electron.vite.config.ts      # Vite konfiguracija
├── package.json
└── tsconfig.json
```

---

## 4. Baza podataka

### Šema i relacije

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

### Modeli

| Model | Opis | Ključna polja |
|-------|------|---------------|
| User | Korisnici sistema | username, password (bcrypt), role, active |
| Shift | Radna smena | userId, startedAt, endedAt, active |
| TableUnit | Sto u kafeu | label, zone, positionX/Y, isOccupied |
| Category | Kategorija proizvoda | nameSr, nameEn, sortOrder |
| Product | Artikal | nameSr, nameEn, price, stockQuantity, unit, normQuantity |
| Bill | Račun | tableId, shiftId, userId, status, totalAmount, discount |
| BillItem | Stavka računa | billId, productId, quantity, unitPrice, color |
| InventoryLog | Log magacina | productId, shiftId, changeQty, type, note |
| Setting | Podešavanja (k/v) | key, value |
| Salary | Isplata plate | userId, amount, paidById, note, paidAt |

### String enum vrednosti (SQLite ograničenje)

SQLite ne podržava native enum tipove u Prisma. Koriste se String polja sa validacijom na nivou servisa:

| Polje | Dozvoljene vrednosti |
|-------|---------------------|
| User.role | `"ADMIN"` \| `"WAITER"` |
| TableUnit.zone | `"INDOOR"` \| `"OUTDOOR"` |
| Bill.status | `"OPEN"` \| `"PAID"` \| `"CANCELLED"` |
| BillItem.color | `"WHITE"` \| `"BLACK"` |
| InventoryLog.type | `"PURCHASE"` \| `"SALE"` \| `"ADJUSTMENT"` \| `"WASTE"` |

---

## 5. API dokumentacija

Svi endpointi su pod baznom putanjom: `http://localhost:3001/api/v1/`

Autentifikacija: `Authorization: Bearer <JWT_TOKEN>`

### Auth

| Metoda | Putanja | Auth | Opis |
|--------|---------|------|------|
| POST | `/auth/login` | Ne | Prijava, vraća JWT token |
| GET | `/auth/me` | Da | Trenutni korisnik |

**POST /auth/login**
```json
// Request
{ "username": "admin", "password": "admin123" }

// Response 200
{ "token": "eyJ...", "user": { "id": 1, "username": "admin", "role": "ADMIN" } }
```

### Categories

| Metoda | Putanja | Auth | Opis |
|--------|---------|------|------|
| GET | `/categories` | Da | Lista svih aktivnih kategorija |
| POST | `/categories` | Admin | Nova kategorija |
| PUT | `/categories/:id` | Admin | Izmena kategorije |
| DELETE | `/categories/:id` | Admin | Deaktivacija |

### Products

| Metoda | Putanja | Auth | Opis |
|--------|---------|------|------|
| GET | `/products` | Da | Lista svih aktivnih proizvoda |
| GET | `/products?categoryId=1` | Da | Filter po kategoriji |
| POST | `/products` | Admin | Novi proizvod |
| PUT | `/products/:id` | Admin | Izmena |
| DELETE | `/products/:id` | Admin | Deaktivacija |

### Inventory

| Metoda | Putanja | Auth | Opis |
|--------|---------|------|------|
| GET | `/inventory` | Da | Trenutno stanje magacina |
| POST | `/inventory/adjust` | Admin | Ručna korekcija zalihe |
| POST | `/inventory/purchase` | Admin | Nabavka robe (ulaz) |

### Tables

| Metoda | Putanja | Auth | Opis |
|--------|---------|------|------|
| GET | `/tables` | Da | Lista aktivnih stolova |
| POST | `/tables` | Admin | Novi sto |
| PUT | `/tables/:id` | Admin | Izmena (pozicija, naziv) |
| DELETE | `/tables/:id` | Admin | Deaktivacija |

### Shifts

| Metoda | Putanja | Auth | Opis |
|--------|---------|------|------|
| GET | `/shifts/active` | Da | Aktivna smena |
| POST | `/shifts/start` | Da | Početak smene |
| GET | `/shifts/:id/summary` | Da | Izveštaj smene |
| GET | `/shifts/:id/inventory-summary` | Da | Magacin smene |
| POST | `/shifts/:id/inventory-adjust` | Da | Korekcija zalihe u smeni |
| POST | `/shifts/:id/end` | Da | Kraj smene |
| POST | `/shifts/:id/print-summary` | Da | Štampa sažetka smene |
| GET | `/shifts` | Admin | Istorija svih smena |

### Bills

| Metoda | Putanja | Auth | Opis |
|--------|---------|------|------|
| GET | `/bills` | Da | Aktivni (OPEN) računi |
| GET | `/bills/:id` | Da | Detalji računa |
| POST | `/bills` | Da | Novi račun (otvori sto) |
| POST | `/bills/:id/items` | Da | Dodaj stavku |
| PUT | `/bills/:id/items/:itemId` | Da | Izmeni stavku |
| DELETE | `/bills/:id/items/:itemId` | Da | Ukloni stavku |
| POST | `/bills/:id/pay` | Da | Naplati |
| POST | `/bills/:id/cancel` | Da | Otkaži |
| POST | `/bills/:id/transfer` | Da | Prebaci na drugi sto |
| POST | `/bills/:id/discount` | Da | Postavi popust |

### Settings

| Metoda | Putanja | Auth | Opis |
|--------|---------|------|------|
| GET | `/settings` | Da | Sva podešavanja (k/v mapa) |
| PUT | `/settings` | Admin | Bulk update podešavanja |

### Reports

| Metoda | Putanja | Auth | Opis |
|--------|---------|------|------|
| GET | `/reports/daily?date=2025-03-15` | Admin | Dnevni izveštaj |
| GET | `/reports/weekly?date=2025-03-15` | Admin | Nedeljni izveštaj |
| GET | `/reports/monthly?year=2025&month=3` | Admin | Mesečni izveštaj |
| GET | `/reports/custom?from=2025-03-01&to=2025-03-31` | Admin | Prilagođeni period |

### Dashboard

| Metoda | Putanja | Auth | Opis |
|--------|---------|------|------|
| GET | `/dashboard` | Admin | Admin statistike |

### Users

| Metoda | Putanja | Auth | Opis |
|--------|---------|------|------|
| GET | `/users` | Admin | Lista korisnika |
| POST | `/users` | Admin | Novi korisnik |
| PUT | `/users/:id` | Admin | Izmena |
| DELETE | `/users/:id` | Admin | Deaktivacija |
| POST | `/users/:id/reactivate` | Admin | Reaktivacija |

### Salaries

| Metoda | Putanja | Auth | Opis |
|--------|---------|------|------|
| GET | `/salaries` | Admin | Lista isplata (filter: userId, from, to) |
| POST | `/salaries` | Admin | Nova isplata |

---

## 6. Pokretanje razvojnog servera

```bash
# Instalacija zavisnosti
npm install

# Kreiranje baze i generisanje Prisma klijenta
npx prisma db push

# Popunjavanje demo podacima
tsx prisma/seed.ts

# Pokretanje (Electron + Express + React Vite)
npm run dev
```

Razvojni server pokreće:
- **Vite dev server** na `http://localhost:5173` (hot reload)
- **Express API** na `http://localhost:3001`
- **Electron** prozor koji učitava Vite URL

---

## 7. Kreiranje production build-a

```bash
# Build React + Express + Electron
npm run build

# Kreiranje .exe instalera (NSIS)
npm run dist

# Ili oboje odjednom:
npm run package
```

Output:
```
dist/
└── Kafic-App-Setup-1.0.0.exe    # NSIS installer
```

### Production baza podataka

U production modu, Electron automatski kreira bazu u:
```
%APPDATA%\Kafic App\kafic.db
```
(npr. `C:\Users\Marko\AppData\Roaming\Kafic App\kafic.db`)

Environment varijabla `DATABASE_URL` se postavlja na tu putanju pre pokretanja Express servera.

---

## 8. Dodavanje novog modula

Primer: dodavanje modula `Rezervacije` (Reservations).

### Korak 1 — Prisma šema

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

### Korak 2 — Service

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

### Korak 3 — Route

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

### Korak 4 — Mount u server/index.ts

```typescript
import { reservationsRouter } from './routes/reservations'
app.use('/api/v1/reservations', reservationsRouter)
```

### Korak 5 — API klijent

```typescript
// src/api/reservations.ts
import { apiFetch } from './apiClient'

export async function getReservations() {
  return apiFetch<Reservation[]>('/reservations')
}
```

### Korak 6 — React stranica + i18n + App.tsx

Dodajte stranicu u `src/pages/admin/ReservationsPage.tsx`, prevode u `sr.json`/`en.json`, i rutu u `App.tsx`.
