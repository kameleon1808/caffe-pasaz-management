# Phase 2 — Product and Inventory Management

## What Was Done

This phase implements a complete goods management system for administrators:

- **Category CRUD** with drag-and-drop reordering (`@dnd-kit`)
- **Product CRUD** with category filter and search
- **Batch goods receipt** — multiple products in a single atomic transaction
- **Inventory overview** with low-stock warnings and manual stock adjustment
- **Reusable UI component library** (Modal, DataTable, Badge, etc.)
- **Toast notification system** accessible from any component
- **73 new i18n keys** (Serbian + English)

All pages are protected and accessible only to users with the `ADMIN` role.

---

## New Files

### Server

| Path | Description |
|---|---|
| `server/lib/prisma.ts` | Singleton Prisma client — shared across all services |
| `server/services/categoryService.ts` | Business logic for categories |
| `server/services/productService.ts` | Business logic for products |
| `server/services/inventoryService.ts` | Business logic for inventory |
| `server/routes/categories.ts` | Express router for `/api/v1/categories` |
| `server/routes/products.ts` | Express router for `/api/v1/products` |
| `server/routes/inventory.ts` | Express router for `/api/v1/inventory` |

### Frontend — Context and Hooks

| Path | Description |
|---|---|
| `src/context/ToastContext.tsx` | Global toast notification provider |
| `src/hooks/useToast.ts` | Hook for accessing `showToast` / `hideToast` |

### Frontend — API Clients

| Path | Description |
|---|---|
| `src/api/categories.ts` | HTTP client for `/api/v1/categories` |
| `src/api/products.ts` | HTTP client for `/api/v1/products` |
| `src/api/inventory.ts` | HTTP client for `/api/v1/inventory` |

### Frontend — UI Components

| Path | Description |
|---|---|
| `src/components/ui/Modal.tsx` | Generic modal dialog (sm/md/lg) |
| `src/components/ui/ConfirmDialog.tsx` | Action confirmation dialog |
| `src/components/ui/Toaster.tsx` | Toast notification container |
| `src/components/ui/Badge.tsx` | Status badges |
| `src/components/ui/FormField.tsx` | Form field with label and error |
| `src/components/ui/DataTable.tsx` | Generic sortable table |

### Frontend — Pages

| Path | Description |
|---|---|
| `src/pages/admin/CategoriesPage.tsx` | Category CRUD with drag-and-drop |
| `src/pages/admin/ProductsPage.tsx` | Product CRUD with filter and search |
| `src/pages/admin/InventoryPage.tsx` | Stock overview and adjustment |
| `src/pages/admin/PurchasePage.tsx` | Batch goods receipt |

---

## API Endpoints

All endpoints require the `Authorization: Bearer <token>` header and `ADMIN` role unless otherwise noted.

### Categories — `GET /api/v1/categories`

Returns the list of categories.

**Query parameters:**
- `showInactive=true` — include inactive categories (default: false)

**Success response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nameSr": "Kafa",
      "nameEn": "Coffee",
      "sortOrder": 1,
      "active": true,
      "_count": { "products": 4 }
    }
  ]
}
```

---

### `POST /api/v1/categories`

Creates a new category.

**Request body:**
```json
{
  "nameSr": "Kafa",
  "nameEn": "Coffee",
  "sortOrder": 1
}
```

---

### `PUT /api/v1/categories/:id`

Updates a category. All fields are optional.

```json
{
  "nameSr": "Updated Name",
  "nameEn": "Updated Name EN",
  "sortOrder": 2,
  "active": false
}
```

---

### `DELETE /api/v1/categories/:id`

Deactivates a category (soft delete). Returns error `CATEGORY_HAS_PRODUCTS` if active products exist.

---

### `PATCH /api/v1/categories/reorder`

Updates the sort order of multiple categories atomically.

**Request body:**
```json
{
  "items": [
    { "id": 3, "sortOrder": 1 },
    { "id": 1, "sortOrder": 2 },
    { "id": 2, "sortOrder": 3 }
  ]
}
```

> **Important:** This route is registered before `/:id` in the Express router. If it were placed after, Express would attempt to parse the string `"reorder"` as a numeric ID.

---

### Products — `GET /api/v1/products`

Returns the list of products.

**Query parameters:**
- `categoryId=1` — filter by category
- `search=coffee` — search by name (Serbian or English)
- `showInactive=true` — include inactive products

**Success response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "categoryId": 1,
      "nameSr": "Espreso",
      "nameEn": "Espresso",
      "price": 150,
      "stockQuantity": 100,
      "unit": "kom",
      "active": true,
      "category": { "id": 1, "nameSr": "Kafa", "nameEn": "Coffee", "sortOrder": 1, "active": true }
    }
  ]
}
```

