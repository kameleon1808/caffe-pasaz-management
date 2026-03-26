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
│   ├── server/routes/       ← Express rute po resursu
│   ├── server/middleware/   ← auth, errorHandler, logger
│   └── server/services/     ← poslovna logika
│
└── prisma/schema.prisma     ← SQLite baza (prisma/dev.db)

Electron Renderer Process (Vite → React)
│
├── src/main.tsx             ← ReactDOM.createRoot()
├── src/App.tsx              ← BrowserRouter + AuthProvider + Routes
├── src/context/AuthContext.tsx
├── src/hooks/useAuth.ts
├── src/api/                 ← fetch klijenti → http://localhost:3001
├── src/components/
└── src/pages/
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

### `POST /auth/login`

**Izvor:** `server/routes/auth.ts:41`

Prijavljuje korisnika. Ne zahteva autentifikaciju.

| Parametar | Tip    | Obavezno | Opis                  |
|-----------|--------|----------|-----------------------|
| username  | string | da       | Max 50 karaktera      |
| password  | string | da       | Plain text            |

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

| Kod                | HTTP | Uzrok                         |
|--------------------|------|-------------------------------|
| `INVALID_CREDENTIALS` | 401 | Pogrešan username ili password |
| `ACCOUNT_INACTIVE` | 403  | Nalog je deaktiviran          |
| `VALIDATION_ERROR` | 400  | Prazno polje                  |

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

| Tip greške        | HTTP | Ponašanje                          |
|-------------------|------|------------------------------------|
| `AppError`        | `statusCode` polja | Vraća `code` + `message`   |
| Prisma greška     | 500  | Maskira detalje, vraća `DATABASE_ERROR` |
| `JsonWebTokenError` | 401 | Vraća `INVALID_TOKEN`            |
| `TokenExpiredError` | 401 | Vraća `TOKEN_EXPIRED`            |
| Ostalo            | 500  | U dev modu vraća `err.message`     |

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

## Baza podataka — Modeli

**Šema:** `prisma/schema.prisma` | **Fajl:** `prisma/dev.db`

> **Napomena:** SQLite ne podržava Prisma enum tipove. Sva polja koja se ponašaju kao enum su definisana kao `String`. Dozvoljene vrednosti su navedene u komentarima šeme i u `src/types/index.ts`.

| Model          | Ključna polja (tip)                        | String enum vrednosti              |
|----------------|--------------------------------------------|------------------------------------|
| `User`         | `role: String`, `active: Boolean`          | role: `ADMIN` \| `WAITER`          |
| `Salary`       | `userId`, `paidById`, `amount: Float`      | —                                  |
| `Shift`        | `startedAt`, `endedAt?`, totals            | —                                  |
| `TableUnit`    | `zone: String`, `isOccupied: Boolean`      | zone: `INDOOR` \| `OUTDOOR`        |
| `Category`     | `nameSr`, `nameEn`, `sortOrder`            | —                                  |
| `Product`      | `price: Float`, `unit: String`             | unit: `kom` \| `lit` \| `dcl`      |
| `Bill`         | `status: String`, `whiteTotal`, `blackTotal` | status: `OPEN` \| `PAID` \| `CANCELLED` |
| `BillItem`     | `color: String`, `quantity: Int`           | color: `WHITE` \| `BLACK`          |
| `InventoryLog` | `type: String`, `changeQty: Float`         | type: `PURCHASE` \| `SALE` \| `ADJUSTMENT` \| `WASTE` |
| `Setting`      | `key: String @id`, `value: String`         | —                                  |

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

Omotač koji mora biti na vrhu stabla. Pruža `AuthContext` svim potomcima.

```tsx
// src/App.tsx
<AuthProvider>
  <Routes>...</Routes>
</AuthProvider>
```

### `<ProtectedRoute>`

**Izvor:** `src/components/ProtectedRoute.tsx`

```tsx
<ProtectedRoute roles={['ADMIN']}>
  <AdminPage />
</ProtectedRoute>
```

| Prop        | Tip      | Default    | Opis                                  |
|-------------|----------|------------|---------------------------------------|
| `children`  | ReactNode | —         | Sadržaj koji se prikazuje             |
| `roles`     | Role[]   | sve uloge  | Ko može pristupiti                    |
| `redirectTo`| string   | `/login`   | Kuda preusmeriti ako nije autorizovan |

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

### `<LoginPage>`

**Izvor:** `src/pages/LoginPage.tsx:39`

Validira formu lokalno pre slanja. Mapira server error kodove na i18n ključeve:

| Server kod            | i18n ključ                  |
|-----------------------|-----------------------------|
| `INVALID_CREDENTIALS` | `login.error_invalid`       |
| `ACCOUNT_INACTIVE`    | `login.error_inactive`      |
| TypeError (fetch)     | `login.error_network`       |
| ostalo                | `login.error_server`        |

### `<DashboardPage>`

**Izvor:** `src/pages/DashboardPage.tsx:64`

Admin vidi 3 shortcut kartice (Korisnici, Izveštaji, Podešavanja). Konobar vidi samo status smene.

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

