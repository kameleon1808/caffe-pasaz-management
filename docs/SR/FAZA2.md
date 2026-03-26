# Faza 2 — Upravljanje proizvodima i inventarom

## Šta je urađeno

Ova faza implementira kompletan sistem upravljanja robom za administratora:

- **CRUD kategorija** sa drag-and-drop reorderom (`@dnd-kit`)
- **CRUD proizvoda** sa filterom po kategoriji i pretragom
- **Grupni prijem robe** — više proizvoda odjednom u jednoj transakciji
- **Pregled inventara** sa upozorenjem za nisko stanje i ručnom korekcijom
- **Biblioteka UI komponenti** za ponovnu upotrebu (Modal, DataTable, Badge, itd.)
- **Toast notifikacioni sistem** dostupan iz bilo koje komponente
- **73 nova i18n ključa** (srpski + engleski)

Sve stranice su zaštićene i dostupne isključivo korisnicima sa ulogom `ADMIN`.

---

## Nove datoteke

### Server

| Putanja | Opis |
|---|---|
| `server/lib/prisma.ts` | Singleton Prisma klijent — deli se između svih servisa |
| `server/services/categoryService.ts` | Poslovna logika za kategorije |
| `server/services/productService.ts` | Poslovna logika za proizvode |
| `server/services/inventoryService.ts` | Poslovna logika za inventar |
| `server/routes/categories.ts` | Express ruter za `/api/v1/categories` |
| `server/routes/products.ts` | Express ruter za `/api/v1/products` |
| `server/routes/inventory.ts` | Express ruter za `/api/v1/inventory` |

### Frontend — Kontekst i kuke

| Putanja | Opis |
|---|---|
| `src/context/ToastContext.tsx` | Globalni provajder za toast notifikacije |
| `src/hooks/useToast.ts` | Kuka za pristup `showToast` / `hideToast` |

### Frontend — API klijenti

| Putanja | Opis |
|---|---|
| `src/api/categories.ts` | HTTP klijent za `/api/v1/categories` |
| `src/api/products.ts` | HTTP klijent za `/api/v1/products` |
| `src/api/inventory.ts` | HTTP klijent za `/api/v1/inventory` |

### Frontend — UI komponente

| Putanja | Opis |
|---|---|
| `src/components/ui/Modal.tsx` | Generički modalni dijalog (sm/md/lg) |
| `src/components/ui/ConfirmDialog.tsx` | Dijalog za potvrdu akcije |
| `src/components/ui/Toaster.tsx` | Kontejner za toast notifikacije |
| `src/components/ui/Badge.tsx` | Statusne oznake |
| `src/components/ui/FormField.tsx` | Polje forme sa labelom i greškom |
| `src/components/ui/DataTable.tsx` | Generička tabela sa sortiranjem |

### Frontend — Stranice

| Putanja | Opis |
|---|---|
| `src/pages/admin/CategoriesPage.tsx` | CRUD kategorija sa drag-and-drop |
| `src/pages/admin/ProductsPage.tsx` | CRUD proizvoda sa filterom i pretragom |
| `src/pages/admin/InventoryPage.tsx` | Pregled stanja magacina i korekcija |
| `src/pages/admin/PurchasePage.tsx` | Grupni prijem robe |

---

## API endpointi

Svi endpointi zahtevaju `Authorization: Bearer <token>` header i ulogu `ADMIN`, osim ako nije drugačije naznačeno.

### Kategorije — `GET /api/v1/categories`

Vraća listu kategorija.

**Query parametri:**
- `showInactive=true` — uključuje neaktivne kategorije (default: false)

**Uspešan odgovor (200):**
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

Kreira novu kategoriju.

**Telo zahteva:**
```json
{
  "nameSr": "Kafa",
  "nameEn": "Coffee",
  "sortOrder": 1
}
```

---

### `PUT /api/v1/categories/:id`

Menja kategoriju. Sva polja su opciona.

```json
{
  "nameSr": "Nova kafa",
  "nameEn": "New Coffee",
  "sortOrder": 2,
  "active": false
}
```