---

### `POST /api/v1/products`

Creates a new product.

**Request body:**
```json
{
  "categoryId": 1,
  "nameSr": "Espreso",
  "nameEn": "Espresso",
  "price": 150,
  "stockQuantity": 100,
  "unit": "kom"
}
```

**Validation rules:**
- `price` must be > 0
- `stockQuantity` must be ≥ 0
- `unit` must be one of: `kom`, `lit`, `dcl`, `flaša`
- `categoryId` must point to an active category

---

### `PUT /api/v1/products/:id`

Updates a product. All fields are optional.

```json
{
  "price": 180,
  "active": false
}
```

---

### `DELETE /api/v1/products/:id`

Deactivates a product (soft delete).

---

### Inventory — `GET /api/v1/inventory`

Returns the stock overview.

**Query parameters:**
- `categoryId=1` — filter by category

**Success response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nameSr": "Espreso",
      "stockQuantity": 3,
      "unit": "kom",
      "isLowStock": true,
      "category": { "id": 1, "nameSr": "Kafa" }
    }
  ]
}
```

`isLowStock` is `true` when `stockQuantity ≤ 5`.

---

### `POST /api/v1/inventory/purchase`

Records a batch goods receipt. Creates an `InventoryLog` entry for each product and updates stock quantities inside a single Prisma transaction.

**Request body:**
```json
{
  "items": [
    { "productId": 1, "quantity": 50, "note": "Delivery" },
    { "productId": 2, "quantity": 20 }
  ],
  "shiftId": 5
}
```

- `shiftId` is optional
- `note` per item is optional

---

### `POST /api/v1/inventory/adjust`

Manual stock correction for a single product.

**Request body:**
```json
{
  "productId": 1,
  "changeQty": -3,
  "note": "Damaged — discarded"
}
```

**Rules:**
- `note` is required
- The resulting quantity (`stockQuantity + changeQty`) cannot be negative → error `NEGATIVE_STOCK`

---

### `GET /api/v1/inventory/:productId/history`

Returns the chronological change history for a single product (last 100 records).

```json
{
  "success": true,
  "data": [
    {
      "id": 10,
      "type": "PURCHASE",
      "changeQty": 50,
      "note": "Delivery",
      "createdAt": "2026-03-27T10:00:00.000Z"
    }
  ]
}
```

---

## Error Codes

| Code | HTTP | Description |
|---|---|---|
| `CATEGORY_NOT_FOUND` | 404 | Category does not exist |
| `CATEGORY_HAS_PRODUCTS` | 409 | Category has active products — cannot be deleted |
| `PRODUCT_NOT_FOUND` | 404 | Product does not exist |
| `INVALID_UNIT` | 422 | Unit of measure is not allowed |
| `INVALID_PRICE` | 422 | Price must be greater than zero |
| `INACTIVE_CATEGORY` | 422 | The selected category is not active |
| `NEGATIVE_STOCK` | 422 | Adjustment would result in negative stock |
| `NOTE_REQUIRED` | 422 | Note is required for stock adjustments |
| `EMPTY_PURCHASE` | 422 | Purchase contains no items |
| `INVALID_QUANTITY` | 422 | Quantity must be a positive number |

---

## Service Architecture

### `categoryService.ts`

```typescript
getCategories(onlyActive?: boolean): Promise<CategoryWithCount[]>
getCategoryById(id: number): Promise<Category>
createCategory(data: { nameSr, nameEn, sortOrder? }): Promise<Category>
updateCategory(id: number, data: Partial<...>): Promise<Category>
deleteCategory(id: number): Promise<void>          // checks for active products
reorderCategories(items: { id, sortOrder }[]): Promise<void>
```

### `productService.ts`

```typescript
getProducts(filters: { categoryId?, search?, showInactive? }): Promise<Product[]>
getProductById(id: number): Promise<Product>
createProduct(data: CreateProductPayload): Promise<Product>
updateProduct(id: number, data: Partial<...>): Promise<Product>
deleteProduct(id: number): Promise<void>
```

Allowed units: `['kom', 'lit', 'dcl', 'flaša']`

### `inventoryService.ts`

```typescript
getInventory(categoryId?: number): Promise<InventoryItem[]>
processPurchase(items: PurchaseItem[], shiftId?: number): Promise<void>
adjustStock(data: { productId, changeQty, note }): Promise<void>
getProductHistory(productId: number, limit?: number): Promise<InventoryLog[]>
```

Low-stock threshold: `LOW_STOCK_THRESHOLD = 5`

All write operations use `prisma.$transaction` for atomicity.

---

## UI Components

### `<Modal>`

```tsx
<Modal open={open} onClose={handleClose} title="Title" size="md">
  <p>Content</p>