| Vraća             | Tip                                   | Opis                              |
|-------------------|---------------------------------------|-----------------------------------|
| `user`            | `AuthUser \| null`                    | Ulogovani korisnik                |
| `isLoading`       | `boolean`                             | Inicijalna provera tokena         |
| `isAuthenticated` | `boolean`                             | Shorthand za `user !== null`      |
| `login`           | `(creds: LoginCredentials) => Promise<void>` | Poziva API, čuva token  |
| `logout`          | `() => Promise<void>`                 | Briše token, resetuje state       |

Mora biti korišćen unutar `<AuthProvider>`. Baca Error ako nije.

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
interface Product   { id, categoryId, nameSr, nameEn, price, stockQuantity, unit, active }
interface Shift     { id, userId, startedAt, endedAt, totalWhite, totalBlack, totalRevenue }
interface NavItem   { labelKey, path, icon, roles, divider? }
```

---

## Internacionalizacija — Svi ključevi

**Konfiguracija:** `src/i18n/index.ts` | **Jezici:** `sr.json` (default), `en.json`

Korišćenje u komponentama:
```tsx
const { t, i18n } = useTranslation()
t('login.title')           // → 'Prijava' / 'Login'
i18n.changeLanguage('en')  // → prebaci jezik
```

Preferencija se čuva u `localStorage` pod ključem `kafic_language`.

**Svi dostupni ključevi:**

| Ključ                            | sr                                   | en                                    |
|----------------------------------|--------------------------------------|---------------------------------------|
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
| `common.loading`                 | Učitavanje...                        | Loading...                            |
| `common.save`                    | Sačuvaj                              | Save                                  |
| `common.cancel`                  | Otkaži                               | Cancel                                |
| `common.edit`                    | Izmeni                               | Edit                                  |
| `common.delete`                  | Obriši                               | Delete                                |
| `common.no_data`                 | Nema podataka za prikaz              | No data to display                    |
| `dashboard.welcome`              | Dobrodošli, `{{name}}`!              | Welcome, `{{name}}`!                  |
| `dashboard.no_active_shift`      | Nema aktivne smene                   | No active shift                       |
| `dashboard.start_shift`          | Počni smenu                          | Start Shift                           |
| `dashboard.shift_desc_admin`     | Kao administrator možete...          | As an administrator you can...        |
| `dashboard.shift_desc_waiter`    | Molimo počnite smenu...              | Please start a shift...               |
| `dashboard.admin_users_title`    | Upravljanje korisnicima              | User Management                       |
| `dashboard.admin_reports_title`  | Izveštaji                            | Reports                               |
| `dashboard.admin_settings_title` | Podešavanja                          | Settings                              |
| `roles.ADMIN`                    | Administrator                        | Administrator                         |
| `roles.WAITER`                   | Konobar                              | Waiter                                |
| `zones.INDOOR`                   | Unutra                               | Indoor                                |
| `zones.OUTDOOR`                  | Napolju (terasa)                     | Outdoor (Terrace)                     |
| `errors.forbidden`               | Zabranjen pristup                    | Forbidden                             |
| `errors.go_home`                 | Na početnu                           | Go to Home                            |
| `header.logout`                  | Odjava                               | Logout                                |

---

## Upravljanje tokenima

**Izvor:** `src/utils/token.ts`

| Funkcija          | Opis                                                     |
|-------------------|----------------------------------------------------------|
| `saveToken(token)` | Čuva u `localStorage['kafic_token']`                   |
| `getToken()`      | Čita iz `localStorage`, vraća `null` ako ne postoji     |
| `removeToken()`   | Briše `kafic_token` i `kafic_user`                       |
| `saveUser(user)`  | Čuva `AuthUser` kao JSON u `localStorage['kafic_user']` |
| `getSavedUser()`  | Čita i parsira `AuthUser` iz localStorage               |
| `isTokenExpired(token)` | Dekoduje JWT payload, proverava `exp` polje (−30s tolerancija) |
| `getAuthHeader()` | Vraća `"Bearer <token>"` ili `null`                     |

---

## Error Handling Pattern

Konzistentan pattern kroz celu aplikaciju:

**Server (Express route):**
```typescript
authRouter.post('/login', async (req, res, next) => {
  try {
    const result = await loginUser(...)
    res.status(200).json({ success: true, data: result })
  } catch (error) {
    next(error) // prosleđuje errorHandler middleware-u
  }
})
```

**Server (Service / bacanje greške):**
```typescript
throw new AppError(
  'Poruka greške / Error message',
  401,            // HTTP status
  'ERROR_CODE'    // mašinski čitljiv kod
)
```

**Frontend (React component):**
```typescript
try {
  await login(credentials)
} catch (error) {
  const err = error as Error & { code?: string }
  if (err.code === 'INVALID_CREDENTIALS') {
    setErrors({ general: t('login.error_invalid') })
  }
}
```

**Frontend (API klijent):**
```typescript
// src/api/auth.ts — apiRequest() automatski baca Error sa .code poljem
const result = await apiRequest<LoginResponse>('/auth/login', { ... })
// Ne treba try/catch ovde — podiže grešku sa code + statusCode
```