---

### `DELETE /api/v1/categories/:id`

Deaktivira kategoriju (soft delete). Vraća grešku `CATEGORY_HAS_PRODUCTS` ako postoje aktivni proizvodi.

---

### `PATCH /api/v1/categories/reorder`

Menja redosled kategorija u jednoj operaciji.

**Telo zahteva:**
```json
{
  "items": [
    { "id": 3, "sortOrder": 1 },
    { "id": 1, "sortOrder": 2 },
    { "id": 2, "sortOrder": 3 }
  ]
}
```

---

### Proizvodi — `GET /api/v1/products`

Vraća listu proizvoda.

**Query parametri:**
- `categoryId=1` — filtrira po kategoriji
- `search=kafa` — pretraga po nazivu (srpski ili engleski)
- `showInactive=true` — uključuje neaktivne

**Uspešan odgovor (200):**
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

Kreira novi proizvod.

**Telo zahteva:**
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

**Validacija:**
- `price` mora biti > 0
- `stockQuantity` mora biti ≥ 0
- `unit` mora biti jedan od: `kom`, `lit`, `dcl`, `flaša`
- `categoryId` mora ukazivati na aktivnu kategoriju

---

### `PUT /api/v1/products/:id`

Menja proizvod. Sva polja su opciona.

```json
{
  "price": 180,
  "active": false
}
```

---

### `DELETE /api/v1/products/:id`

Deaktivira proizvod (soft delete).

---

### Inventar — `GET /api/v1/inventory`

Vraća pregled stanja magacina.

**Query parametri:**
- `categoryId=1` — filtrira po kategoriji

**Uspešan odgovor (200):**
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

`isLowStock` je `true` kada je `stockQuantity ≤ 5`.

---

### `POST /api/v1/inventory/purchase`

Evidentira grupni prijem robe. Kreira `InventoryLog` zapis za svaki proizvod i ažurira zalihe u Prisma transakciji.

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

- `shiftId` je opciono
- `note` po stavci je opciono

---

### `POST /api/v1/inventory/adjust`

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
- Rezultujuće stanje (`stockQuantity + changeQty`) ne sme biti negativno → greška `NEGATIVE_STOCK`

---

### `GET /api/v1/inventory/:productId/history`

Vraća hronološku istoriju promena za jedan proizvod (zadnjih 100 zapisa).

```json
{
  "success": true,
  "data": [
    {
      "id": 10,
      "type": "PURCHASE",
      "changeQty": 50,
      "note": "Dostava",
      "createdAt": "2026-03-27T10:00:00.000Z"
    }
  ]
}
```

---

## Kodovi grešaka

| Kod | HTTP | Opis |
|---|---|---|
| `CATEGORY_NOT_FOUND` | 404 | Kategorija ne postoji |
| `CATEGORY_HAS_PRODUCTS` | 409 | Kategorija ima aktivnih proizvoda — ne može biti obrisana |
| `PRODUCT_NOT_FOUND` | 404 | Proizvod ne postoji |
| `INVALID_UNIT` | 422 | Jedinica mere nije dozvoljena |
| `INVALID_PRICE` | 422 | Cena mora biti veća od nule |
| `INACTIVE_CATEGORY` | 422 | Izabrana kategorija nije aktivna |
| `NEGATIVE_STOCK` | 422 | Korekcija bi dovela do negativnog stanja |
| `NOTE_REQUIRED` | 422 | Napomena je obavezna za korekciju |
| `EMPTY_PURCHASE` | 422 | Prijem robe ne sadrži nijednu stavku |
| `INVALID_QUANTITY` | 422 | Količina mora biti pozitivan broj |

---

## Servisna arhitektura

### `categoryService.ts`