</Modal>
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `open` | `boolean` | — | Whether the modal is open |
| `onClose` | `() => void` | — | Close callback |
| `title` | `string` | — | Optional header title |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Modal width |
| `hideClose` | `boolean` | `false` | Hide the X button |

Closes on: overlay click, Escape key.

---

### `<ConfirmDialog>`

```tsx
<ConfirmDialog
  open={open}
  onClose={() => setOpen(false)}
  onConfirm={handleDelete}
  title="Delete Category"
  message="Are you sure?"
  variant="danger"
  loading={isDeleting}
/>
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `'danger' \| 'warning' \| 'default'` | `'default'` | Confirm button color |
| `confirmLabel` | `string` | `t('common.confirm')` | Button label |
| `loading` | `boolean` | `false` | Disables buttons |

---

### `<Toaster>`

Place once at the root of the app, inside `<ToastProvider>`:

```tsx
<ToastProvider>
  <Toaster />
  <App />
</ToastProvider>
```

Renders all active toasts in the bottom-right corner. Toasts are automatically removed after their duration expires.

---

### `<Badge>`

```tsx
<Badge variant="active" />
<Badge variant="inactive" />
<Badge variant="low-stock" />
<Badge variant="custom" label="New" className="bg-purple-900 text-purple-300" />
```

---

### `<FormField>`

```tsx
<FormField label="Name" error={errors.nameSr} hint="Enter the Serbian name" required>
  <input type="text" {...register('nameSr')} />
</FormField>
```

---

### `<DataTable<T>>`

```tsx
<DataTable<Product>
  columns={[
    { key: 'nameSr', header: 'Name', sortable: true },
    { key: 'price',  header: 'Price', render: (row) => `${row.price} RSD` },
  ]}
  rows={products}
  loading={isLoading}
  keyExtractor={(r) => r.id}
  onRowClick={(r) => openEdit(r)}
/>
```

Sorting is client-side. Generic type constraint: `T extends object`.

---

## Toast Notifications

### Setup

`ToastContext` must wrap all components that use it:

```tsx
// src/App.tsx
<ToastProvider>
  <Toaster />
  <AuthProvider>
    ...
  </AuthProvider>
</ToastProvider>
```

### Usage

```tsx
const { showToast } = useToast()

showToast('Category saved!', 'success')
showToast('Save failed', 'error')
showToast('Low stock!', 'warning')
showToast('Info message', 'info')
showToast('Short message', 'info', 2000)  // custom duration in ms
```

### API

```typescript
interface ToastContextType {
  toasts:    Toast[]
  showToast: (message: string, type?: ToastType, duration?: number) => void
  hideToast: (id: string) => void
}

