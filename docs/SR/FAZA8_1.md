# Faza 8.1 — Error Handling, Validacije i UX Poliranje

## Pregled

Faza 8.1 uvodi konzistentno upravljanje greškama, loading stanja, poboljšani toast sistem i tastaturne prečice kroz celu aplikaciju.

---

## 1. Centralizovani API klijent

**Fajl:** `src/api/apiClient.ts`

Sve API datoteke sada koriste centralizovanu `authRequest<T>()` funkciju umesto lokalnih `req()` helpera.

### Tipovi grešaka

| Klasa | HTTP status | Primer koda |
|---|---|---|
| `ValidationError` | 400 | `VALIDATION_ERROR` |
| `AuthError` | 401 | `UNAUTHORIZED` |
| `ForbiddenError` | 403 | `FORBIDDEN` |
| `NotFoundError` | 404 | `NOT_FOUND` |
| `ServerError` | 5xx | `SERVER_ERROR` |
| `NetworkError` | 0 (nema konekcije) | `NETWORK_ERROR` |

### Retry logika

- Mrežne greške (`TypeError: Failed to fetch`) automatski se ponavljaju do **3 puta**
- Eksponencijalni backoff: 500ms → 1000ms → 2000ms
- HTTP greške (4xx, 5xx) se **ne ponavljaju**

### Upotreba

```ts
import { authRequest, NetworkError, AuthError } from './apiClient'

// Standardni zahtev
const data = await authRequest<Product[]>('/products')

// Obrada specifičnih grešaka
try {
  await authRequest<void>('/products/1', { method: 'DELETE' })
} catch (err) {
  if (err instanceof NetworkError) {
    // nema interneta
  } else if (err instanceof AuthError) {
    // token je istekao
  }
}
```

---

## 2. Toast sistem

**Fajlovi:** `src/context/ToastContext.tsx`, `src/components/ui/Toaster.tsx`

### Pravila

| Tip | Auto-dismiss | Trajanje |
|---|---|---|
| `success` | Da | 5 sekundi |
| `warning` | Da | 5 sekundi |
| `info` | Da | 5 sekundi |
| `error` | **Ne** | Ostaje dok korisnik ne klikne X |

- Maksimalno **3 notifikacije** istovremeno
- Najstarija se uklanja kada se doda nova ako ih ima 3
- Animacija ulaska (slide-in s desna)
- Traka napretka za auto-dismiss toastove
- `●` indikator za greške koje ostaju

### Upotreba

```tsx
const { showToast } = useToast()

showToast('Sačuvano!', 'success')         // 5s auto-dismiss
showToast('Greška servera', 'error')       // ostaje, korisnik zatvara
showToast('Pažnja', 'warning')             // 5s auto-dismiss
showToast('Info poruka', 'info', 3000)     // prilagođeno 3s
```

---

## 3. Error Boundary

**Fajl:** `src/components/ErrorBoundary.tsx`

Hvata JavaScript greške u renderovanju i prikazuje user-friendly ekran greške umesto belog ekrana.

### Karakteristike
- Dugme **"Osveži stranicu"** — `window.location.reload()`
- Dugme **"Pokušaj ponovo"** — resetuje state, pokušava re-render
- U **development modu** prikazuje stack trace
- Loguje grešku u konzolu i pokušava Electron logger

### Montiranje

`ErrorBoundary` je već montiran kao koren aplikacije u `src/App.tsx`.

---

## 4. Skeleton loaderi

**Fajl:** `src/components/ui/SkeletonLoader.tsx`

Dostupne komponente:

| Komponenta | Opis | Props |
|---|---|---|
| `Skeleton` | Bazni blok | `className` |
| `TableSkeleton` | Skeleton tabele | `rows`, `columns` |
| `CardSkeleton` | Skeleton kartice | — |
| `CardGridSkeleton` | Grid kartica | `count` |
| `TextSkeleton` | Blok teksta | `lines` |
| `FullscreenLoader` | Fullscreen spinner | `message` |