```typescript
getCategories(onlyActive?: boolean): Promise<CategoryWithCount[]>
getCategoryById(id: number): Promise<Category>
createCategory(data: { nameSr, nameEn, sortOrder? }): Promise<Category>
updateCategory(id: number, data: Partial<...>): Promise<Category>
deleteCategory(id: number): Promise<void>          // proverava aktivne proizvode
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

Dozvoljene jedinice mere: `['kom', 'lit', 'dcl', 'flaša']`

### `inventoryService.ts`

```typescript
getInventory(categoryId?: number): Promise<InventoryItem[]>
processPurchase(items: PurchaseItem[], shiftId?: number): Promise<void>
adjustStock(data: { productId, changeQty, note }): Promise<void>
getProductHistory(productId: number, limit?: number): Promise<InventoryLog[]>
```

Prag za nisko stanje: `LOW_STOCK_THRESHOLD = 5`

Sve operacije pisanja koriste `prisma.$transaction` za atomičnost.

---

## UI komponente

### `<Modal>`

```tsx
<Modal open={open} onClose={handleClose} title="Naslov" size="md">
  <p>Sadržaj</p>
</Modal>
```

| Prop | Tip | Default | Opis |
|---|---|---|---|
| `open` | `boolean` | — | Da li je modal otvoren |
| `onClose` | `() => void` | — | Callback za zatvaranje |
| `title` | `string` | — | Opcioni naslov |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Veličina |
| `hideClose` | `boolean` | `false` | Sakrij dugme X |

Zatvara se na: klik overlay, pritisak Escape.

---

### `<ConfirmDialog>`

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

| Prop | Tip | Default | Opis |
|---|---|---|---|
| `variant` | `'danger' \| 'warning' \| 'default'` | `'default'` | Boja dugmeta za potvrdu |
| `confirmLabel` | `string` | `t('common.confirm')` | Tekst dugmeta |
| `loading` | `boolean` | `false` | Onemogući dugmad |

---

### `<Toaster>`

Postavlja se jednom u korenu aplikacije, unutar `<ToastProvider>`:

```tsx
<ToastProvider>
  <Toaster />
  <App />
</ToastProvider>
```

Prikazuje sve aktivne toaste u donjem desnom uglu. Toasti se automatski uklanjaju po isteku trajanja.

---

### `<Badge>`

```tsx
<Badge variant="active" />
<Badge variant="inactive" />
<Badge variant="low-stock" />
<Badge variant="custom" label="Novo" className="bg-purple-900 text-purple-300" />
```

---

### `<FormField>`

```tsx
<FormField label="Naziv" error={errors.nameSr} hint="Unesite naziv na srpskom" required>
  <input type="text" {...register('nameSr')} />
</FormField>
```

---

### `<DataTable<T>>`

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

Sortiranje je klijentsko. Generički tip `T extends object`.

---

## Toast notifikacije

### Inicijalizacija

`ToastContext` mora biti postavljen iznad svih komponenti koje ga koriste:

```tsx
// src/App.tsx
<ToastProvider>
  <Toaster />
  <AuthProvider>
    ...
  </AuthProvider>
</ToastProvider>
```

### Upotreba

```tsx
const { showToast } = useToast()

showToast('Kategorija sačuvana!', 'success')
showToast('Greška pri čuvanju', 'error')
showToast('Nisko stanje!', 'warning')
showToast('Info poruka', 'info')
showToast('Kratka poruka', 'info', 2000)  // custom trajanje u ms
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

Default trajanje: **4000 ms**

---

## Rute (frontend)

| Putanja | Stranica | Uloga |
|---|---|---|
| `/categories` | `CategoriesPage` | ADMIN |
| `/products` | `ProductsPage` | ADMIN |
| `/inventory` | `InventoryPage` | ADMIN |
| `/inventory/purchase` | `PurchasePage` | ADMIN |

---

## i18n ključevi — Faza 2

### `categories.*`

| Ključ | SR | EN |
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
| `categories.delete_message` | Da li ste sigurni... | Are you sure... |
| `categories.error_has_products` | Kategorija ima aktivnih proizvoda... | Category has active products... |
| `categories.success_create` | Kategorija je kreirana. | Category created. |
| `categories.success_update` | Kategorija je izmenjena. | Category updated. |
| `categories.success_delete` | Kategorija je obrisana. | Category deleted. |
| `categories.success_reorder` | Redosled je sačuvan. | Order saved. |
| `categories.show_inactive` | Prikaži neaktivne | Show inactive |

