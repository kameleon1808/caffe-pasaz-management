# Dev Referenca — Kafić Pasaz Management

> Ovaj dokument se oslanja isključivo na softversku dokumentaciju (JSDoc komentare, TypeScript tipove i strukturu koda).
> Svi primeri su izvučeni direktno iz izvornog koda.

---

## Sadržaj

1. [Arhitektura](#arhitektura)
2. [API Endpointi](#api-endpointi)
3. [Server Middleware](#server-middleware)
4. [Server Servisi](#server-servisi)
5. [Baza podataka — Modeli](#baza-podataka--modeli)
6. [React Komponente](#react-komponente)
7. [Custom Hooks](#custom-hooks)
8. [Kontekst (Context)](#kontekst-context)
9. [Tipovi (TypeScript)](#tipovi-typescript)
10. [Internacionalizacija — Svi ključevi](#internacionalizacija--svi-ključevi)
11. [Upravljanje tokenima](#upravljanje-tokenima)
12. [Error Handling Pattern](#error-handling-pattern)
13. [Centralizovani API Klijent (Faza 8.1)](#centralizovani-api-klijent-faza-81)
14. [Backup Sistem (Faza 8.2)](#backup-sistem-faza-82)
15. [Logovanje — electron-log (Faza 8.2)](#logovanje--electron-log-faza-82)
16. [Keyboard Shortcuts (Faza 8.1)](#keyboard-shortcuts-faza-81)
17. [Skeleton Loaderi (Faza 8.1)](#skeleton-loaderi-faza-81)
18. [Empty State Komponenta (Faza 8.1)](#empty-state-komponenta-faza-81)

---

## Arhitektura

```
Electron Main Process
│
├── electron/main.ts         ← startuje Express server, kreira BrowserWindow, IPC handleri, auto-backup
├── electron/preload.ts      ← contextBridge: main ↔ renderer (backup API + logError)
├── electron/backupService.ts ← backup/restore SQLite baze, rotacija, konfiguracija foldera (Faza 8.2)
│
├── server/index.ts          ← createApp() + startServer() → port 3001
│   ├── server/lib/prisma.ts ← singleton PrismaClient (deli se između servisa)
│   ├── server/routes/       ← Express rute po resursu
│   │   ├── auth.ts          ← /api/v1/auth/*
│   │   ├── categories.ts    ← /api/v1/categories/*
│   │   ├── products.ts      ← /api/v1/products/*
│   │   ├── inventory.ts     ← /api/v1/inventory/*
│   │   ├── tables.ts        ← /api/v1/tables/*       (Faza 3)
│   │   ├── shifts.ts        ← /api/v1/shifts/*       (Faza 3, 6.1, 6.2, 6.3)
│   │   ├── bills.ts         ← /api/v1/bills/*        (Faza 4)
│   │   ├── settings.ts      ← /api/v1/settings/*     (Faza 5, 7.3)
│   │   ├── print.ts         ← /api/v1/print/*        (Faza 5)
│   │   ├── users.ts         ← /api/v1/users/*        (Faza 7.1)
│   │   ├── salaries.ts      ← /api/v1/salaries/*     (Faza 7.1)
│   │   ├── reports.ts       ← /api/v1/reports/*      (Faza 7.2)
│   │   └── dashboard.ts     ← /api/v1/dashboard      (Faza 7.4)
│   ├── server/lib/          ← singleton i infrastruktura
│   │   ├── prisma.ts        ← singleton PrismaClient
│   │   └── printerService.ts ← ESC/POS formatiranje i slanje       (Faza 5)
│   ├── server/middleware/   ← auth, errorHandler, logger, checkActiveShift
│   └── server/services/     ← poslovna logika
│       ├── authService.ts
│       ├── categoryService.ts
│       ├── productService.ts
│       ├── inventoryService.ts
│       ├── tableService.ts    ← CRUD za stolove + isOccupied status  (Faza 3)
│       ├── shiftService.ts    ← pokretanje/završetak/izveštaj smena   (Faza 3, 6.1–6.3)
│       ├── billService.ts     ← kreiranje/pregled/zatvaranje računa   (Faza 4)
│       ├── settingsService.ts ← čitanje/čuvanje Setting ključeva      (Faza 5, 7.3)
│       ├── userService.ts     ← CRUD korisnika + deaktivacija         (Faza 7.1)
│       ├── salaryService.ts   ← evidencija isplata plata              (Faza 7.1)
│       ├── reportService.ts   ← dnevni/nedeljni/mesečni/custom izveštaji (Faza 7.2)
│       └── dashboardService.ts ← live statistike za admin dashboard   (Faza 7.4)
│
└── prisma/schema.prisma     ← SQLite baza (prisma/dev.db)

Electron Renderer Process (Vite → React)
│
├── src/main.tsx             ← ReactDOM.createRoot()
├── src/App.tsx              ← BrowserRouter + ToastProvider + AuthProvider + Routes
├── src/context/
│   ├── AuthContext.tsx
│   ├── ToastContext.tsx
│   └── ShiftContext.tsx      ← stanje aktivne smene, startShift/endShift  (Faza 3)
├── src/hooks/
│   ├── useAuth.ts
│   ├── useToast.ts
│   ├── useShift.ts           ← pristup ShiftContext-u                      (Faza 3)
│   └── useKeyboardShortcuts.ts ← F5/Ctrl+R, Escape, Ctrl+P shortcuti     (Faza 8.1)
├── src/api/                 ← fetch klijenti → http://localhost:3001
│   ├── apiClient.ts          ← centralizovani klijent, tipizovane greške, retry (Faza 8.1)
│   ├── auth.ts
│   ├── categories.ts
│   ├── products.ts
│   ├── inventory.ts
│   ├── tables.ts             ← getTables, getTable, createTable, ...       (Faza 3)
│   ├── shifts.ts             ← startShift, endShift, getActiveShift,        (Faza 3, 6.1–6.3)
│   │                            getShiftSummary, getShiftInventorySummary,
│   │                            adjustShiftInventory, endShiftById, getShiftList,
│   │                            printShiftSummary
│   ├── bills.ts              ← createBill, fetchBill, payBill...           (Faza 4)
│   ├── settings.ts           ← fetchPrinterSettings, getSettings, updateSettings (Faza 5, 7.3)
│   ├── print.ts              ← printReceipt, printTestPage                 (Faza 5)
│   ├── users.ts              ← getUsers, createUser, updateUser, deactivateUser, reactivateUser (Faza 7.1)
│   ├── salaries.ts           ← getSalaries, createSalary                  (Faza 7.1)
│   ├── reports.ts            ← getDailyReport, getWeeklyReport, getMonthlyReport, getCustomReport (Faza 7.2)
│   ├── dashboard.ts          ← getDashboardStats                           (Faza 7.4)
│   └── backup.ts             ← createBackup, listBackups, restoreBackup, getBackupFolder (Faza 8.2)
├── src/components/
│   ├── Layout/              ← MainLayout, Sidebar, Header
│   ├── ProtectedRoute.tsx
│   ├── ShiftGuard.tsx        ← blokira /tables bez aktivne smene           (Faza 3)
│   ├── ErrorBoundary.tsx     ← hvata render greške, log u fajl, refresh UI (Faza 8.1)
│   ├── LanguageSwitcher.tsx
│   ├── reports/             ← deljive komponente za izveštaje (Faza 7.2)
│   │   ├── ReportSummaryCards.tsx ← 5 kartica prometa
│   │   ├── TopProductsTable.tsx   ← top 10 artikala tabela
│   │   └── ComparisonBadge.tsx    ← zeleni/crveni % poređenja
│   └── ui/                  ← biblioteka za ponovnu upotrebu
│       ├── Modal.tsx
│       ├── ConfirmDialog.tsx  ← Enter key confirm, loading state           (Faza 8.1)
│       ├── Toaster.tsx        ← slide-in animacija, progress bar, max 3   (Faza 8.1)
│       ├── Badge.tsx
│       ├── FormField.tsx
│       ├── DataTable.tsx
│       ├── SkeletonLoader.tsx ← TableSkeleton, CardSkeleton, FullscreenLoader (Faza 8.1)
│       └── EmptyState.tsx     ← default/search/report/error varijante     (Faza 8.1)
└── src/pages/
    ├── LoginPage.tsx
    ├── DashboardPage.tsx
    ├── PlaceholderPage.tsx
    ├── TablesPage.tsx         ← vizuelni prikaz stolova po zonama           (Faza 3)
    ├── BillPage.tsx           ← prikaz i zatvaranje računa                  (Faza 4)
    ├── ShiftSummaryPage.tsx   ← izveštaj smene: promet, prodaja, inventar,  (Faza 6.1–6.3)
    │                             korekcije, potvrda završetka
    └── admin/
        ├── CategoriesPage.tsx
        ├── ProductsPage.tsx
        ├── InventoryPage.tsx
        ├── PurchasePage.tsx
        ├── TableLayoutPage.tsx      ← admin editor rasporeda stolova       (Faza 3)
        ├── PrinterSettingsPage.tsx  ← konfiguracija POS štampača          (Faza 5)
        ├── ShiftsHistoryPage.tsx    ← istorija smena sa filterima         (Faza 6.3)
        ├── UsersPage.tsx            ← CRUD korisnika + deaktivacija        (Faza 7.1)
        ├── SalariesPage.tsx         ← evidencija isplata plata             (Faza 7.1)
        ├── SettingsPage.tsx         ← podešavanja kafića                   (Faza 7.3)
        ├── AdminDashboardPage.tsx   ← dashboard sa karticama i grafikonima (Faza 7.4)
        └── reports/
            ├── DailyReportPage.tsx   ← dnevni izveštaj sa date pickerom   (Faza 7.2)
            ├── WeeklyReportPage.tsx  ← nedeljni izveštaj + BarChart        (Faza 7.2)
            ├── MonthlyReportPage.tsx ← mesečni izveštaj + LineChart + Pie  (Faza 7.2)
            └── CustomReportPage.tsx  ← izveštaj za proizvoljni period      (Faza 7.2)
```

**Tok podataka / Data flow:**
```
Korisnik → React UI → src/api/*.ts → HTTP → Express → Prisma → SQLite
                                                     ↓
                                             JWT verifikacija
```

---

## API Endpointi

Bazni URL: `http://localhost:3001/api/v1`

Svi endpointi (osim `/auth/login` i `/health`) zahtevaju `Authorization: Bearer <token>` header.
Endpointi označeni sa **[ADMIN]** dodatno zahtevaju ulogu `ADMIN`.

---

### `POST /auth/login`

**Izvor:** `server/routes/auth.ts:41`

Prijavljuje korisnika. Ne zahteva autentifikaciju.

| Parametar | Tip    | Obavezno | Opis             |
|-----------|--------|----------|------------------|
| username  | string | da       | Max 50 karaktera |
| password  | string | da       | Plain text       |

**Zahtev:**
```json
{ "username": "admin", "password": "admin123" }
```

**Uspešan odgovor `200`:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGci...",
    "user": { "id": 1, "username": "admin", "fullName": "Administrator", "role": "ADMIN" }
  }
}
```

**Kodovi grešaka:**

| Kod                   | HTTP | Uzrok                          |
|-----------------------|------|--------------------------------|
| `INVALID_CREDENTIALS` | 401  | Pogrešan username ili password |
| `ACCOUNT_INACTIVE`    | 403  | Nalog je deaktiviran           |
| `VALIDATION_ERROR`    | 400  | Prazno polje                   |

---

### `GET /auth/me`

**Izvor:** `server/routes/auth.ts:89` | Zahteva: `requireAuth`

Vraća profil ulogovanog korisnika.

**Header:** `Authorization: Bearer <token>`

**Uspešan odgovor `200`:**
```json
{
  "success": true,
  "data": {
    "id": 1, "username": "admin", "fullName": "Administrator",
    "role": "ADMIN", "active": true, "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

### `POST /auth/logout`

**Izvor:** `server/routes/auth.ts:114` | Zahteva: `requireAuth`

Odjavljuje korisnika (server-side stateless — frontend briše token).

---

### `GET /health`

**Izvor:** `server/index.ts`

Health check bez autentifikacije.

```json
{ "status": "ok", "service": "Kafić Pasaz API", "version": "1.0.0", "timestamp": "..." }
```

---

### `GET /categories` **[ADMIN]**

**Izvor:** `server/routes/categories.ts`

Vraća listu kategorija sa brojem aktivnih proizvoda.

**Query parametri:**
- `showInactive=true` — uključuje neaktivne kategorije (default: `false`)

**Uspešan odgovor `200`:**
```json
{
  "success": true,
  "data": [
    { "id": 1, "nameSr": "Kafa", "nameEn": "Coffee", "sortOrder": 1, "active": true, "_count": { "products": 4 } }
  ]
}
```

---

### `POST /categories` **[ADMIN]**

Kreira novu kategoriju.

| Polje     | Tip    | Obavezno | Opis                                |
|-----------|--------|----------|-------------------------------------|
| nameSr    | string | da       | Naziv na srpskom                    |
| nameEn    | string | da       | Naziv na engleskom                  |
| sortOrder | number | ne       | Redosled prikaza (default: auto)    |

---

### `PUT /categories/:id` **[ADMIN]**

Menja kategoriju. Sva polja su opciona. Polje `active` može biti `false` za deaktivaciju.

---

### `DELETE /categories/:id` **[ADMIN]**

Deaktivira kategoriju (soft delete).

**Kodovi grešaka:**

| Kod                     | HTTP | Uzrok                                  |
|-------------------------|------|----------------------------------------|
| `CATEGORY_NOT_FOUND`    | 404  | Kategorija ne postoji                  |
| `CATEGORY_HAS_PRODUCTS` | 409  | Postoje aktivni proizvodi u kategoriji |

---

### `PATCH /categories/reorder` **[ADMIN]**

Menja redosled kategorija atomično. Mora biti registrovan **pre** `/:id` rute.

**Telo zahteva:**
```json
{
  "items": [
    { "id": 3, "sortOrder": 1 },
    { "id": 1, "sortOrder": 2 }
  ]
}
```

---

### `GET /products` **[ADMIN]**

**Izvor:** `server/routes/products.ts`

Vraća listu proizvoda sa ugnježdenom kategorijom.

**Query parametri:**
- `categoryId=1` — filtrira po kategoriji
- `search=kafa` — pretraga po `nameSr` ili `nameEn` (case-insensitive)
- `showInactive=true` — uključuje neaktivne (default: `false`)

**Uspešan odgovor `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1, "categoryId": 1, "nameSr": "Espreso", "nameEn": "Espresso",
      "price": 150, "stockQuantity": 100, "unit": "kom", "active": true,
      "category": { "id": 1, "nameSr": "Kafa", "nameEn": "Coffee", "sortOrder": 1, "active": true }
    }
  ]
}
```

---

### `POST /products` **[ADMIN]**

Kreira novi proizvod.

| Polje         | Tip    | Obavezno | Validacija                              |
|---------------|--------|----------|-----------------------------------------|
| categoryId    | number | da       | Mora ukazivati na aktivnu kategoriju    |
| nameSr        | string | da       | —                                       |
| nameEn        | string | da       | —                                       |
| price         | number | da       | Mora biti > 0                           |
| stockQuantity | number | da       | Mora biti ≥ 0                           |
| unit          | string | da       | Jedan od: `kom`, `lit`, `dcl`, `flaša`  |

**Kodovi grešaka:**

| Kod               | HTTP | Uzrok                           |
|-------------------|------|---------------------------------|
| `INVALID_PRICE`   | 422  | Cena ≤ 0                        |
| `INVALID_UNIT`    | 422  | Nedozvoljena jedinica mere      |
| `INACTIVE_CATEGORY` | 422 | Kategorija nije aktivna        |

---

### `PUT /products/:id` **[ADMIN]**

Menja proizvod. Sva polja su opciona. Polje `active` može biti `false` za deaktivaciju.

---

### `DELETE /products/:id` **[ADMIN]**

Deaktivira proizvod (soft delete).

**Kodovi grešaka:**

| Kod                  | HTTP | Uzrok                  |
|----------------------|------|------------------------|
| `PRODUCT_NOT_FOUND`  | 404  | Proizvod ne postoji    |

---

### `GET /inventory` **[ADMIN]**

**Izvor:** `server/routes/inventory.ts`

Vraća pregled stanja magacina. Svaki element sadrži izračunato polje `isLowStock`.

**Query parametri:**
- `categoryId=1` — filtrira po kategoriji

**Uspešan odgovor `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1, "nameSr": "Espreso", "stockQuantity": 3, "unit": "kom",
      "isLowStock": true,
      "category": { "id": 1, "nameSr": "Kafa" }
    }
  ]
}
```

`isLowStock = true` kada `stockQuantity ≤ 5` (`LOW_STOCK_THRESHOLD`).

---

### `POST /inventory/purchase` **[ADMIN]**

Evidentira grupni prijem robe. Izvršava se u jednoj Prisma transakciji — kreira `InventoryLog` za svaku stavku i ažurira `stockQuantity`.

**Telo zahteva:**
```json
{
  "items": [
    { "productId": 1, "quantity": 50, "note": "Dostava" },
    { "productId": 2, "quantity": 20 }
  ],
  "shiftId": 5
}
```

- `shiftId` — opciono, vezuje prijem za smenu
- `note` po stavci — opciono

**Kodovi grešaka:**

| Kod               | HTTP | Uzrok                              |
|-------------------|----- |------------------------------------|
| `EMPTY_PURCHASE`  | 422  | Lista stavki je prazna             |
| `INVALID_QUANTITY`| 422  | Količina ≤ 0                       |
| `PRODUCT_NOT_FOUND` | 404 | Nevažeći `productId`              |

---

### `POST /inventory/adjust` **[ADMIN]**

Ručna korekcija stanja za jedan proizvod.

**Telo zahteva:**
```json
{
  "productId": 1,
  "changeQty": -3,
  "note": "Kvar — bačeno"
}
```

**Pravila:**
- `note` je obavezno
- `stockQuantity + changeQty` ne sme biti negativno

**Kodovi grešaka:**

| Kod              | HTTP | Uzrok                                    |
|------------------|------|------------------------------------------|
| `NOTE_REQUIRED`  | 422  | Napomena nije uneta                      |
| `NEGATIVE_STOCK` | 422  | Korekcija bi dovela do negativnog stanja |

---

### `GET /inventory/:productId/history` **[ADMIN]**

Vraća hronološku istoriju promena za jedan proizvod (zadnjih 100 zapisa, sortirani silazno po datumu).

**Uspešan odgovor `200`:**
```json
{
  "success": true,
  "data": [
    { "id": 10, "type": "PURCHASE", "changeQty": 50, "note": "Dostava", "createdAt": "2026-03-27T10:00:00.000Z" }
  ]
}
```

### `GET /tables`

**Izvor:** `server/routes/tables.ts` | Zahteva: `requireAuth`

Vraća sve aktivne stolove sa statusom (`isOccupied`, `openBillId`, `openBillTotal`).

**Uspešan odgovor `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1, "label": "Sto U1", "zone": "INDOOR",
      "positionX": 100, "positionY": 150, "isOccupied": false, "active": true,
      "openBillId": null, "openBillTotal": 0
    }
  ]
}
```

---

### `POST /tables` **[ADMIN]**

Kreira novi sto.

| Polje      | Tip    | Obavezno | Opis                         |
|------------|--------|----------|------------------------------|
| label      | string | da       | Naziv stola (jedinstven)     |
| zone       | string | da       | `INDOOR` \| `OUTDOOR`       |
| positionX  | number | ne       | X koordinata na mapi         |
| positionY  | number | ne       | Y koordinata na mapi         |

---

### `PUT /tables/:id` **[ADMIN]**

Menja sto. Podržava `label`, `zone`, `positionX`, `positionY`, `active`.

---

### `DELETE /tables/:id` **[ADMIN]**

Soft delete stola (active = false). Nije moguće ako je sto zauzet.

---

### `PATCH /tables/positions` **[ADMIN]**

Atomično menja pozicije više stolova odjednom (drag-and-drop editor).

**Telo zahteva:**
```json
{ "positions": [{ "id": 1, "positionX": 120, "positionY": 200 }] }
```

---

### `GET /shifts/active`

**Izvor:** `server/routes/shifts.ts` | Zahteva: `requireAuth`

Vraća aktivnu smenu trenutnog korisnika ili `null`.

**Uspešan odgovor `200`:**
```json
{
  "success": true,
  "data": {
    "id": 5, "userId": 2, "startedAt": "2026-03-28T08:00:00.000Z",
    "endedAt": null, "totalWhite": 0, "totalBlack": 0, "totalRevenue": 0
  }
}
```

---

### `POST /shifts/start`

Pokreće novu smenu za trenutnog korisnika.

**Kodovi grešaka:**

| Kod                   | HTTP | Uzrok                       |
|-----------------------|------|-----------------------------|
| `SHIFT_ALREADY_ACTIVE`| 409  | Korisnik već ima aktivnu smenu |

---

### `POST /shifts/end`

Završava aktivnu smenu trenutnog korisnika.

**Kodovi grešaka:**

| Kod               | HTTP | Uzrok                          |
|-------------------|------|--------------------------------|
| `NO_ACTIVE_SHIFT` | 404  | Nema aktivne smene             |

---

### `GET /shifts/:id/summary` (Faza 6.1)

**Izvor:** `server/routes/shifts.ts` | Zahteva: `requireAuth`

Vraća sumarni izveštaj smene — promet i prodaja po artiklima. Ne zatvara smenu.

**Uspešan odgovor `200`:**
```json
{
  "success": true,
  "data": {
    "openBillsCount": 0,
    "revenue": { "total": 15000, "white": 9000, "black": 6000, "paidCount": 12, "cancelledCount": 1, "averageBill": 1250 },
    "salesByProduct": [
      { "productId": 1, "nameSr": "Espresso", "nameEn": "Espresso", "categorySr": "Kafa", "categoryEn": "Coffee", "soldTotal": 45, "soldWhite": 30, "soldBlack": 15, "totalAmount": 6750 }
    ]
  }
}
```

---

### `GET /shifts/:id/inventory-summary` (Faza 6.2)

**Izvor:** `server/routes/shifts.ts` | Zahteva: `requireAuth`

Vraća stanje magacina za datu smenu — retroaktivno izračunato stanje na početku, prodato, nabavljeno, korekcije i trenutno stanje.

**Uspešan odgovor `200`:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "productId": 1, "nameSr": "Espresso", "nameEn": "Espresso", "unit": "kom",
        "categorySr": "Kafa", "categoryEn": "Coffee",
        "startStock": 100, "sold": 45, "purchased": 0, "adjusted": 0, "currentStock": 55
      }
    ],
    "minStockThreshold": 5
  }
}
```

Formula: `startStock = currentStock + sold - purchased - adjusted`

---

### `POST /shifts/:id/inventory-adjust` (Faza 6.2)

**Izvor:** `server/routes/shifts.ts` | Zahteva: `requireAuth`

Ručna korekcija inventara u kontekstu smene.

| Polje     | Tip    | Obavezno | Opis                          |
|-----------|--------|----------|-------------------------------|
| productId | number | da       | ID proizvoda                  |
| changeQty | number | da       | Promena (+/-), nije 0         |
| type      | string | da       | `"WASTE"` ili `"ADJUSTMENT"`  |
| note      | string | da       | Razlog korekcije              |

**Razlika tipova:**
- `WASTE` — fizički gubitak (prosipanje, lom, kvar)
- `ADJUSTMENT` — ispravka greške u evidenciji (popis, pogrešan unos)

**Kodovi grešaka:**

| Kod              | HTTP | Uzrok                             |
|------------------|------|-----------------------------------|
| `NOTE_REQUIRED`  | 400  | Napomena je prazna                |
| `NEGATIVE_STOCK` | 400  | Korekcija bi dala negativno stanje|
| `INVALID_TYPE`   | 400  | Tip nije WASTE niti ADJUSTMENT    |

---

### `POST /shifts/:id/end` (Faza 6.3)

**Izvor:** `server/routes/shifts.ts` | Zahteva: `requireAuth`

Potvrđuje i završava smenu po ID-u. Konobar može završiti samo svoju smenu; admin može završiti bilo koju.

**Zahtev:**
```json
{ "confirm": true }
```

**Kodovi grešaka:**

| Kod                    | HTTP | Uzrok                               |
|------------------------|------|-------------------------------------|
| `CONFIRM_REQUIRED`     | 400  | `confirm` nije `true`               |
| `FORBIDDEN`            | 403  | Smena ne pripada korisniku          |
| `SHIFT_ALREADY_ENDED`  | 409  | Smena je već završena               |
| `SHIFT_HAS_OPEN_BILLS` | 409  | Postoje otvoreni računi             |

---

### `POST /shifts/:id/print-summary` (Faza 6.3)

**Izvor:** `server/routes/shifts.ts` | Zahteva: `requireAuth`

Štampa sumarni izveštaj smene na POS štampaču. Nema tela zahteva.

---

### `GET /shifts` **[ADMIN]** (Faza 6.3)

**Izvor:** `server/routes/shifts.ts` | Zahteva: `requireAdmin`

Paginirana lista svih smena sa opcionim filterima.

| Query param | Tip    | Default | Opis                              |
|-------------|--------|---------|-----------------------------------|
| userId      | number | —       | Filter po korisniku               |
| dateFrom    | string | —       | Od datuma (`YYYY-MM-DD`)          |
| dateTo      | string | —       | Do datuma (`YYYY-MM-DD`)          |
| page        | number | 1       | Broj stranice                     |
| limit       | number | 20      | Broj po strani                    |

**Uspešan odgovor `200`:**
```json
{
  "success": true,
  "data": {
    "shifts": [
      {
        "id": 5, "userId": 2, "startedAt": "2026-03-28T08:00:00Z", "endedAt": "2026-03-28T16:00:00Z",
        "totalRevenue": 15000, "totalWhite": 9000, "totalBlack": 6000,
        "user": { "id": 2, "fullName": "Marko Konobar", "username": "marko" },
        "paidBillsCount": 12
      }
    ],
    "total": 45, "page": 1, "limit": 20
  }
}
```

---

### `GET /bills/table/:tableId`

**Izvor:** `server/routes/bills.ts` | Zahteva: `requireAuth`

Vraća otvoreni račun za dati sto, ili 404 ako nema.

---

### `GET /bills/:id`

Vraća račun sa svim stavkama.

---

### `POST /bills`

Kreira novi račun za sto. Sto mora biti slobodan, korisnik mora imati aktivnu smenu.

| Polje   | Tip    | Obavezno |
|---------|--------|----------|
| tableId | number | da       |

**Kodovi grešaka:**

| Kod                      | HTTP | Uzrok                          |
|--------------------------|------|--------------------------------|
| `TABLE_ALREADY_OCCUPIED` | 409  | Sto je zauzet                  |
| `NO_ACTIVE_SHIFT`        | 403  | Nema aktivne smene             |
| `TABLE_NOT_FOUND`        | 404  | Sto ne postoji                 |

---

### `POST /bills/:id/items`

Dodaje stavku na račun. Ako proizvod već postoji na računu, povećava količinu.

| Polje     | Tip    | Obavezno | Opis                     |
|-----------|--------|----------|--------------------------|
| productId | number | da       | ID proizvoda             |
| color     | string | ne       | `WHITE` \| `BLACK` (default: WHITE) |

---

### `PUT /bills/:id/items/:itemId`

Menja stavku: `quantity`, `unitPrice`, `discount` (0–100%), `color`.

---

### `DELETE /bills/:id/items/:itemId`

Uklanja stavku sa računa.

---

### `PUT /bills/:id/discount`

Postavlja popust na nivou računa (0–100%).

| Polje           | Tip    |
|-----------------|--------|
| discountPercent | number |

---

### `PUT /bills/:id/transfer`

Prebacuje račun na drugi slobodan sto.

| Polje   | Tip    |
|---------|--------|
| tableId | number |

---

### `POST /bills/:id/pay`

Naplaćuje račun (Prisma transakcija):
- `Bill.status = PAID`, `paidAt = now()`
- Za svaku stavku: `Product.stockQuantity -= qty × normQuantity`
- Kreira `InventoryLog` (type=`SALE`) za svaku stavku
- `Shift.totalWhite/Black/Revenue += bill.*Total`
- `TableUnit.isOccupied = false`

---

### `POST /bills/:id/cancel`

Otkazuje račun. Zalihe se ne menjaju.

| Polje  | Tip    | Obavezno |
|--------|--------|----------|
| reason | string | da       |

---

### `GET /settings/printer`

**Izvor:** `server/routes/settings.ts` | Zahteva: `requireAuth`

Vraća sva podešavanja štampača i kafea iz `Setting` tabele.

**Uspešan odgovor `200`:**
```json
{
  "printer_type": "network",
  "printer_path": "192.168.1.100",
  "printer_port": "9100",
  "printer_width": "48",
  "cafe_name": "Kafić Pasaz",
  "cafe_address": "Ulica 1, Beograd",
  "cafe_pib": "123456789"
}
```

---

### `PUT /settings/printer` **[ADMIN]**

**Izvor:** `server/routes/settings.ts` | Zahteva: `requireAuth`, `requireAdmin`

Čuva podešavanja štampača (upsert po ključu u `Setting` tabeli).

**Body:** `Partial<PrinterSettings>` — sva polja su opciona.

**Kodovi grešaka:**

| Poruka | Uzrok |
|--------|-------|
| `Nevažeći tip štampača` | `printer_type` nije `usb`/`network`/`disabled` |
| `Nevažeća širina` | `printer_width` nije `48` ili `80` |
| `Nevažeći port` | Port nije broj 1–65535 |

---

### `POST /print/receipt/:billId`

**Izvor:** `server/routes/print.ts` | Zahteva: `requireAuth`

Štampa račun na POS štampaču. Koristi se pri naplati (automatski) i za ponovnu štampu.

**Uspešan odgovor `200`:**
```json
{ "success": true, "message": "Račun je odštampan / Receipt printed" }
```

**Greška `503` (štampač nedostupan):**
```json
{ "error": "Štampač nije dostupan / Printer not available", "code": "PRINTER_ERROR" }
```

| Kod                | Uzrok                                         |
|--------------------|-----------------------------------------------|
| `PRINTER_DISABLED` | `printer_type = disabled` u podešavanjima     |
| `PRINTER_ERROR`    | Štampač nije dostupan / greška konekcije      |

> **Napomena:** Ovaj endpoint vraća `503` umesto da prosledi grešku `errorHandler`-u — naplata mora proći čak i ako štampač nije dostupan.

---

### `POST /print/test`

**Izvor:** `server/routes/print.ts` | Zahteva: `requireAuth`

Štampa testnu stranicu za proveru konekcije. Isti format greške kao `/print/receipt`.

---

### `GET /settings` (Faza 7.3)

**Izvor:** `server/routes/settings.ts` | Zahteva: `requireAuth`

Vraća sva podešavanja kafića i štampača kao `{ key: value }` objekat.

**Uspešan odgovor `200`:**
```json
{
  "cafe_name": "Kafić Pasaz",
  "cafe_address": "Ulica 1, Beograd",
  "cafe_pib": "123456789",
  "cafe_phone": "011/123-456",
  "min_stock_threshold": "5",
  "currency": "RSD"
}
```

---

### `PUT /settings` **[ADMIN]** (Faza 7.3)

**Izvor:** `server/routes/settings.ts` | Zahteva: `requireAuth`, `requireAdmin`

Bulk update podešavanja kafića.

**Telo zahteva:**
```json
{
  "settings": {
    "cafe_name": "Kafić Pasaz",
    "cafe_address": "Ulica 1, Beograd",
    "min_stock_threshold": "5",
    "currency": "RSD"
  }
}
```

---

### `GET /users` **[ADMIN]** (Faza 7.1)

**Izvor:** `server/routes/users.ts` | Zahteva: `requireAuth`, `requireAdmin`

Vraća listu svih korisnika (bez lozinke).

**Uspešan odgovor `200`:**
```json
[
  {
    "id": 1, "fullName": "Administrator", "username": "admin",
    "role": "ADMIN", "active": true, "createdAt": "2026-01-01T00:00:00.000Z"
  }
]
```

---

### `GET /users/:id` **[ADMIN]** (Faza 7.1)

Vraća jednog korisnika po ID-u.

---

### `POST /users` **[ADMIN]** (Faza 7.1)

Kreira novi korisnički nalog.

| Polje    | Tip    | Obavezno | Validacija                    |
|----------|--------|----------|-------------------------------|
| fullName | string | da       | Neprazan                      |
| username | string | da       | Jedinstven u bazi             |
| password | string | da       | Min 6 karaktera               |
| role     | string | da       | `"ADMIN"` \| `"WAITER"`      |

**Kodovi grešaka:**

| Kod                  | HTTP | Uzrok                        |
|----------------------|------|------------------------------|
| `USERNAME_TAKEN`     | 409  | Username već postoji         |
| `INVALID_ROLE`       | 422  | Rola nije ADMIN niti WAITER  |
| `PASSWORD_TOO_SHORT` | 422  | Lozinka kraća od 6 karaktera |

---

### `PUT /users/:id` **[ADMIN]** (Faza 7.1)

Menja ime, username ili lozinku korisnika. Sva polja su opciona.

| Polje    | Tip    | Obavezno | Opis                                        |
|----------|--------|----------|---------------------------------------------|
| fullName | string | ne       | Novo ime                                    |
| username | string | ne       | Novi username (jedinstven)                  |
| password | string | ne       | Nova lozinka (min 6 kar.) — hashuje se       |

---

### `DELETE /users/:id` **[ADMIN]** (Faza 7.1)

Deaktivira korisnika (soft delete: `active = false`). Ne briše iz baze.

**Kodovi grešaka:**

| Kod                 | HTTP | Uzrok                                   |
|---------------------|------|-----------------------------------------|
| `SELF_DEACTIVATION` | 403  | Admin pokušava da deaktivira sopstveni nalog |
| `USER_HAS_ACTIVE_SHIFT` | 409 | Korisnik ima aktivnu smenu             |

---

### `PUT /users/:id/reactivate` **[ADMIN]** (Faza 7.1)

Reaktivira deaktiviranog korisnika (`active = true`).

---

### `GET /salaries` **[ADMIN]** (Faza 7.1)

**Izvor:** `server/routes/salaries.ts` | Zahteva: `requireAuth`, `requireAdmin`

Lista isplata plata sa filterima.

| Query param | Tip    | Opis                       |
|-------------|--------|----------------------------|
| userId      | number | Filter po korisniku        |
| dateFrom    | string | Od datuma (`YYYY-MM-DD`)   |
| dateTo      | string | Do datuma (`YYYY-MM-DD`)   |

**Uspešan odgovor `200`:**
```json
[
  {
    "id": 1, "userId": 2, "amount": 50000, "note": "Plata za mart",
    "paidAt": "2026-03-28T10:00:00.000Z", "paidById": 1,
    "user": { "id": 2, "fullName": "Marko Konobar", "username": "marko" },
    "paidBy": { "id": 1, "fullName": "Administrator", "username": "admin" }
  }
]
```

---

### `POST /salaries` **[ADMIN]** (Faza 7.1)

Evidentira isplatu plate.

| Polje  | Tip    | Obavezno | Validacija    |
|--------|--------|----------|---------------|
| userId | number | da       | Mora postojati|
| amount | number | da       | Mora biti > 0 |
| note   | string | ne       | Komentar      |
| paidAt | string | ne       | ISO datum, default: sada |

---

### `GET /reports/daily` **[ADMIN]** (Faza 7.2)

**Izvor:** `server/routes/reports.ts` | Zahteva: `requireAuth`, `requireAdmin`

| Query param | Tip    | Default | Opis                    |
|-------------|--------|---------|-------------------------|
| date        | string | danas   | Format `YYYY-MM-DD`     |

**Uspešan odgovor `200`:**
```json
{
  "summary": { "total": 15000, "white": 9000, "black": 6000, "billCount": 12, "avgBill": 1250 },
  "topProducts": [{ "productId": 1, "nameSr": "Espresso", "nameEn": "Espresso", "quantity": 45, "amount": 6750 }],
  "revenueByDay": [{ "date": "2026-03-28", "total": 15000, "white": 9000, "black": 6000 }],
  "revenueByWaiter": [{ "userId": 2, "fullName": "Marko", "shiftStart": "...", "shiftEnd": "...", "total": 15000, "white": 9000, "black": 6000, "billCount": 12 }],
  "categoryBreakdown": [{ "categoryId": 1, "nameSr": "Kafa", "nameEn": "Coffee", "total": 8000 }],
  "comparison": { "previousTotal": 13000, "changePercent": 15.38 }
}
```

---

### `GET /reports/weekly` **[ADMIN]** (Faza 7.2)

| Query param | Tip    | Default         | Opis                         |
|-------------|--------|-----------------|------------------------------|
| weekStart   | string | trenutni pon.   | Format `YYYY-MM-DD` (ponedeljak) |

Isti format odgovora kao `/reports/daily`. `revenueByDay` sadrži 7 unosa (pon–ned).

---

### `GET /reports/monthly` **[ADMIN]** (Faza 7.2)

| Query param | Tip    | Default        | Opis               |
|-------------|--------|----------------|--------------------|
| month       | string | trenutni mesec | Format `YYYY-MM`   |

`revenueByDay` sadrži unos za svaki dan u mesecu (uključujući dane bez prometa).

---

### `GET /reports/custom` **[ADMIN]** (Faza 7.2)

| Query param | Tip    | Obavezno | Opis                  |
|-------------|--------|----------|-----------------------|
| dateFrom    | string | da       | Format `YYYY-MM-DD`   |
| dateTo      | string | da       | Format `YYYY-MM-DD`   |

---

### `GET /dashboard` **[ADMIN]** (Faza 7.4)

**Izvor:** `server/routes/dashboard.ts` | Zahteva: `requireAuth`, `requireAdmin`

Vraća live statistike za admin dashboard. Sve Prisma upite izvršava paralelno (`Promise.all`).

**Uspešan odgovor `200`:**
```json
{
  "today": { "revenue": 15000, "revenueYesterday": 13000, "changePercent": 15.38, "billCount": 12, "avgBill": 1250 },
  "monthToDate": { "revenue": 180000 },
  "last7Days": [
    { "date": "2026-03-22", "total": 12000, "white": 7000, "black": 5000 }
  ],
  "topProducts": [
    { "nameSr": "Espresso", "nameEn": "Espresso", "quantity": 45 }
  ],
  "whiteBlackRatio": { "white": 120000, "black": 60000 },
  "categoryBreakdown": [
    { "nameSr": "Kafa", "nameEn": "Coffee", "total": 95000 }
  ]
}
```

**Napomena:** `last7Days` uvek vraća tačno 7 unosa, uključujući dane sa nultim prometom.

---

## Server Middleware

### `requireAuth`

**Izvor:** `server/middleware/auth.ts:42`

```typescript
export function requireAuth(req: Request, _res: Response, next: NextFunction): void
```

Čita `Authorization: Bearer <token>` header, verifikuje JWT, popunjava `req.user: JwtPayload`.

Baca `AppError` sa kodom `NO_TOKEN` (401) ako token nedostaje.

### `requireAdmin`

**Izvor:** `server/middleware/auth.ts:84`

```typescript
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void
```

Mora se koristiti **posle** `requireAuth`. Baca `AppError` sa kodom `FORBIDDEN` (403) ako uloga nije `ADMIN`.

### `errorHandler`

**Izvor:** `server/middleware/errorHandler.ts:66`

Centralni Express error handler — mora biti **poslednji** middleware.

| Tip greške          | HTTP             | Ponašanje                              |
|---------------------|------------------|----------------------------------------|
| `AppError`          | `statusCode` polja | Vraća `code` + `message`            |
| Prisma greška       | 500              | Maskira detalje, vraća `DATABASE_ERROR` |
| `JsonWebTokenError` | 401              | Vraća `INVALID_TOKEN`                  |
| `TokenExpiredError` | 401              | Vraća `TOKEN_EXPIRED`                  |
| Ostalo              | 500              | U dev modu vraća `err.message`         |

**Format svih grešaka:**
```json
{ "success": false, "error": { "code": "KOD_GRESKE", "message": "Opis" } }
```

### `requestLogger`

**Izvor:** `server/middleware/logger.ts:20`

Loguje svaki zahtev u konzolu: `[API] POST 200 /api/v1/auth/login — 45ms`

### `checkActiveShift`

**Izvor:** `server/middleware/checkActiveShift.ts`

Verifikuje da korisnik ima aktivnu smenu. Koristi se na endpointima koji zahtevaju aktivnu smenu pre akcije (npr. kreiranje računa). Baca `AppError` sa kodom `NO_ACTIVE_SHIFT` (403) ako smena nije aktivna.

---

## Server Servisi

### `loginUser(username, password)`

**Izvor:** `server/services/authService.ts:57`

```typescript
export async function loginUser(username: string, password: string): Promise<LoginResponse>
```

1. Traži korisnika u bazi (`prisma.user.findUnique`)
2. Proverava `active` flag
3. Poredi lozinku sa bcrypt hashom (salt rounds: 12)
4. Generiše JWT token (expiry: `JWT_EXPIRES_IN` iz `.env`, default: `8h`)
5. Vraća token + user data

### `getUserProfile(userId)`

**Izvor:** `server/services/authService.ts:129`

```typescript
export async function getUserProfile(userId: number): Promise<UserProfile>
```

Čita profil korisnika iz baze. Baca `AppError` `USER_NOT_FOUND` (404) ako ne postoji.

---

### `getCategories(onlyActive?)`

**Izvor:** `server/services/categoryService.ts`

```typescript
export async function getCategories(onlyActive?: boolean): Promise<CategoryWithCount[]>
```

Vraća kategorije uređene po `sortOrder`, sa brojem aktivnih proizvoda u `_count.products`.

### `createCategory(data)`

```typescript
export async function createCategory(data: { nameSr: string; nameEn: string; sortOrder?: number }): Promise<Category>
```

### `updateCategory(id, data)`

```typescript
export async function updateCategory(id: number, data: Partial<{ nameSr, nameEn, sortOrder, active }>): Promise<Category>
```

### `deleteCategory(id)`

```typescript
export async function deleteCategory(id: number): Promise<void>
```

Pre brisanja proverava aktivne proizvode — baca `CATEGORY_HAS_PRODUCTS` (409) ako postoje.

### `reorderCategories(items)`

```typescript
export async function reorderCategories(items: { id: number; sortOrder: number }[]): Promise<void>
```

Izvršava paralelne Prisma update pozive za sve stavke.

---

### `getProducts(filters)`

**Izvor:** `server/services/productService.ts`

```typescript
export async function getProducts(filters: {
  categoryId?: number
  search?: string
  showInactive?: boolean
}): Promise<Product[]>
```

`search` pretražuje i `nameSr` i `nameEn` (case-insensitive, `contains` mode).

### `createProduct(data)` / `updateProduct(id, data)` / `deleteProduct(id)`

```typescript
export async function createProduct(data: CreateProductPayload): Promise<Product>
export async function updateProduct(id: number, data: Partial<CreateProductPayload & { active: boolean }>): Promise<Product>
export async function deleteProduct(id: number): Promise<void>
```

**Dozvoljene jedinice:** `['kom', 'lit', 'dcl', 'flaša']` (konstanta `ALLOWED_UNITS`)

---

### `getInventory(categoryId?)`

**Izvor:** `server/services/inventoryService.ts`

```typescript
export async function getInventory(categoryId?: number): Promise<InventoryItem[]>
```

Svaki element proširuje `Product` sa `category: Category` i `isLowStock: boolean`.
Prag: `LOW_STOCK_THRESHOLD = 5`.

### `processPurchase(items, shiftId?)`

```typescript
export async function processPurchase(items: PurchaseItem[], shiftId?: number): Promise<void>
```

Izvršava se u `prisma.$transaction` — atomično kreira `InventoryLog` zapise i ažurira `stockQuantity`.

### `adjustStock(data)`

```typescript
export async function adjustStock(data: { productId: number; changeQty: number; note: string }): Promise<void>
```

Validira da stanje neće biti negativno pre upisa. Kreira `InventoryLog` sa tipom `ADJUSTMENT`.

### `getProductHistory(productId, limit?)`

```typescript
export async function getProductHistory(productId: number, limit?: number): Promise<InventoryLog[]>
```

Default limit: 100. Sortirano silazno po `createdAt`.

---

### `tableService`

**Izvor:** `server/services/tableService.ts`

```typescript
export async function getTables(): Promise<TableWithStatus[]>
export async function getTableById(id: number): Promise<TableUnit>
export async function createTable(data: CreateTableData): Promise<TableUnit>
export async function updateTable(id: number, data: Partial<CreateTableData & { active: boolean }>): Promise<TableUnit>
export async function deleteTable(id: number): Promise<void>
export async function updateTablePositions(positions: { id: number; positionX: number; positionY: number }[]): Promise<void>
```

`getTables()` vraća sve aktivne stolove sa računatim `openBillId` i `openBillTotal` iz otvorenih računa.

---

### `shiftService`

**Izvor:** `server/services/shiftService.ts`

```typescript
// Faza 3 — osnovno upravljanje smenama
export async function getActiveShift(userId: number): Promise<Shift | null>
export async function startShift(userId: number): Promise<Shift>
export async function endShift(userId: number): Promise<Shift>
export async function getShiftHistory(userId: number, limit?: number): Promise<Shift[]>

// Faza 6.1 — sumarni izveštaj
export async function getShiftSummary(shiftId: number): Promise<ShiftSummaryResult>

// Faza 6.2 — inventar smene
export async function getShiftInventorySummary(shiftId: number): Promise<ShiftInventoryResult>
export async function adjustShiftInventory(shiftId: number, data: ShiftInventoryAdjustData): Promise<void>

// Faza 6.3 — potvrda završetka i istorija
export async function endShiftById(shiftId: number, userId: number, isAdmin: boolean): Promise<Shift>
export async function getShiftList(params: ShiftListParams): Promise<ShiftListResult>
```

`startShift` baca `SHIFT_ALREADY_ACTIVE` (409) ako postoji aktivna smena.
`endShift` baca `NO_ACTIVE_SHIFT` (404) ako nema aktivne smene.
`endShiftById` validira vlasništvo — konobar može završiti samo svoju smenu.
`adjustShiftInventory` baca `NOTE_REQUIRED` (400) ako je napomena prazna, `NEGATIVE_STOCK` (400) ako bi rezultovalo negativnim stanjem.

---

### `billService`

**Izvor:** `server/services/billService.ts`

```typescript
export async function getBillById(id: number): Promise<Bill>
export async function getOpenBillForTable(tableId: number): Promise<Bill | null>
export async function createBill(tableId: number, userId: number): Promise<Bill>
export async function addItem(billId: number, productId: number, color?: string): Promise<Bill>
export async function updateItem(billId: number, itemId: number, data: { quantity?, unitPrice?, discount?, color? }): Promise<Bill>
export async function removeItem(billId: number, itemId: number): Promise<Bill>
export async function setDiscount(billId: number, discountPercent: number): Promise<Bill>
export async function transferTable(billId: number, newTableId: number): Promise<Bill>
export async function payBill(billId: number): Promise<Bill>
export async function cancelBill(billId: number, reason: string): Promise<Bill>
```

Interna funkcija `recalcBillTotals(billId)` se poziva posle svake izmene stavke ili popusta:
```
whiteRaw   = Σ (qty × unitPrice × (1 − itemDiscount/100))  [WHITE stavke]
blackRaw   = Σ isto                                          [BLACK stavke]
discFactor = 1 − discountPercent / 100
total      = (whiteRaw + blackRaw) × discFactor
whiteTotal = whiteRaw × discFactor
blackTotal = blackRaw × discFactor
```

---

### `settingsService` (Faza 5)

**Izvor:** `server/services/settingsService.ts`

```typescript
export async function getPrinterSettings(): Promise<PrinterSettings>
export async function savePrinterSettings(data: Partial<PrinterSettings>): Promise<PrinterSettings>
```

Čita/upisuje ključeve `printer_type`, `printer_path`, `printer_port`, `printer_width`, `cafe_name`, `cafe_address`, `cafe_pib` u `Setting` tabeli (upsert po ključu).

Podrazumevane vrednosti ako ključ ne postoji u bazi:

| Ključ            | Default          |
|------------------|------------------|
| `printer_type`   | `disabled`       |
| `printer_path`   | `192.168.1.100`  |
| `printer_port`   | `9100`           |
| `printer_width`  | `48`             |
| `cafe_name`      | `Kafić Pasaz`    |
| `cafe_address`   | `""`             |
| `cafe_pib`       | `""`             |

---

### `printerService` (Faza 5)

**Izvor:** `server/lib/printerService.ts`

```typescript
export async function printReceipt(bill: PrintBillData, config: PrinterConfig, cafe: CafeInfo): Promise<void>
export async function printTestPage(config: PrinterConfig, cafe: CafeInfo): Promise<void>
export async function loadPrinterConfig(): Promise<PrinterConfig>
export async function loadCafeInfo(): Promise<CafeInfo>
// Faza 6.3 — štampanje izveštaja smene
export async function printShiftSummaryReport(data: PrintShiftSummaryData, config: PrinterConfig, cafe: CafeInfo): Promise<void>
```

Koristi `node-thermal-printer` biblioteku (ESC/POS protokol). Podržava:
- **network**: TCP konekcija na `tcp://IP:port`
- **usb**: Direktna putanja uređaja (npr. `/dev/usb/lp0`, `\\.\USB001`)

Format računa (48-char primer):
```
========================================
Kafić Pasaz
Ulica 1, Beograd
PIB: 123456789
========================================
Račun br: 42
Datum: 28.03.2026 14:35
Konobar: Marko Marković
Sto: Sto 3
----------------------------------------
Artikal                  Kol  Ukupno
----------------------------------------
Espreso                    2  300.00 RSD
Popust (10%):         -25.00 RSD
========================================
ZA NAPLATU:           275.00 RSD
========================================
Hvala na poseti!
28.03.2026 14:36
========================================
```

Baca `Error` ako:
- `config.type === 'disabled'`
- `isPrinterConnected()` vrati `false` (timeout: 5s)

---

## Baza podataka — Modeli

**Šema:** `prisma/schema.prisma` | **Fajl:** `prisma/dev.db`

> **Napomena:** SQLite ne podržava Prisma enum tipove. Sva polja koja se ponašaju kao enum su definisana kao `String`. Dozvoljene vrednosti su navedene u komentarima šeme i u `src/types/index.ts`.

| Model          | Ključna polja (tip)                          | String enum vrednosti                              |
|----------------|----------------------------------------------|----------------------------------------------------|
| `User`         | `role: String`, `active: Boolean`            | role: `ADMIN` \| `WAITER`                          |
| `Salary`       | `userId`, `paidById`, `amount: Float`        | —                                                  |
| `Shift`        | `startedAt`, `endedAt?`, totals              | —                                                  |
| `TableUnit`    | `zone: String`, `isOccupied: Boolean`        | zone: `INDOOR` \| `OUTDOOR`                        |
| `Category`     | `nameSr`, `nameEn`, `sortOrder`, `active`    | —                                                  |
| `Product`      | `price: Float`, `unit: String`, `normQuantity: Float`, `active` | unit: `kom` \| `lit` \| `dcl` \| `flaša` \| `g` |
| `Bill`         | `status: String`, `whiteTotal`, `blackTotal` | status: `OPEN` \| `PAID` \| `CANCELLED`            |
| `BillItem`     | `color: String`, `quantity: Int`             | color: `WHITE` \| `BLACK`                          |
| `InventoryLog` | `type: String`, `changeQty: Float`           | type: `PURCHASE` \| `SALE` \| `ADJUSTMENT` \| `WASTE` |
| `Setting`      | `key: String @id`, `value: String`           | —                                                  |

**Relacije:**
```
User ──< Shift ──< Bill ──< BillItem >── Product >── Category
User ──< Salary (dvojna relacija: user + paidBy)
Shift ──< InventoryLog >── Product
TableUnit ──< Bill
```

**Seed podaci** (`prisma/seed.ts`):
- Admin nalog: `admin` / `admin123`
- 6 unutrašnjih stolova: `Sto U1` – `Sto U6`
- 12 spoljašnjih stolova: `Sto S1` – `Sto S12`
- 7 kategorija: Kafa, Gazirani sokovi, Negazirani sokovi, Pivo, Vino, Žestoki alkohol, Ostalo

---

## React Komponente

### `<AuthProvider>`

**Izvor:** `src/context/AuthContext.tsx:66`

Omotač koji mora biti na vrhu stabla (ispod `ToastProvider`). Pruža `AuthContext` svim potomcima.

```tsx
<ToastProvider>
  <AuthProvider>
    <Routes>...</Routes>
  </AuthProvider>
</ToastProvider>
```

### `<ToastProvider>` + `<Toaster>`

**Izvor:** `src/context/ToastContext.tsx` | `src/components/ui/Toaster.tsx`

Mora obuhvatati celu aplikaciju. `<Toaster>` se postavlja jednom — renderuje aktivne toaste u donjem desnom uglu.

```tsx
<ToastProvider>
  <Toaster />
  <AuthProvider>...</AuthProvider>
</ToastProvider>
```

### `<ProtectedRoute>`

**Izvor:** `src/components/ProtectedRoute.tsx`

```tsx
<ProtectedRoute roles={['ADMIN']}>
  <AdminPage />
</ProtectedRoute>
```

| Prop         | Tip       | Default    | Opis                                  |
|--------------|-----------|------------|---------------------------------------|
| `children`   | ReactNode | —          | Sadržaj koji se prikazuje             |
| `roles`      | Role[]    | sve uloge  | Ko može pristupiti                    |
| `redirectTo` | string    | `/login`   | Kuda preusmeriti ako nije autorizovan |

### `<MainLayout>`

**Izvor:** `src/components/Layout/MainLayout.tsx:35`

```tsx
<MainLayout>
  <MojaStranica />
</MainLayout>
```

Renderuje: `<Sidebar>` + `<Header>` + `{children}` u `<main>`.

### `<Sidebar>`

**Izvor:** `src/components/Layout/Sidebar.tsx:113`

Automatski filtrira navigacione stavke prema `user.role`. Stavke su definisane u `NAV_ITEMS` konstanti u istom fajlu.

### `<Header>`

**Izvor:** `src/components/Layout/Header.tsx:18`

Sadrži `<LanguageSwitcher>`, status aktivne smene (konobar: dugme za završetak smene), i dugme za odjavu. `handleLogout()` poziva `logout()` iz `useAuth()` pa redirekuje na `/login`.

### `<LanguageSwitcher>`

**Izvor:** `src/components/LanguageSwitcher.tsx`

Toggle dugme `sr ↔ en`. Čuva preferenciju u `localStorage` pod ključem `kafic_language`.

---

### `<Modal>`

**Izvor:** `src/components/ui/Modal.tsx`

```tsx
<Modal open={open} onClose={handleClose} title="Naslov" size="md">
  <p>Sadržaj</p>
</Modal>
```

| Prop       | Tip                       | Default  | Opis                              |
|------------|---------------------------|----------|-----------------------------------|
| `open`     | `boolean`                 | —        | Da li je modal otvoren            |
| `onClose`  | `() => void`              | —        | Callback za zatvaranje            |
| `title`    | `string`                  | —        | Opcioni naslov u headeru          |
| `size`     | `'sm' \| 'md' \| 'lg'`   | `'md'`   | Maksimalna širina                 |
| `hideClose`| `boolean`                 | `false`  | Sakrij dugme X                    |

Zatvara se na: klik overlay, pritisak `Escape`.

### `<ConfirmDialog>`

**Izvor:** `src/components/ui/ConfirmDialog.tsx`

Izgrađen na `<Modal>`. Prikazuje poruku i dva dugmeta (Otkaži + Potvrdi).

```tsx
<ConfirmDialog
  open={open}
  onClose={() => setOpen(false)}
  onConfirm={handleDelete}
  title="Obriši kategoriju"
  message="Da li ste sigurni?"
  variant="danger"
  loading={isDeleting}
/>
```

| Prop           | Tip                                    | Default              | Opis                         |
|----------------|----------------------------------------|----------------------|------------------------------|
| `variant`      | `'danger' \| 'warning' \| 'default'`  | `'default'`          | Boja dugmeta za potvrdu      |
| `confirmLabel` | `string`                               | `t('common.confirm')` | Tekst dugmeta za potvrdu    |
| `loading`      | `boolean`                              | `false`              | Onemogući oba dugmeta        |

### `<Badge>`

**Izvor:** `src/components/ui/Badge.tsx`

```tsx
<Badge variant="active" />
<Badge variant="inactive" />
<Badge variant="low-stock" />
<Badge variant="custom" label="Novo" className="bg-purple-900 text-purple-300" />
```

| Varijanta   | Boja           | Opis                                 |
|-------------|----------------|--------------------------------------|
| `active`    | zelena         | Aktivan status — koristi i18n ključ  |
| `inactive`  | siva           | Neaktivan status — koristi i18n ključ|
| `low-stock` | crvena (pulsy) | Nisko stanje — koristi i18n ključ    |
| `custom`    | —              | Prop `label` + `className`           |

### `<FormField>`

**Izvor:** `src/components/ui/FormField.tsx`

```tsx
<FormField label="Naziv" error={errors.nameSr} hint="Naziv na srpskom" required>
  <input type="text" {...register('nameSr')} />
</FormField>
```

| Prop       | Tip       | Opis                                           |
|------------|-----------|------------------------------------------------|
| `label`    | `string`  | Tekst labele                                   |
| `error`    | `string`  | Poruka greške (crvena, sa ikonom)              |
| `hint`     | `string`  | Hint tekst ispod inputa (prikazuje se ako nema greške) |
| `required` | `boolean` | Prikazuje crvenu zvezdicu `*` pored labele     |

### `<DataTable<T>>`

**Izvor:** `src/components/ui/DataTable.tsx`

```tsx
<DataTable<Product>
  columns={[
    { key: 'nameSr', header: 'Naziv', sortable: true },
    { key: 'price',  header: 'Cena', render: (row) => `${row.price} RSD` },
  ]}
  rows={products}
  loading={isLoading}
  keyExtractor={(r) => r.id}
  onRowClick={(r) => openEdit(r)}
/>
```

| Prop           | Tip                         | Opis                                          |
|----------------|-----------------------------|-----------------------------------------------|
| `columns`      | `ColumnDef<T>[]`            | Definicija kolona (key, header, sortable, render) |
| `rows`         | `T[]`                       | Podaci                                        |
| `loading`      | `boolean`                   | Prikazuje spinner                             |
| `keyExtractor` | `(row: T) => string\|number`| Jedinstveni ključ za svaki red                |
| `onRowClick`   | `(row: T) => void`          | Opcioni callback na klik reda                 |
| `emptyText`    | `string`                    | Tekst kad nema podataka                       |

Sortiranje je klijentsko. Generički tip: `T extends object`.

---

### `<LoginPage>`

**Izvor:** `src/pages/LoginPage.tsx:39`

Validira formu lokalno pre slanja. Mapira server error kodove na i18n ključeve:

| Server kod            | i18n ključ              |
|-----------------------|-------------------------|
| `INVALID_CREDENTIALS` | `login.error_invalid`   |
| `ACCOUNT_INACTIVE`    | `login.error_inactive`  |
| TypeError (fetch)     | `login.error_network`   |
| ostalo                | `login.error_server`    |

### `<DashboardPage>`

**Izvor:** `src/pages/DashboardPage.tsx:64`

Prikazuje status aktivne smene sa dugmetom Start/End. Admin vidi shortcut kartice (Korisnici, Izveštaji, Podešavanja). Konobar vidi poruku za pokretanje smene.

### `<CategoriesPage>` **[ADMIN]**

**Izvor:** `src/pages/admin/CategoriesPage.tsx`

- Drag-and-drop reorder sa `@dnd-kit` (`DndContext` + `SortableContext` + `useSortable`)
- Optimistički update lokalne liste, rollback na grešku
- Kreira/menja kategoriju u `<Modal>` sa `<FormField>` validacijom
- Brisanje sa `<ConfirmDialog variant="danger">`
- Toggle aktivan/neaktivan bez modala

### `<ProductsPage>` **[ADMIN]**

**Izvor:** `src/pages/admin/ProductsPage.tsx`

- `<DataTable>` sa klijentskim sortiranjem
- Filter po kategoriji (select) + pretraga (text input) + toggle neaktivnih
- Kreira/menja u `<Modal>`, deaktivira sa `<ConfirmDialog>`

### `<TablesPage>`

**Izvor:** `src/pages/TablesPage.tsx` | Zahteva: `<ShiftGuard>`

Vizuelni prikaz stolova po zonama (Unutra / Napolju). Svaki sto je kartica koja prikazuje:
- Naziv stola i zonu
- Status: slobodan (zelena) / zauzet (žuta)
- Ukupan iznos otvorenog računa (ako je zauzet)

Klik na slobodan sto → kreira račun (`POST /bills`) + redirect na `/bills/:id`.
Klik na zauzet sto → redirect na `/bills/:openBillId`.

### `<BillPage>`

**Izvor:** `src/pages/BillPage.tsx`

Split-panel POS ekran za upravljanje računom jednog stola.

**Leva strana (`MenuPanel`):** Kategorije + grid proizvoda. Klik na proizvod → dodaje stavku.

**Desna strana:** Lista stavki sa:
- `[−] qty [+]` kontrole
- `%` dugme → modal za popust na tu stavku (0–100%)
- `[⬜/⬛]` toggle belo/crno
- `[✕]` brisanje stavke
- Ukupni iznosi (Belo / Crno / Popust / Ukupno)
- Dugmad: "Naplati" (zeleno) i "Otkaži račun" (crveno) — uvek vidljiva

**Header akcije:** `%` popust na ceo račun | `↔` prebaci sto

| Modalna komponenta  | Opis                                          |
|---------------------|-----------------------------------------------|
| `DiscountModal`     | Unos procenta popusta (koristi se i za stavku i za račun) |
| `TransferModal`     | Lista slobodnih stolova                       |
| `CancelModal`       | Obavezna napomena za otkazivanje              |
| `PayConfirmModal`   | Pregled iznosa pred naplatu                   |

**Integracija sa štampačem (Faza 5):**
- Nakon uspešnog `payBill()` automatski se poziva `POST /print/receipt/:billId`
- Ako štampač nije dostupan → prikazuje se `warning` toast ali navigacija na `/tables` se nastavlja
- Za plaćene račune prikazuje se dugme **"Ponovo štampaj"** koji ponovo poziva isti endpoint

### `<TableLayoutPage>` **[ADMIN]**

**Izvor:** `src/pages/admin/TableLayoutPage.tsx`

Drag-and-drop editor rasporeda stolova. Admin može:
- Prevlačiti stolove po kanvas površini
- Kreirati nove stolove (naziv + zona)
- Menjati i brisati (deaktivirati) stolove
- Sačuvati pozicije svih stolova odjednom (`PATCH /tables/positions`)

### `<ShiftGuard>`

**Izvor:** `src/components/ShiftGuard.tsx`

```tsx
<ShiftGuard>
  <TablesPage />
</ShiftGuard>
```

Blokira pristup stranici ako korisnik nema aktivnu smenu. Prikazuje ekran za pokretanje smene sa dugmetom "Počni smenu".

### `<InventoryPage>` **[ADMIN]**

**Izvor:** `src/pages/admin/InventoryPage.tsx`

- `<DataTable>` sa stanjem magacina; kolona za stanje je crvena ako je `isLowStock`
- Crveni warning panel sa listom svih proizvoda niskog stanja (ispod 5)
- Po-red dugme "Korekcija stanja" otvara `<Modal>` sa validacijom
- Link ka `/inventory/purchase`

### `<PurchasePage>` **[ADMIN]**

**Izvor:** `src/pages/admin/PurchasePage.tsx`

- Dinamički lista redova: `makeRow()` kreira novi red sa `id = toast-${Date.now()}-${random}`
- Svaki red: select proizvoda (prikazuje trenutno stanje), input količine, input napomene
- Grupna validacija svih redova pre slanja
- `POST /inventory/purchase` → redirect na `/inventory`

### `<ShiftSummaryPage>` (Faza 6.1–6.3)

**Izvor:** `src/pages/ShiftSummaryPage.tsx`

**Ruta:** `/shift/summary`

Sumarni izveštaj aktivne smene sa 4 sekcije:

| Sekcija | Sadržaj |
|---------|---------|
| **A — Promet** | 6 kartica: Ukupno, Belo, Crno, Naplaćenih računa, Otkazanih, Prosek |
| **B — Prodaja po artiklima** | Tabela sortirana po količini, footer sa totalima |
| **C — Stanje magacina** | Tabela sa startStock/sold/purchased/adjusted/currentStock; dugme "Korekcija" |
| **D — Potvrda završetka** | Zeleno dugme "Potvrdi i završi smenu" + dugme "Štampaj izveštaj" |

**Sekcija C — boje redova:**
- Žuti red: `currentStock === 0`
- Crveni red: `0 < currentStock < minStockThreshold`

**Sekcija D — logika:**
- Dugme "Završi" je blokiran ako ima otvorenih računa (`openBillsCount > 0`)
- Na potvrdu: `POST /shifts/:id/end` → `refreshShift()` → navigate `/dashboard`
- Na štampanje: `POST /shifts/:id/print-summary`

---

### `<ShiftsHistoryPage>` **[ADMIN]** (Faza 6.3)

**Izvor:** `src/pages/admin/ShiftsHistoryPage.tsx`

**Ruta:** `/admin/shifts` i `/shifts`

Admin pregled svih smena:
- Filteri: konobar (dropdown sa unique korisnicima iz učitanih smena), datum od-do
- Tabela: Konobar | Datum | Početak | Kraj | Trajanje | Promet | Belo | Crno | Računa
- Paginacija: 20 po strani
- Aktivne smene označene zelenim bedžom "Aktivna"
- **Klik na red** → modal `<ShiftDetailModal>` — readonly pregled: metadata (4 kartice) + revenue kartice + tabela prodaje

---

### `<PrinterSettingsPage>` **[ADMIN]** (Faza 5)

**Izvor:** `src/pages/admin/PrinterSettingsPage.tsx`

**Ruta:** `/admin/settings/printer` (dostupno i iz sidebar navigacije pod "Štampač")

Admin forma za konfiguraciju POS štampača:
- **Tip konekcije** — select: `disabled` / `network` / `usb`
- **IP adresa / putanja** — prikazuje se samo kad tip nije `disabled`
- **Port** — prikazuje se samo za `network` tip (default: 9100)
- **Širina papira** — radio: 48 / 80 karaktera
- **Podaci o kafeu** — naziv, adresa, PIB (štampaju se u zaglavlju računa)
- **"Test štampe"** — `POST /print/test` → prikazuje toast sa rezultatom
- **"Sačuvaj"** — `PUT /settings/printer` → upsert svih vrednosti

`StatusBadge` komponenta prikazuje trenutni status štampača (disabled/usb/network) u zaglavlju stranice.

---

### `<PlaceholderPage>`

**Izvor:** `src/pages/PlaceholderPage.tsx:30`

```tsx
<PlaceholderPage titleKey="nav.tables" icon="🪑" />
```

Privremena stranica za neimplementirane rute.

---

## Custom Hooks

### `useAuth()`

**Izvor:** `src/hooks/useAuth.ts:41`

```typescript
const { user, isLoading, isAuthenticated, login, logout } = useAuth()
```

| Vraća             | Tip                                          | Opis                              |
|-------------------|----------------------------------------------|-----------------------------------|
| `user`            | `AuthUser \| null`                           | Ulogovani korisnik                |
| `isLoading`       | `boolean`                                    | Inicijalna provera tokena         |
| `isAuthenticated` | `boolean`                                    | Shorthand za `user !== null`      |
| `login`           | `(creds: LoginCredentials) => Promise<void>` | Poziva API, čuva token            |
| `logout`          | `() => Promise<void>`                        | Briše token, resetuje state       |

Mora biti korišćen unutar `<AuthProvider>`. Baca Error ako nije.

### `useToast()`

**Izvor:** `src/hooks/useToast.ts`

```typescript
const { showToast, hideToast, toasts } = useToast()

showToast('Sačuvano!', 'success')
showToast('Greška!',   'error')
showToast('Upozorenje', 'warning')
showToast('Info',       'info')
showToast('Kratka',     'info', 2000)  // custom trajanje u ms
```

| Funkcija     | Potpis                                                  | Opis                            |
|--------------|---------------------------------------------------------|---------------------------------|
| `showToast`  | `(message, type?, duration?) => void`                   | Dodaje toast (default: 4000 ms) |
| `hideToast`  | `(id: string) => void`                                  | Ručno uklanja toast             |
| `toasts`     | `Toast[]`                                               | Sve aktivne notifikacije        |

Mora biti korišćen unutar `<ToastProvider>`. Baca Error ako nije.

**`ToastType`:** `'success' | 'error' | 'warning' | 'info'`

### `useShift()`

**Izvor:** `src/hooks/useShift.ts`

```typescript
const { activeShift, isProcessing, startShift, endShift } = useShift()
```

| Vraća          | Tip              | Opis                                  |
|----------------|------------------|---------------------------------------|
| `activeShift`  | `Shift \| null`  | Aktivna smena korisnika               |
| `isProcessing` | `boolean`        | Start/end smene u toku                |
| `startShift`   | `() => Promise<void>` | Pokreće smenu                   |
| `endShift`     | `() => Promise<void>` | Završava smenu                  |

Mora biti korišćen unutar `<ShiftProvider>`. Baca Error ako nije.

---

## Kontekst (Context)

### `AuthContext`

**Izvor:** `src/context/AuthContext.tsx`

**Inicijalizacija pri mount-u:**
1. Čita token iz `localStorage` (`kafic_token`)
2. Čita user iz `localStorage` (`kafic_user`)
3. Proverava da li je token istekao (`isTokenExpired()`)
4. Ako je validan → postavlja `user` state
5. Ako je istekao → briše token, `user = null`

**`login(credentials)`:** poziva `apiLogin()` → čuva token + user → setuje state

**`logout()`:** poziva `apiLogout()` → briše token → `user = null`

### `ToastContext`

**Izvor:** `src/context/ToastContext.tsx`

Čuva niz aktivnih `Toast` objekata u lokalnom state-u. `showToast` dodaje toast i registruje `setTimeout` za automatsko uklanjanje. `hideToast` odmah uklanja po ID-u.

```typescript
interface Toast {
  id:      string   // 'toast-${Date.now()}-${random}'
  message: string
  type:    ToastType
}
```

### `ShiftContext`

**Izvor:** `src/context/ShiftContext.tsx`

Čuva stanje aktivne smene za celu aplikaciju. Pruža `ShiftContext` svim potomcima putem `<ShiftProvider>`.

**Inicijalizacija:** `GET /shifts/active` se poziva pri mount-u i osvežava stanje smene.

`startShift()` i `endShift()` pozivaju odgovarajuće API endpointe i ažuriraju lokalni state.

Wrapper u stablu:
```tsx
<ShiftProvider>
  <Routes>...</Routes>
</ShiftProvider>
```

---

## Tipovi (TypeScript)

**Izvor:** `src/types/index.ts`

```typescript
// String union tipovi koji se poklapaju sa vrednostima u bazi
type Role          = 'ADMIN' | 'WAITER'
type Zone          = 'INDOOR' | 'OUTDOOR'
type BillStatus    = 'OPEN' | 'PAID' | 'CANCELLED'
type Color         = 'WHITE' | 'BLACK'
type InventoryType = 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'WASTE'

// Auth
interface AuthUser        { id, username, fullName, role }
interface LoginCredentials { username, password }
interface LoginResponse   { token, user: AuthUser }

// API odgovor
interface ApiSuccess<T>   { success: true; data: T }
interface ApiError        { success: false; error: { code, message, details? } }
type ApiResponse<T>       = ApiSuccess<T> | ApiError

// Domenska
interface TableUnit { id, label, zone, positionX, positionY, isOccupied, active }
interface Category  { id, nameSr, nameEn, sortOrder, active }
interface Product   { id, categoryId, nameSr, nameEn, price, stockQuantity, unit, normQuantity, active, category? }
interface Shift     { id, userId, startedAt, endedAt, totalWhite, totalBlack, totalRevenue }
interface TableWithStatus extends TableUnit { openBillTotal: number; openBillId: number | null }
interface Bill      { id, tableId, shiftId, userId, status, discountPercent, total, whiteTotal, blackTotal, createdAt, paidAt, tableUnit, user, items }
interface BillItem  { id, billId, productId, quantity, unitPrice, color, discount, product: { id, nameSr, nameEn, price, unit, normQuantity } }
interface NavItem   { labelKey, path, icon, roles, divider? }

// Faza 5 — Podešavanja štampača
interface PrinterSettings {
  printer_type:  'usb' | 'network' | 'disabled'
  printer_path:  string   // IP adresa ili putanja uređaja
  printer_port:  string   // TCP port kao string (default: '9100')
  printer_width: '48' | '80'
  cafe_name:     string
  cafe_address:  string
  cafe_pib:      string
}
```

**Tipovi iz API klijenata** (`src/api/`):

```typescript
// src/api/categories.ts
interface CategoryWithCount extends Category { _count: { products: number } }

// src/api/inventory.ts
interface InventoryItem extends Product { category: Category; isLowStock: boolean }
interface PurchaseItem  { productId: number; quantity: number; note?: string }

// src/api/products.ts
interface CreateProductPayload {
  categoryId, nameSr, nameEn, price, stockQuantity, unit, normQuantity?
}

// src/context/ToastContext.tsx
type ToastType = 'success' | 'error' | 'warning' | 'info'
interface Toast { id: string; message: string; type: ToastType }
```

---

## Internacionalizacija — Svi ključevi

**Konfiguracija:** `src/i18n/index.ts` | **Jezici:** `sr.json` (default), `en.json`

Korišćenje u komponentama:
```tsx
const { t, i18n } = useTranslation()
t('login.title')           // → 'Prijava' / 'Login'
t('purchase.current_stock', { qty: 10, unit: 'kom' })  // interpolacija
i18n.changeLanguage('en')  // → prebaci jezik
```

Preferencija se čuva u `localStorage` pod ključem `kafic_language`.

**Svi dostupni ključevi:**

| Ključ                            | sr                                   | en                                    |
|----------------------------------|--------------------------------------|---------------------------------------|
| **login**                        |                                      |                                       |
| `login.title`                    | Prijava                              | Login                                 |
| `login.subtitle`                 | Kafić Pasaz — Sistem za upravljanje  | Kafić Pasaz — Management System       |
| `login.username`                 | Korisničko ime                       | Username                              |
| `login.password`                 | Lozinka                              | Password                              |
| `login.submit`                   | Prijavite se                         | Log In                                |
| `login.submitting`               | Prijavljivanje...                    | Logging in...                         |
| `login.error_invalid`            | Pogrešno korisničko ime ili lozinka  | Invalid username or password          |
| `login.error_inactive`           | Nalog je deaktiviran...              | Account is deactivated...             |
| `login.error_network`            | Greška mreže...                      | Network error...                      |
| `login.error_server`             | Greška servera...                    | Server error...                       |
| `login.error_required_username`  | Korisničko ime je obavezno           | Username is required                  |
| `login.error_required_password`  | Lozinka je obavezna                  | Password is required                  |
| **nav**                          |                                      |                                       |
| `nav.dashboard`                  | Kontrolna tabla                      | Dashboard                             |
| `nav.tables`                     | Stolovi                              | Tables                                |
| `nav.bills`                      | Računi                               | Bills                                 |
| `nav.products`                   | Proizvodi                            | Products                              |
| `nav.categories`                 | Kategorije                           | Categories                            |
| `nav.users`                      | Korisnici                            | Users                                 |
| `nav.shifts`                     | Smene                                | Shifts                                |
| `nav.reports`                    | Izveštaji                            | Reports                               |
| `nav.inventory`                  | Inventar                             | Inventory                             |
| `nav.settings`                   | Podešavanja                          | Settings                              |
| `nav.logout`                     | Odjava                               | Logout                                |
| **common**                       |                                      |                                       |
| `common.loading`                 | Učitavanje...                        | Loading...                            |
| `common.error`                   | Greška                               | Error                                 |
| `common.success`                 | Uspeh                                | Success                               |
| `common.save`                    | Sačuvaj                              | Save                                  |
| `common.cancel`                  | Otkaži                               | Cancel                                |
| `common.edit`                    | Izmeni                               | Edit                                  |
| `common.delete`                  | Obriši                               | Delete                                |
| `common.confirm`                 | Potvrdi                              | Confirm                               |
| `common.back`                    | Nazad                                | Back                                  |
| `common.close`                   | Zatvori                              | Close                                 |
| `common.search`                  | Pretraži                             | Search                                |
| `common.add`                     | Dodaj                                | Add                                   |
| `common.create`                  | Kreiraj                              | Create                                |
| `common.refresh`                 | Osveži                               | Refresh                               |
| `common.yes`                     | Da                                   | Yes                                   |
| `common.no`                      | Ne                                   | No                                    |
| `common.status_active`           | Aktivan                              | Active                                |
| `common.status_inactive`         | Neaktivan                            | Inactive                              |
| `common.unknown_error`           | Došlo je do nepoznate greške         | An unknown error has occurred         |
| `common.no_data`                 | Nema podataka za prikaz              | No data to display                    |
| **dashboard**                    |                                      |                                       |
| `dashboard.welcome`              | Dobrodošli, `{{name}}`!              | Welcome, `{{name}}`!                  |
| `dashboard.no_active_shift`      | Nema aktivne smene                   | No active shift                       |
| `dashboard.start_shift`          | Počni smenu                          | Start Shift                           |
| `dashboard.shift_desc_admin`     | Kao administrator možete...          | As an administrator you can...        |
| `dashboard.shift_desc_waiter`    | Molimo počnite smenu...              | Please start a shift...               |
| `dashboard.admin_users_title`    | Upravljanje korisnicima              | User Management                       |
| `dashboard.admin_reports_title`  | Izveštaji                            | Reports                               |
| `dashboard.admin_settings_title` | Podešavanja                          | Settings                              |
| **roles / zones / errors**       |                                      |                                       |
| `roles.ADMIN`                    | Administrator                        | Administrator                         |
| `roles.WAITER`                   | Konobar                              | Waiter                                |
| `zones.INDOOR`                   | Unutra                               | Indoor                                |
| `zones.OUTDOOR`                  | Napolju (terasa)                     | Outdoor (Terrace)                     |
| `errors.forbidden`               | Zabranjen pristup                    | Forbidden                             |
| `errors.go_home`                 | Na početnu                           | Go to Home                            |
| `header.logout`                  | Odjava                               | Logout                                |
| **categories**                   |                                      |                                       |
| `categories.title`               | Kategorije                           | Categories                            |
| `categories.add`                 | Dodaj kategoriju                     | Add Category                          |
| `categories.edit`                | Izmeni kategoriju                    | Edit Category                         |
| `categories.create`              | Kreiraj kategoriju                   | Create Category                       |
| `categories.name_sr`             | Naziv (srpski)                       | Name (Serbian)                        |
| `categories.name_en`             | Naziv (engleski)                     | Name (English)                        |
| `categories.sort_order`          | Redosled                             | Sort Order                            |
| `categories.sort_order_hint`     | Manji broj = prikazuje se pre        | Lower number = displayed first        |
| `categories.product_count`       | Br. proizvoda                        | # Products                            |
| `categories.drag_to_reorder`     | Prevuci za promenu redosleda         | Drag to reorder                       |
| `categories.delete_title`        | Obriši kategoriju                    | Delete Category                       |
| `categories.delete_message`      | Da li ste sigurni... `{{name}}`      | Are you sure... `{{name}}`            |
| `categories.error_has_products`  | Kategorija ima aktivnih proizvoda... | Category has active products...       |
| `categories.error_load`          | Greška pri učitavanju kategorija.    | Error loading categories.             |
| `categories.error_save`          | Greška pri čuvanju kategorije.       | Error saving category.                |
| `categories.error_delete`        | Greška pri brisanju kategorije.      | Error deleting category.              |
| `categories.error_reorder`       | Greška pri promeni redosleda.        | Error saving new order.               |
| `categories.success_create`      | Kategorija je kreirana.              | Category created.                     |
| `categories.success_update`      | Kategorija je izmenjena.             | Category updated.                     |
| `categories.success_delete`      | Kategorija je obrisana.              | Category deleted.                     |
| `categories.success_reorder`     | Redosled je sačuvan.                 | Order saved.                          |
| `categories.show_inactive`       | Prikaži neaktivne                    | Show inactive                         |
| `categories.toggle_active`       | Promeni status                       | Toggle status                         |
| **products**                     |                                      |                                       |
| `products.title`                 | Proizvodi                            | Products                              |
| `products.add`                   | Dodaj proizvod                       | Add Product                           |
| `products.edit`                  | Izmeni proizvod                      | Edit Product                          |
| `products.create`                | Kreiraj proizvod                     | Create Product                        |
| `products.name_sr`               | Naziv (srpski)                       | Name (Serbian)                        |
| `products.name_en`               | Naziv (engleski)                     | Name (English)                        |
| `products.price`                 | Cena (RSD)                           | Price (RSD)                           |
| `products.stock`                 | Zaliha                               | Stock                                 |
| `products.unit`                  | Jedinica mere                        | Unit                                  |
| `products.category`              | Kategorija                           | Category                              |
| `products.all_categories`        | Sve kategorije                       | All Categories                        |
| `products.show_inactive`         | Prikaži neaktivne                    | Show inactive                         |
| `products.search_placeholder`    | Pretraži proizvode...                | Search products...                    |
| `products.delete_title`          | Deaktiviraj proizvod                 | Deactivate Product                    |
| `products.delete_message`        | Da li ste sigurni... `{{name}}`      | Are you sure... `{{name}}`            |
| `products.error_load`            | Greška pri učitavanju proizvoda.     | Error loading products.               |
| `products.error_save`            | Greška pri čuvanju proizvoda.        | Error saving product.                 |
| `products.error_delete`          | Greška pri deaktiviranju proizvoda.  | Error deactivating product.           |
| `products.success_create`        | Proizvod je kreiran.                 | Product created.                      |
| `products.success_update`        | Proizvod je izmenjen.                | Product updated.                      |
| `products.success_delete`        | Proizvod je deaktiviran.             | Product deactivated.                  |
| `products.price_hint`            | Unesite cenu u dinarima              | Enter price in RSD                    |
| `products.stock_hint`            | Početno stanje zalihe                | Initial stock quantity                |
| `products.unit_hint`             | Jedinica: kom, lit, dcl, flaša       | Unit: kom, lit, dcl, flaša            |
| **inventory**                    |                                      |                                       |
| `inventory.title`                | Inventar                             | Inventory                             |
| `inventory.overview`             | Pregled stanja                       | Stock Overview                        |
| `inventory.low_stock`            | Nisko stanje                         | Low Stock                             |
| `inventory.low_stock_warning`    | Ovi proizvodi imaju malo zalihe...   | These products are running low...     |
| `inventory.all_ok`               | Sve zalihe su uredne.                | All stock levels are OK.              |
| `inventory.adjust_title`         | Korekcija stanja                     | Adjust Stock                          |
| `inventory.adjust_product`       | Proizvod                             | Product                               |
| `inventory.adjust_current`       | Trenutno stanje                      | Current Stock                         |
| `inventory.adjust_change`        | Promena (+/-)                        | Change (+/-)                          |
| `inventory.adjust_note`          | Napomena (obavezno)                  | Note (required)                       |
| `inventory.adjust_note_placeholder` | Razlog korekcije...               | Reason for adjustment...              |
| `inventory.adjust_change_hint`   | Pozitivan broj za dodavanje...       | Positive number to add...             |
| `inventory.adjust_submit`        | Primeni korekciju                    | Apply Adjustment                      |
| `inventory.error_load`           | Greška pri učitavanju inventara.     | Error loading inventory.              |
| `inventory.error_adjust`         | Greška pri korekciji stanja.         | Error adjusting stock.                |
| `inventory.error_negative`       | Stanje ne može biti negativno.       | Stock cannot go negative.             |
| `inventory.success_adjust`       | Korekcija je primenjena.             | Adjustment applied.                   |
| `inventory.purchase_link`        | Prijem robe                          | Goods Receipt                         |
| `inventory.stock_col`            | Zaliha                               | Stock                                 |
| `inventory.unit_col`             | J.M.                                 | Unit                                  |
| `inventory.actions_col`          | Akcije                               | Actions                               |
| `inventory.all_categories`       | Sve kategorije                       | All Categories                        |
| **purchase**                     |                                      |                                       |
| `purchase.title`                 | Prijem robe                          | Goods Receipt                         |
| `purchase.subtitle`              | Dodaj zalihe za više proizvoda...    | Add stock for multiple products...    |
| `purchase.add_row`               | Dodaj red                            | Add Row                               |
| `purchase.product`               | Proizvod                             | Product                               |
| `purchase.quantity`              | Količina                             | Quantity                              |
| `purchase.note`                  | Napomena                             | Note                                  |
| `purchase.note_placeholder`      | Opcionalna napomena...               | Optional note...                      |
| `purchase.submit`                | Potvrdi prijem                       | Confirm Receipt                       |
| `purchase.submitting`            | Čuvanje...                           | Saving...                             |
| `purchase.success`               | Prijem robe je sačuvan.              | Goods receipt saved.                  |
| `purchase.error_submit`          | Greška pri čuvanju prijema.          | Error saving receipt.                 |
| `purchase.error_empty`           | Dodajte bar jedan red.               | Add at least one row.                 |
| `purchase.error_product_required`| Izaberite proizvod.                  | Select a product.                     |
| `purchase.error_quantity_required`| Unesite količinu.                   | Enter a quantity.                     |
| `purchase.error_quantity_positive`| Količina mora biti veća od 0.       | Quantity must be greater than 0.      |
| `purchase.remove_row`            | Ukloni red                           | Remove row                            |
| `purchase.current_stock`         | Trenutno: `{{qty}}` `{{unit}}`       | Current: `{{qty}}` `{{unit}}`         |
| `purchase.select_product`        | Izaberite proizvod...                | Select product...                     |
| **tables**                             |                                      |                                       |
| `tables.title`                         | Stolovi                              | Tables                                |
| `tables.zone_indoor`                   | Unutra                               | Indoor                                |
| `tables.zone_outdoor`                  | Napolju (terasa)                     | Outdoor (Terrace)                     |
| `tables.free`                          | Slobodan                             | Free                                  |
| `tables.occupied`                      | Zauzet                               | Occupied                              |
| `tables.error`                         | Greška pri učitavanju stolova.       | Error loading tables.                 |
| `tables.openingBill`                   | Otvaranje računa...                  | Opening bill...                       |
| `tables.alreadyOccupied`              | Sto je već zauzet                    | Table is already occupied             |
| **tableLayout**                        |                                      |                                       |
| `tableLayout.title`                    | Raspored stolova                     | Table Layout                          |
| `tableLayout.add`                      | Dodaj sto                            | Add Table                             |
| `tableLayout.save`                     | Sačuvaj raspored                     | Save Layout                           |
| `tableLayout.error_load`               | Greška pri učitavanju.               | Error loading.                        |
| `tableLayout.error_save`               | Greška pri čuvanju rasporeda.        | Error saving layout.                  |
| `tableLayout.success_save`             | Raspored je sačuvan.                 | Layout saved.                         |
| **shifts**                             |                                      |                                       |
| `shifts.start`                         | Počni smenu                          | Start Shift                           |
| `shifts.end`                           | Završi smenu                         | End Shift                             |
| `shifts.active`                        | Aktivna smena                        | Active Shift                          |
| `shifts.started_at`                    | Počela u `{{time}}`                  | Started at `{{time}}`                 |
| `shifts.error_start`                   | Greška pri pokretanju smene.         | Error starting shift.                 |
| `shifts.error_end`                     | Greška pri završetku smene.          | Error ending shift.                   |
| `shifts.no_shift`                      | Nema aktivne smene                   | No active shift                       |
| `shifts.start_prompt`                  | Pokrenite smenu da biste koristili stolove | Start a shift to use tables     |
| **bills**                              |                                      |                                       |
| `bills.title`                          | Račun                                | Bill                                  |
| `bills.loading`                        | Učitavanje računa...                 | Loading bill...                       |
| `bills.error`                          | Greška pri učitavanju računa.        | Error loading bill.                   |
| `bills.emptyBill`                      | Dodajte stavke iz menija             | Add items from the menu               |
| `bills.menu.categories`                | Kategorije                           | Categories                            |
| `bills.menu.products`                  | Proizvodi                            | Products                              |
| `bills.menu.noProducts`                | Nema proizvoda                       | No products                           |
| `bills.totals.white`                   | Belo                                 | White                                 |
| `bills.totals.black`                   | Crno                                 | Black                                 |
| `bills.totals.discount`                | Popust                               | Discount                              |
| `bills.totals.total`                   | Ukupno                               | Total                                 |
| `bills.status.paid`                    | Plaćeno                              | Paid                                  |
| `bills.status.cancelled`               | Otkazano                             | Cancelled                             |
| `bills.actions.discount`               | Popust                               | Discount                              |
| `bills.actions.transfer`               | Prebaci sto                          | Transfer Table                        |
| `bills.actions.pay`                    | Naplati                              | Pay                                   |
| `bills.actions.cancel`                 | Otkaži račun                         | Cancel Bill                           |
| `bills.discount.title`                 | Popust na račun                      | Bill Discount                         |
| `bills.discount.success`               | Popust je primenjen                  | Discount applied                      |
| `bills.itemDiscount.title`             | Popust na stavku: `{{name}}`         | Item Discount: `{{name}}`             |
| `bills.transfer.title`                 | Prebaci račun na drugi sto           | Transfer Bill to Another Table        |
| `bills.transfer.subtitle`              | Izaberite slobodan sto               | Select a free table                   |
| `bills.transfer.noFreeTables`          | Nema slobodnih stolova               | No free tables available              |
| `bills.transfer.success`               | Račun je prebačen na drugi sto       | Bill transferred to another table     |
| `bills.pay.title`                      | Naplata                              | Payment                               |
| `bills.pay.subtitle`                   | Pregled iznosa pre naplate           | Review totals before payment          |
| `bills.pay.confirm`                    | Potvrdi naplatu                      | Confirm Payment                       |
| `bills.pay.paying`                     | Plaćanje...                          | Paying...                             |
| `bills.pay.success`                    | Račun je naplaćen                    | Bill paid successfully                |
| `bills.cancel.title`                   | Otkazivanje računa                   | Cancel Bill                           |
| `bills.cancel.subtitle`                | Unesite razlog otkazivanja           | Enter a reason for cancellation       |
| `bills.cancel.reasonPlaceholder`       | Razlog...                            | Reason...                             |
| `bills.cancel.confirm`                 | Potvrdi otkazivanje                  | Confirm Cancellation                  |
| `bills.cancel.success`                 | Račun je otkazan                     | Bill cancelled                        |
| **products (novi ključevi)**           |                                      |                                       |
| `products.normQuantity`                | Normativ                             | Norm Quantity                         |
| `products.normQuantity_hint`           | Količina koja se oduzima iz zaliha pri svakoj prodaji | Amount deducted from stock per sale |
| **printer** (Faza 5)                   |                                      |                                       |
| `nav.printer`                          | Štampač                              | Printer                               |
| `printer.title`                        | Podešavanja štampača                 | Printer Settings                      |
| `printer.subtitle`                     | Konfiguracija POS termalnog štampača | POS thermal printer configuration     |
| `printer.type_label`                   | Tip konekcije                        | Connection Type                       |
| `printer.type_usb`                     | USB                                  | USB                                   |
| `printer.type_network`                 | Network (TCP/IP)                     | Network (TCP/IP)                      |
| `printer.type_disabled`                | Onesposobljen                        | Disabled                              |
| `printer.path_label`                   | IP adresa / Putanja uređaja          | IP Address / Device Path              |
| `printer.port_label`                   | Port                                 | Port                                  |
| `printer.width_label`                  | Širina papira                        | Paper Width                           |
| `printer.width_48`                     | 48 karaktera (80mm)                  | 48 characters (80mm)                  |
| `printer.width_80`                     | 80 karaktera (80mm/wide)             | 80 characters (80mm/wide)             |
| `printer.cafe_name_label`              | Naziv kafića                         | Cafe Name                             |
| `printer.cafe_address_label`           | Adresa                               | Address                               |
| `printer.cafe_pib_label`               | PIB broj                             | Tax ID (PIB)                          |
| `printer.save`                         | Sačuvaj podešavanja                  | Save Settings                         |
| `printer.test_print`                   | Test štampe                          | Test Print                            |
| `printer.success_save`                 | Podešavanja su sačuvana.             | Settings saved.                       |
| `printer.success_test`                 | Test stranica je odštampana.         | Test page printed.                    |
| `printer.error_save`                   | Greška pri čuvanju podešavanja.      | Error saving settings.                |
| `printer.error_test`                   | Greška štampača. Proverite konekciju. | Printer error. Check the connection. |
| `printer.status_disabled`              | Onesposobljen — konfigurišite...     | Disabled — configure the printer...   |
| `printer.status_usb`                   | USB — direktna konekcija             | USB — direct connection               |
| `printer.status_network`               | Network — TCP/IP konekcija           | Network — TCP/IP connection           |
| `printer.reprint`                      | Ponovo štampaj                       | Reprint                               |
| `printer.reprint_success`              | Račun je ponovo odštampan.           | Receipt reprinted.                    |
| `printer.reprint_error`                | Greška pri ponovnoj štampi.          | Error reprinting receipt.             |
| `printer.auto_print_warning`           | Štampač nije dostupan. Koristite 'Ponovo štampaj'... | Printer unavailable. Use 'Reprint'... |
| `printer.section_connection`           | Konekcija                            | Connection                            |
| `printer.section_paper`                | Papir i format                       | Paper & Format                        |
| `printer.section_cafe`                 | Podaci o kafeu (za zaglavlje računa) | Cafe Info (for receipt header)        |
| `dashboard.admin_printer_title`        | Štampač                              | Printer                               |
| `dashboard.admin_printer_desc`         | Konfiguracija POS termalnog štampača | POS thermal printer configuration     |
| **shifts.summary** (Faza 6.1)          |                                      |                                       |
| `shifts.summary.title`                 | Izveštaj smene                       | Shift Report                          |
| `shifts.summary.section_revenue`       | Promet smene                         | Shift Revenue                         |
| `shifts.summary.section_sales`         | Prodaja po artiklima                 | Sales by Product                      |
| `shifts.summary.section_inventory`     | Stanje magacina                      | Warehouse State                       |
| `shifts.summary.card_total`            | Ukupan promet                        | Total Revenue                         |
| `shifts.summary.card_white`            | Ukupno BELO                          | Total WHITE                           |
| `shifts.summary.card_black`            | Ukupno CRNO                          | Total BLACK                           |
| `shifts.summary.col_product`           | Proizvod                             | Product                               |
| `shifts.summary.row_total`             | UKUPNO                               | TOTAL                                 |
| **shifts.summary.inventory** (Faza 6.2)|                                     |                                       |
| `shifts.summary.inventory.btn_adjust`  | Korekcija                            | Adjust                                |
| `shifts.summary.inventory.type_adjustment` | Korekcija                        | Adjustment                            |
| `shifts.summary.inventory.type_waste`  | Rastur/Lom                           | Waste/Breakage                        |
| `shifts.summary.inventory.modal_note`  | Napomena                             | Note                                  |
| `shifts.summary.inventory.legend_low`  | Ispod praga (< {{threshold}})        | Below threshold (< {{threshold}})     |
| `shifts.summary.inventory.legend_zero` | Nema na stanju                       | Out of stock                          |
| **shifts.confirm** (Faza 6.3)          |                                      |                                       |
| `shifts.confirm.btn_end`               | Potvrdi i završi smenu               | Confirm & End Shift                   |
| `shifts.confirm.btn_print`             | Štampaj izveštaj                     | Print Report                          |
| `shifts.confirm.dialog_title`          | Završiti smenu?                      | End Shift?                            |
| `shifts.confirm.end_success`           | Smena je uspešno završena            | Shift ended successfully              |
| `shifts.confirm.print_success`         | Izveštaj je poslat na štampač        | Report sent to printer                |
| **shifts.history** (Faza 6.3)          |                                      |                                       |
| `shifts.history.title`                 | Istorija smena                       | Shift History                         |
| `shifts.history.col_waiter`            | Konobar                              | Waiter                                |
| `shifts.history.col_duration`          | Trajanje                             | Duration                              |
| `shifts.history.col_revenue`           | Promet                               | Revenue                               |
| `shifts.history.active_badge`          | Aktivna                              | Active                                |
| `shifts.history.detail_title`          | Detalji smene                        | Shift Details                         |
| `shifts.history.btn_filter`            | Primeni filter                       | Apply filter                          |
| **users** (Faza 7.1)                   |                                      |                                       |
| `users.title`                          | Korisnici                            | Users                                 |
| `users.newUser`                        | Novi korisnik                        | New User                              |
| `users.table.fullName`                 | Ime i prezime                        | Full Name                             |
| `users.table.username`                 | Korisničko ime                       | Username                              |
| `users.table.role`                     | Rola                                 | Role                                  |
| `users.table.status`                   | Status                               | Status                                |
| `users.status.active`                  | Aktivan                              | Active                                |
| `users.status.inactive`                | Neaktivan                            | Inactive                              |
| `users.roles.ADMIN`                    | Administrator                        | Administrator                         |
| `users.roles.WAITER`                   | Konobar                              | Waiter                                |
| `users.actions.deactivate`             | Deaktiviraj                          | Deactivate                            |
| `users.actions.reactivate`             | Reaktiviraj                          | Reactivate                            |
| `users.messages.created`               | Korisnik uspešno kreiran             | User created successfully             |
| `users.messages.deactivated`           | Korisnik deaktiviran                 | User deactivated                      |
| **salaries** (Faza 7.1)                |                                      |                                       |
| `salaries.title`                       | Plate                                | Salaries                              |
| `salaries.paySalary`                   | Isplati platu                        | Pay Salary                            |
| `salaries.totalPaid`                   | Ukupno isplaćeno                     | Total Paid                            |
| `salaries.lastPayment`                 | Poslednja isplata                    | Last Payment                          |
| `salaries.table.waiter`                | Konobar                              | Waiter                                |
| `salaries.table.amount`                | Iznos                                | Amount                                |
| `salaries.table.paidBy`                | Isplatio                             | Paid By                               |
| `salaries.messages.created`            | Plata uspešno isplaćena              | Salary paid successfully              |
| **reports** (Faza 7.2)                 |                                      |                                       |
| `reports.daily.title`                  | Dnevni izveštaj                      | Daily Report                          |
| `reports.weekly.title`                 | Nedeljni izveštaj                    | Weekly Report                         |
| `reports.monthly.title`                | Mesečni izveštaj                     | Monthly Report                        |
| `reports.custom.title`                 | Prilagođeni period                   | Custom Period                         |
| `reports.custom.generate`              | Generiši izveštaj                    | Generate Report                       |
| `reports.summary.total`                | Ukupan promet                        | Total Revenue                         |
| `reports.summary.white`                | Belo                                 | White                                 |
| `reports.summary.black`                | Crno                                 | Black                                 |
| `reports.summary.billCount`            | Broj računa                          | Bill Count                            |
| `reports.summary.avgBill`              | Prosečan račun                       | Average Bill                          |
| `reports.topProducts.title`            | Top 10 artikala                      | Top 10 Products                       |
| `reports.comparison.vs`                | u odnosu na prethodni period         | vs previous period                    |
| `reports.noData`                       | Nema podataka za izabrani period     | No data for selected period           |
| **export** (Faza 7.3)                  |                                      |                                       |
| `export.pdf`                           | Export PDF                           | Export PDF                            |
| `export.excel`                         | Export Excel                         | Export Excel                          |
| `export.generatedAt`                   | Generisano                           | Generated                             |
| **settings** (Faza 7.3)               |                                      |                                       |
| `settings.title`                       | Podešavanja kafića                   | Café Settings                         |
| `settings.cafeName`                    | Naziv kafića                         | Café Name                             |
| `settings.cafeAddress`                 | Adresa                               | Address                               |
| `settings.cafePib`                     | PIB                                  | Tax ID                                |
| `settings.cafePhone`                   | Telefon                              | Phone                                 |
| `settings.minStockThreshold`           | Minimalan prag zaliha                | Minimum Stock Threshold               |
| `settings.currency`                    | Valuta                               | Currency                              |
| `settings.saved`                       | Podešavanja sačuvana                 | Settings saved                        |
| **adminDashboard** (Faza 7.4)          |                                      |                                       |
| `adminDashboard.title`                 | Admin Dashboard                      | Admin Dashboard                       |
| `adminDashboard.todayRevenue`          | Današnji promet                      | Today's Revenue                       |
| `adminDashboard.monthRevenue`          | Mesečni promet                       | Monthly Revenue                       |
| `adminDashboard.todayBills`            | Računa danas                         | Bills Today                           |
| `adminDashboard.avgBill`               | Prosečan račun                       | Average Bill                          |
| `adminDashboard.vsYesterday`           | vs juče                              | vs yesterday                          |
| `adminDashboard.last7Days`             | Promet poslednjih 7 dana             | Revenue Last 7 Days                   |
| `adminDashboard.topProducts`           | Top 5 artikala (nedelja)             | Top 5 Products (week)                 |
| `adminDashboard.whiteBlack`            | Belo / Crno (mesec)                  | White / Black (month)                 |
| `adminDashboard.byCategory`            | Promet po kategorijama (mesec)       | Revenue by Category (month)           |

---

## Upravljanje tokenima

**Izvor:** `src/utils/token.ts`

| Funkcija               | Opis                                                             |
|------------------------|------------------------------------------------------------------|
| `saveToken(token)`     | Čuva u `localStorage['kafic_token']`                             |
| `getToken()`           | Čita iz `localStorage`, vraća `null` ako ne postoji             |
| `removeToken()`        | Briše `kafic_token` i `kafic_user`                               |
| `saveUser(user)`       | Čuva `AuthUser` kao JSON u `localStorage['kafic_user']`          |
| `getSavedUser()`       | Čita i parsira `AuthUser` iz localStorage                        |
| `isTokenExpired(token)`| Dekoduje JWT payload, proverava `exp` polje (−30s tolerancija)   |
| `getAuthHeader()`      | Vraća `"Bearer <token>"` ili `null`                              |

---

## Error Handling Pattern

Konzistentan pattern kroz celu aplikaciju:

**Server (Express route):**
```typescript
categoriesRouter.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const result = await createCategory(req.body)
    res.status(201).json({ success: true, data: result })
  } catch (error) {
    next(error) // prosleđuje errorHandler middleware-u
  }
})
```

**Server (Service / bacanje greške):**
```typescript
throw new AppError(
  'Kategorija ima aktivnih proizvoda / Category has active products',
  409,                       // HTTP status
  'CATEGORY_HAS_PRODUCTS'   // mašinski čitljiv kod
)
```

**Frontend (React component):**
```typescript
try {
  await deleteCategory(id)
  showToast(t('categories.success_delete'), 'success')
} catch (err: unknown) {
  const code = (err as { code?: string }).code
  if (code === 'CATEGORY_HAS_PRODUCTS') {
    showToast(t('categories.error_has_products'), 'error')
  } else {
    showToast(t('categories.error_delete'), 'error')
  }
}
```

**Frontend (API klijent) — Faza 8.1+:**
```typescript
// src/api/categories.ts — koristi centralizovani apiClient umesto lokalnog req()
import { authRequest } from './apiClient'

export async function getCategories(): Promise<Category[]> {
  return authRequest<Category[]>('/categories')
}
```

Greške se automatski tipizuju u `apiClient.ts`:
- `ValidationError` (400) · `AuthError` (401) · `ForbiddenError` (403)
- `NotFoundError` (404) · `ServerError` (5xx) · `NetworkError` (offline/timeout)

Sve podklase `ApiError` imaju `.code: string` i `.statusCode: number` polja.

---

## Centralizovani API Klijent (Faza 8.1)

**Izvor:** `src/api/apiClient.ts`

### Tipizovane greške

| Klasa | Status | Kod |
|---|---|---|
| `ValidationError` | 400 | `VALIDATION_ERROR` |
| `AuthError` | 401 | `UNAUTHORIZED` |
| `ForbiddenError` | 403 | `FORBIDDEN` |
| `NotFoundError` | 404 | `NOT_FOUND` |
| `ServerError` | 5xx | `SERVER_ERROR` |
| `NetworkError` | 0 | `NETWORK_ERROR` |

### Funkcije

```typescript
authRequest<T>(path, options?, maxRetries=3): Promise<T>
// Dodaje Bearer token, ponavlja do 3x za mrežne greške (exp. backoff: 500→1000→2000ms)

publicRequest<T>(path, options?, maxRetries=0): Promise<T>
// Bez Bearer tokena — samo za /auth/login
```

### Format odgovora servera

Server vraća **direktno resurs** (bez `{ success, data }` wrappera) za sve rute osim auth:
```
Uspeh (2xx):  { id: 1, name: "...", ... }        ← direktan objekat
Auth uspeh:   { success: true, data: { ... } }   ← auth rute
Greška (4xx/5xx): { success: false, error: { code: "...", message: "..." } }
```

`apiClient` automatski detektuje oba formata i vraća ispravan `T`.

---

## Backup Sistem (Faza 8.2)

### Electron IPC kanali

| Kanal | Opis | Parametri | Odgovor |
|---|---|---|---|
| `backup-create` | Kreira backup odmah | — | `{ success, data: BackupInfo }` |
| `backup-list` | Lista backup fajlova | — | `{ success, data: BackupInfo[] }` |
| `backup-restore` | Restore + restart app | `backupPath: string` | `{ success }` |
| `backup-get-folder` | Vraća backup folder | — | `{ success, data: string }` |
| `backup-set-folder` | Menja backup folder | `folderPath: string` | `{ success }` |
| `backup-pick-folder` | OS folder picker | — | `{ success, data: string }` |
| `log-error` | Log greška iz ErrorBoundary | `{ message, stack?, componentStack? }` | — |

### BackupInfo tip

```typescript
interface BackupInfo {
  filename:  string   // npr. kafic_backup_2026-03-29_14-35.db
  path:      string   // apsolutna putanja
  createdAt: string   // ISO string
  sizeBytes: number
}
```

### Putanje

| Lokacija | Putanja |
|---|---|
| Backup fajlovi (default) | `~/kafic-backup/` |
| Backup konfiguracija | `{userData}/backup-config.json` |
| SQLite baza | `prisma/prisma/dev.db` (razvoj) |
| Log fajl | `~/kafic-app-logs/app.log` |

### Frontend API (`src/api/backup.ts`)

```typescript
isBackupAvailable(): boolean          // true ako je u Electron okruženju
createBackup(): Promise<BackupInfo>
listBackups(): Promise<BackupInfo[]>
restoreBackup(path: string): Promise<void>  // app se restartuje automatski
getBackupFolder(): Promise<string>
setBackupFolder(path: string): Promise<void>
pickBackupFolder(): Promise<string | null>  // null ako korisnik otkaže
```

### Auto-backup

Triggeruje se na `app.on('before-quit')`. Maksimalno 30 backup fajlova (stariji se brišu). Greška pri backup-u je ne-fatalna — aplikacija se svakako zatvara.

---

## Logovanje — electron-log (Faza 8.2)

**Paket:** `electron-log` (u `dependencies`)

```typescript
// Svi console.log/warn/error u main procesu → fajl + konzola
Object.assign(console, log.functions)
```

| Parametar | Vrednost |
|---|---|
| Log fajl | `~/kafic-app-logs/app.log` |
| Max veličina | 5 MB po fajlu |
| Max fajlova | 5 (rotacija) |
| Dev nivo | `debug` |
| Prod nivo | `warn` |

Greške iz renderer procesa (ErrorBoundary) loguju se putem IPC kanala `log-error`.

---

## Keyboard Shortcuts (Faza 8.1)

**Izvor:** `src/hooks/useKeyboardShortcuts.ts`

```typescript
useRefreshShortcut(onRefresh, enabled?)  // F5 i Ctrl+R
usePrintShortcut(onPrint, enabled?)      // Ctrl+P
useEscapeKey(onEscape, enabled?)         // Escape
useKeyboardShortcut(shortcuts)           // generički hook
```

Shortcut konfiguracija:
```typescript
interface ShortcutConfig {
  key:      string      // npr. 'F5', 'r', 'p'
  ctrl?:    boolean
  alt?:     boolean
  shift?:   boolean
  handler:  () => void
  enabled?: boolean
}
```

---

## Skeleton Loaderi (Faza 8.1)

**Izvor:** `src/components/ui/SkeletonLoader.tsx`

| Komponenta | Opis |
|---|---|
| `<TableSkeleton rows? columns? />` | Tabela sa header-om i redovima |
| `<CardSkeleton />` | Jedna kartica statistike |
| `<CardGridSkeleton count? />` | Grid od N kartica (default 4) |
| `<TextSkeleton lines? />` | Blok teksta |
| `<FullscreenLoader message? />` | Centrirani spinner sa porukom |

---

## Empty State Komponenta (Faza 8.1)

**Izvor:** `src/components/ui/EmptyState.tsx`

```tsx
<EmptyState
  title="Nema rezultata"
  description="Promenite filtere"
  variant="search"          // 'default' | 'search' | 'report' | 'error'
  action={{ label: 'Osveži', onClick: load }}
/>
```
