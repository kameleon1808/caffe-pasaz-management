# Phase 8.1 — Error Handling, Validations & UX Polish

## Overview

Phase 8.1 introduces consistent error handling, loading states, an improved toast system, and keyboard shortcuts across the entire application.

---

## 1. Centralized API Client

**File:** `src/api/apiClient.ts`

All API files now use the centralized `authRequest<T>()` function instead of local `req()` helpers.

### Error Types

| Class | HTTP Status | Example Code |
|---|---|---|
| `ValidationError` | 400 | `VALIDATION_ERROR` |
| `AuthError` | 401 | `UNAUTHORIZED` |
| `ForbiddenError` | 403 | `FORBIDDEN` |
| `NotFoundError` | 404 | `NOT_FOUND` |
| `ServerError` | 5xx | `SERVER_ERROR` |
| `NetworkError` | 0 (no connection) | `NETWORK_ERROR` |

### Retry Logic

- Network errors (`TypeError: Failed to fetch`) are automatically retried up to **3 times**
- Exponential backoff: 500ms → 1000ms → 2000ms
- HTTP errors (4xx, 5xx) are **not retried**

### Usage

```ts
import { authRequest, NetworkError, AuthError } from './apiClient'

// Standard request
const data = await authRequest<Product[]>('/products')

// Handling specific errors
try {
  await authRequest<void>('/products/1', { method: 'DELETE' })
} catch (err) {
  if (err instanceof NetworkError) {
    // no internet
  } else if (err instanceof AuthError) {
    // token expired
  }
}
```

---

## 2. Toast System

**Files:** `src/context/ToastContext.tsx`, `src/components/ui/Toaster.tsx`

### Rules

| Type | Auto-dismiss | Duration |
|---|---|---|
| `success` | Yes | 5 seconds |
| `warning` | Yes | 5 seconds |
| `info` | Yes | 5 seconds |
| `error` | **No** | Stays until user clicks X |

- Maximum **3 notifications** visible simultaneously
- Oldest is removed when a new one is added if at the limit
- Slide-in animation from the right
- Progress bar for auto-dismiss toasts
- `●` indicator for persistent error toasts

### Usage

```tsx
const { showToast } = useToast()

showToast('Saved!', 'success')           // 5s auto-dismiss
showToast('Server error', 'error')       // stays, user closes
showToast('Warning', 'warning')          // 5s auto-dismiss
showToast('Info', 'info', 3000)          // custom 3s
```

---

## 3. Error Boundary

**File:** `src/components/ErrorBoundary.tsx`

Catches JavaScript errors during rendering and shows a user-friendly error screen instead of a white screen.

### Features
- **"Refresh Page"** button — `window.location.reload()`
- **"Try Again"** button — resets state, attempts re-render
- In **development mode** shows the full stack trace
- Logs the error to the console and attempts Electron logger

### Mounting

`ErrorBoundary` is already mounted as the root of the application in `src/App.tsx`.

---

## 4. Skeleton Loaders

**File:** `src/components/ui/SkeletonLoader.tsx`

Available components:

| Component | Description | Props |
|---|---|---|
| `Skeleton` | Base block | `className` |
| `TableSkeleton` | Table skeleton | `rows`, `columns` |
| `CardSkeleton` | Card skeleton | — |
| `CardGridSkeleton` | Card grid | `count` |
| `TextSkeleton` | Text block | `lines` |
| `FullscreenLoader` | Fullscreen spinner | `message` |

### Usage

```tsx
import { TableSkeleton, FullscreenLoader } from '../components/ui/SkeletonLoader'

// Replace table while loading
{loading ? <TableSkeleton rows={5} columns={4} /> : <DataTable ... />}

// Fullscreen loader
{loading && <FullscreenLoader message={t('common.loading')} />}
```

---

## 5. Empty State

**File:** `src/components/ui/EmptyState.tsx`

Displays a message when there is no data to show.

### Variants

| Variant | Icon | When to use |
|---|---|---|
| `default` | Inbox | Empty list/table |
| `search` | Magnifier | Search with no results |
| `report` | Chart | Report with no data |
| `error` | Warning triangle | Load error |

### Usage

```tsx
import { EmptyState } from '../components/ui/EmptyState'

// Empty list
<EmptyState
  title="No products"
  description="Add your first product to get started."
  action={{ label: 'Add Product', onClick: () => setOpen(true) }}
/>

// Search with no results
<EmptyState
  variant="search"
  title={`No results for "${searchQuery}"`}
/>

// Report with no data
<EmptyState variant="report" title={t('reports.noData')} />
```

---

## 6. Keyboard Shortcuts

**File:** `src/hooks/useKeyboardShortcuts.ts`

| Shortcut | Action | Hook |
|---|---|---|
| `F5` / `Ctrl+R` | Refresh data (without page reload) | `useRefreshShortcut` |
| `Escape` | Close modal | `Modal.tsx` (built-in) |
| `Enter` | Confirm dialog | `ConfirmDialog.tsx` (built-in) |
| `Ctrl+P` | Print | `usePrintShortcut` |

### Usage

```tsx
import { useRefreshShortcut, usePrintShortcut } from '../hooks/useKeyboardShortcuts'

function ProductsPage() {
  // F5 / Ctrl+R refresh table
  useRefreshShortcut(loadProducts)
  // ...
}

function BillPage() {
  // Ctrl+P print receipt
  usePrintShortcut(handlePrint, !!activeBill)
  // ...
}
```

---

## 7. ConfirmDialog — Enter to Confirm

`ConfirmDialog` now automatically listens for the `Enter` key while open:
- `Enter` → `onConfirm()` (only if not `loading`)
- `Escape` → `onClose()` (handled by `Modal`)
- The confirm button receives `autoFocus` on open

---

## File Summary

| File | Change |
|---|---|
| `src/api/apiClient.ts` | **NEW** — Centralized client with typed errors |
| `src/api/*.ts` (13 files) | Refactored — use `authRequest` |
| `src/context/ToastContext.tsx` | Error stays, 5s default, max 3 |
| `src/components/ui/Toaster.tsx` | Animation, progress bar, sticky indicator |
| `src/components/ErrorBoundary.tsx` | **NEW** — Error boundary |
| `src/components/ui/SkeletonLoader.tsx` | **NEW** — Skeleton components |
| `src/components/ui/EmptyState.tsx` | **NEW** — Empty state component |
| `src/components/ui/ConfirmDialog.tsx` | Enter to confirm, autoFocus |
| `src/hooks/useKeyboardShortcuts.ts` | **NEW** — Keyboard shortcuts |
| `src/App.tsx` | Added ErrorBoundary |
| `src/i18n/sr.json` + `en.json` | New keys: `errorBoundary`, `emptyState`, `shortcuts` |