### `products.*`

| Ključ | SR | EN |
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

| Ključ | SR | EN |
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

| Ključ | SR | EN |
|---|---|---|
| `purchase.title` | Prijem robe | Goods Receipt |
| `purchase.subtitle` | Dodaj zalihe za više proizvoda odjednom | Add stock for multiple products at once |
| `purchase.add_row` | Dodaj red | Add Row |
| `purchase.submit` | Potvrdi prijem | Confirm Receipt |
| `purchase.success` | Prijem robe je sačuvan. | Goods receipt saved. |
| `purchase.select_product` | Izaberite proizvod... | Select product... |
| `purchase.current_stock` | Trenutno: {{qty}} {{unit}} | Current: {{qty}} {{unit}} |

---

## Drag-and-drop reorder (kategorije)

Koristi se paket `@dnd-kit` (verzije: core ^6.3.1, sortable ^10.0.0, utilities ^3.2.2).

### Tok rada

1. `DndContext` omota listu sa `PointerSensor`
2. `SortableContext` prima ID-ove kategoija i `verticalListSortingStrategy`
3. Svaki red je `useSortable({ id: cat.id })`
4. Na `onDragEnd`:
   - Optimistički ažurira lokalni state sa `arrayMove`
   - Šalje `PATCH /api/v1/categories/reorder` sa novim `sortOrder` vrednostima
   - U slučaju greške, ponovo učitava server stanje

> **Bitno:** Ruta `PATCH /reorder` mora biti registrovana pre `/:id` u Express ruteru, inače će Express pokušati da parsira string `"reorder"` kao numerički ID.

---

## Struktura projekta — dopuna Faze 2

```
src/
├── api/
│   ├── auth.ts              # (Faza 1)
│   ├── categories.ts        # novo
│   ├── products.ts          # novo
│   └── inventory.ts         # novo
│
├── components/
│   └── ui/                  # novo
│       ├── Badge.tsx
│       ├── ConfirmDialog.tsx
│       ├── DataTable.tsx
│       ├── FormField.tsx
│       ├── Modal.tsx
│       └── Toaster.tsx
│
├── context/
│   ├── AuthContext.tsx       # (Faza 1)
│   └── ToastContext.tsx      # novo
│
├── hooks/
│   ├── useAuth.ts            # (Faza 1)
│   └── useToast.ts           # novo
│
└── pages/
    └── admin/                # novo
        ├── CategoriesPage.tsx
        ├── InventoryPage.tsx
        ├── ProductsPage.tsx
        └── PurchasePage.tsx

server/
├── lib/
│   └── prisma.ts             # novo — singleton klijent
├── routes/
│   ├── auth.ts               # (Faza 1)
│   ├── categories.ts         # novo
│   ├── products.ts           # novo
│   └── inventory.ts          # novo
└── services/
    ├── authService.ts        # (Faza 1)
    ├── categoryService.ts    # novo
    ├── productService.ts     # novo
    └── inventoryService.ts   # novo
```

---

## Poznati problemi / TODO za naredne faze

### Paginacija
`DataTable` trenutno prikazuje sve redove odjednom. Za veće skupove podataka potrebna je server-side paginacija.

### Istorija promena inventara
`GET /inventory/:productId/history` postoji na serveru, ali nije prikazan u UI-u. Planirano za buduću fazu.

### Brisanje kategorija sa neaktivnim proizvodima
Trenutno, kategorija se ne može obrisati čak i ako su svi njeni proizvodi neaktivni. Logika može biti ublažena.

### Faze 3+
- Faza 3: Upravljanje stolovima (mapa, drag-drop)
- Faza 4: Sistem računa i naplate
- Faza 5: Izveštaji i statistike
- Faza 6: Upravljanje korisnicima i platama
