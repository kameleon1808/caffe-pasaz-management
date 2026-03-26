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

---

## Arhitektura

```
Electron Main Process
│
├── electron/main.ts         ← startuje Express server, kreira BrowserWindow
├── electron/preload.ts      ← contextBridge: main ↔ renderer
│
├── server/index.ts          ← createApp() + startServer() → port 3001
│   ├── server/lib/prisma.ts ← singleton PrismaClient (deli se između servisa)
│   ├── server/routes/       ← Express rute po resursu
│   │   ├── auth.ts          ← /api/v1/auth/*
│   │   ├── categories.ts    ← /api/v1/categories/*
│   │   ├── products.ts      ← /api/v1/products/*
│   │   └── inventory.ts     ← /api/v1/inventory/*
│   ├── server/middleware/   ← auth, errorHandler, logger
│   └── server/services/     ← poslovna logika
│       ├── authService.ts
│       ├── categoryService.ts
│       ├── productService.ts
│       └── inventoryService.ts
│
└── prisma/schema.prisma     ← SQLite baza (prisma/dev.db)

Electron Renderer Process (Vite → React)
│
├── src/main.tsx             ← ReactDOM.createRoot()
├── src/App.tsx              ← BrowserRouter + ToastProvider + AuthProvider + Routes
├── src/context/
│   ├── AuthContext.tsx
│   └── ToastContext.tsx
├── src/hooks/
│   ├── useAuth.ts
│   └── useToast.ts
├── src/api/                 ← fetch klijenti → http://localhost:3001
│   ├── auth.ts
│   ├── categories.ts
│   ├── products.ts
│   └── inventory.ts
├── src/components/
│   ├── Layout/              ← MainLayout, Sidebar, Header
│   ├── ProtectedRoute.tsx
│   ├── LanguageSwitcher.tsx
│   └── ui/                  ← biblioteka za ponovnu upotrebu
│       ├── Modal.tsx
│       ├── ConfirmDialog.tsx
│       ├── Toaster.tsx
│       ├── Badge.tsx
│       ├── FormField.tsx
│       └── DataTable.tsx
└── src/pages/
    ├── LoginPage.tsx
    ├── DashboardPage.tsx
    ├── PlaceholderPage.tsx
    └── admin/
        ├── CategoriesPage.tsx
        ├── ProductsPage.tsx
        ├── InventoryPage.tsx
        └── PurchasePage.tsx
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
| `Product`      | `price: Float`, `unit: String`, `active`     | unit: `kom` \| `lit` \| `dcl` \| `flaša`           |
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

Sadrži `<LanguageSwitcher>` i dugme za odjavu. `handleLogout()` poziva `logout()` iz `useAuth()` pa redirekuje na `/login`.

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

Admin vidi 3 shortcut kartice (Korisnici, Izveštaji, Podešavanja). Konobar vidi samo status smene.

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
interface Product   { id, categoryId, nameSr, nameEn, price, stockQuantity, unit, active, category? }
interface Shift     { id, userId, startedAt, endedAt, totalWhite, totalBlack, totalRevenue }
interface NavItem   { labelKey, path, icon, roles, divider? }
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
  categoryId, nameSr, nameEn, price, stockQuantity, unit
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

**Frontend (API klijent):**
```typescript
// src/api/categories.ts — req() automatski baca Error sa .code poljem
async function req<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res  = await fetch(url, { ...options, headers: { Authorization: authHeader, ... } })
  const json = await res.json()
  if (!res.ok || !json.success) {
    const err = new Error(json.error?.message ?? `HTTP ${res.status}`) as Error & { code?: string }
    err.code = json.error?.code
    throw err
  }
  return json.data as T
}
```