type ToastType = 'success' | 'error' | 'warning' | 'info'
```

Default duration: **4000 ms**

---

## Routes (frontend)

| Path | Page | Role |
|---|---|---|
| `/categories` | `CategoriesPage` | ADMIN |
| `/products` | `ProductsPage` | ADMIN |
| `/inventory` | `InventoryPage` | ADMIN |
| `/inventory/purchase` | `PurchasePage` | ADMIN |

---

## i18n Keys — Phase 2

### `categories.*`

| Key | Serbian | English |
|---|---|---|
| `categories.title` | Kategorije | Categories |
| `categories.add` | Dodaj kategoriju | Add Category |
| `categories.edit` | Izmeni kategoriju | Edit Category |
| `categories.create` | Kreiraj kategoriju | Create Category |
| `categories.name_sr` | Naziv (srpski) | Name (Serbian) |
| `categories.name_en` | Naziv (engleski) | Name (English) |
| `categories.sort_order` | Redosled | Sort Order |
| `categories.drag_to_reorder` | Prevuci za promenu redosleda | Drag to reorder |
| `categories.delete_title` | Obriši kategoriju | Delete Category |
| `categories.error_has_products` | Kategorija ima aktivnih proizvoda... | Category has active products... |
| `categories.success_create` | Kategorija je kreirana. | Category created. |
| `categories.success_update` | Kategorija je izmenjena. | Category updated. |
| `categories.success_delete` | Kategorija je obrisana. | Category deleted. |
| `categories.success_reorder` | Redosled je sačuvan. | Order saved. |
| `categories.show_inactive` | Prikaži neaktivne | Show inactive |

### `products.*`

| Key | Serbian | English |
|---|---|---|
| `products.title` | Proizvodi | Products |
| `products.add` | Dodaj proizvod | Add Product |
| `products.name_sr` | Naziv (srpski) | Name (Serbian) |
| `products.name_en` | Naziv (engleski) | Name (English) |
| `products.price` | Cena (RSD) | Price (RSD) |
| `products.stock` | Zaliha | Stock |
| `products.unit` | Jedinica mere | Unit |
| `products.category` | Kategorija | Category |
| `products.search_placeholder` | Pretraži proizvode... | Search products... |
| `products.success_create` | Proizvod je kreiran. | Product created. |
| `products.success_update` | Proizvod je izmenjen. | Product updated. |
| `products.success_delete` | Proizvod je deaktiviran. | Product deactivated. |

### `inventory.*`

| Key | Serbian | English |
|---|---|---|
| `inventory.title` | Inventar | Inventory |
| `inventory.low_stock` | Nisko stanje | Low Stock |
| `inventory.low_stock_warning` | Ovi proizvodi imaju malo zalihe... | These products are running low... |
| `inventory.all_ok` | Sve zalihe su uredne. | All stock levels are OK. |
| `inventory.adjust_title` | Korekcija stanja | Adjust Stock |
| `inventory.adjust_change` | Promena (+/-) | Change (+/-) |
| `inventory.adjust_note` | Napomena (obavezno) | Note (required) |
| `inventory.success_adjust` | Korekcija je primenjena. | Adjustment applied. |
| `inventory.purchase_link` | Prijem robe | Goods Receipt |

### `purchase.*`

| Key | Serbian | English |
|---|---|---|
| `purchase.title` | Prijem robe | Goods Receipt |
| `purchase.subtitle` | Dodaj zalihe za više proizvoda odjednom | Add stock for multiple products at once |
| `purchase.add_row` | Dodaj red | Add Row |
| `purchase.submit` | Potvrdi prijem | Confirm Receipt |
| `purchase.success` | Prijem robe je sačuvan. | Goods receipt saved. |
| `purchase.select_product` | Izaberite proizvod... | Select product... |
| `purchase.current_stock` | Trenutno: {{qty}} {{unit}} | Current: {{qty}} {{unit}} |

---

## Drag-and-drop Reorder (Categories)

Uses the `@dnd-kit` package family (versions: core ^6.3.1, sortable ^10.0.0, utilities ^3.2.2).

### How it works

1. `DndContext` wraps the list with a `PointerSensor`
2. `SortableContext` receives category IDs and `verticalListSortingStrategy`
3. Each row uses `useSortable({ id: cat.id })`
4. On `onDragEnd`:
   - Optimistically updates local state with `arrayMove`
   - Sends `PATCH /api/v1/categories/reorder` with new `sortOrder` values
   - On error, reloads from server to revert

> **Important:** The `PATCH /reorder` route must be registered **before** `/:id` in the Express router, or Express will try to parse the string `"reorder"` as a numeric ID.

---

## Project Structure — Phase 2 Additions

```
src/
├── api/
│   ├── auth.ts              # (Phase 1)
│   ├── categories.ts        # new
│   ├── products.ts          # new
│   └── inventory.ts         # new
│
├── components/
│   └── ui/                  # new
│       ├── Badge.tsx
│       ├── ConfirmDialog.tsx
│       ├── DataTable.tsx
│       ├── FormField.tsx
│       ├── Modal.tsx
│       └── Toaster.tsx
│
├── context/
│   ├── AuthContext.tsx       # (Phase 1)
│   └── ToastContext.tsx      # new
│
├── hooks/
│   ├── useAuth.ts            # (Phase 1)
│   └── useToast.ts           # new
│
└── pages/
    └── admin/                # new
        ├── CategoriesPage.tsx
        ├── InventoryPage.tsx
        ├── ProductsPage.tsx
        └── PurchasePage.tsx

server/
├── lib/
│   └── prisma.ts             # new — singleton client
├── routes/
│   ├── auth.ts               # (Phase 1)
│   ├── categories.ts         # new
│   ├── products.ts           # new
│   └── inventory.ts          # new
└── services/
    ├── authService.ts        # (Phase 1)
    ├── categoryService.ts    # new
    ├── productService.ts     # new
    └── inventoryService.ts   # new
```

---

## Known Issues / TODO for Future Phases

### Pagination
`DataTable` currently renders all rows at once. Server-side pagination is needed for larger datasets.

### Inventory Change History UI
`GET /inventory/:productId/history` exists on the server but is not surfaced in the UI. Planned for a future phase.

### Deleting Categories with Inactive Products
Currently a category cannot be deleted even if all its products are inactive. This logic could be relaxed.

### Phases 3+
- Phase 3: Table management (map, drag-and-drop seating)
- Phase 4: Bill and payment system
- Phase 5: Reports and statistics
- Phase 6: User and salary management