### Upotreba

```tsx
import { TableSkeleton, FullscreenLoader } from '../components/ui/SkeletonLoader'

// Zamena tabele tokom učitavanja
{loading ? <TableSkeleton rows={5} columns={4} /> : <DataTable ... />}

// Fullscreen loader
{loading && <FullscreenLoader message={t('common.loading')} />}
```

---

## 5. Empty State

**Fajl:** `src/components/ui/EmptyState.tsx`

Prikazuje poruku kada nema podataka za prikaz.

### Varijante

| Varijanta | Ikona | Kada koristiti |
|---|---|---|
| `default` | Inbox | Prazna lista/tabela |
| `search` | Lupa | Pretraga bez rezultata |
| `report` | Grafikon | Izveštaj bez podataka |
| `error` | Trougao upozorenja | Greška pri učitavanju |

### Upotreba

```tsx
import { EmptyState } from '../components/ui/EmptyState'

// Prazna lista
<EmptyState
  title="Nema proizvoda"
  description="Dodajte prvi proizvod da počnete."
  action={{ label: 'Dodaj proizvod', onClick: () => setOpen(true) }}
/>

// Pretraga bez rezultata
<EmptyState
  variant="search"
  title={`Nema rezultata za "${searchQuery}"`}
/>

// Izveštaj bez podataka
<EmptyState variant="report" title={t('reports.noData')} />
```

---

## 6. Tastaturne prečice

**Fajl:** `src/hooks/useKeyboardShortcuts.ts`

| Prečica | Akcija | Hook |
|---|---|---|
| `F5` / `Ctrl+R` | Osveži podatke (bez reload stranice) | `useRefreshShortcut` |
| `Escape` | Zatvori modal | `Modal.tsx` (ugrađeno) |
| `Enter` | Potvrdi dijalog | `ConfirmDialog.tsx` (ugrađeno) |
| `Ctrl+P` | Štampaj | `usePrintShortcut` |

### Upotreba

```tsx
import { useRefreshShortcut, usePrintShortcut } from '../hooks/useKeyboardShortcuts'

function ProductsPage() {
  // F5 / Ctrl+R osveži tabelu
  useRefreshShortcut(loadProducts)

  // ...
}

function BillPage() {
  // Ctrl+P štampaj račun
  usePrintShortcut(handlePrint, !!activeBill)
  // ...
}
```

---

## 7. ConfirmDialog — Enter za potvrdu

`ConfirmDialog` sada automatski osluškuje `Enter` taster dok je otvoren:
- `Enter` → `onConfirm()` (samo ako nije `loading`)
- `Escape` → `onClose()` (obrađuje `Modal`)
- Dugme za potvrdu dobija `autoFocus` pri otvaranju

---

## Pregled fajlova

| Fajl | Izmena |
|---|---|
| `src/api/apiClient.ts` | **NOVO** — Centralizovani klijent sa typed greškama |
| `src/api/*.ts` (13 fajlova) | Refaktorisano — koriste `authRequest` |
| `src/context/ToastContext.tsx` | Error ostaje, 5s default, max 3 |
| `src/components/ui/Toaster.tsx` | Animacija, progress bar, sticky indikator |
| `src/components/ErrorBoundary.tsx` | **NOVO** — Error boundary |
| `src/components/ui/SkeletonLoader.tsx` | **NOVO** — Skeleton komponente |
| `src/components/ui/EmptyState.tsx` | **NOVO** — Empty state komponenta |
| `src/components/ui/ConfirmDialog.tsx` | Enter za potvrdu, autoFocus |
| `src/hooks/useKeyboardShortcuts.ts` | **NOVO** — Tastaturne prečice |
| `src/App.tsx` | Dodat ErrorBoundary |
| `src/i18n/sr.json` + `en.json` | Novi ključevi: `errorBoundary`, `emptyState`, `shortcuts` |
