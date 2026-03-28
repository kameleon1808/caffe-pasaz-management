# PHASE 4 — Bill Management (POS Screen)

## Overview

Phase 4 implements the full POS screen for bill management. A waiter clicks on a free table, opens a bill, adds items from the menu, applies discounts, and pays or cancels the bill. All stock changes and shift totals are recorded automatically.

---

## Implemented

### 1. Creating and Opening a Bill

- Click on a free table → `POST /bills` → `Bill` created (status `OPEN`), table becomes occupied
- Click on an occupied table → redirect to `/bills/:openBillId`
- Requires an active shift for the user

### 2. POS Screen (`/bills/:id`) — split layout

**Left panel — Menu:**
- Vertical list of categories (click to filter products)
- Grid of product cards with name and price
- Click on product → adds an item (or increments `qty` if already exists)

**Right panel — Bill:**
- Item list: name, `[−]` `qty` `[+]`, line total, `[⬜/⬛]`, `[✕]`
- White/Black toggle per item
- Totals at the bottom: White, Black, Discount (if any), **Total**

### 3. Bill Discount

- `%` button in the header → modal for entering a percentage (0–100%)
- `PUT /bills/:id/discount` → recalculates `whiteTotal`, `blackTotal`, `total`

### 4. Table Transfer

- `↔` button in the header → modal with list of free tables
- `PUT /bills/:id/transfer` → old table released, new table occupied

### 5. Payment

- Green "Pay" button → summary modal → confirm
- `POST /bills/:id/pay` (Prisma transaction):
  - `Bill.status = PAID`, `paidAt = now()`
  - `Product.stockQuantity -= qty × normQuantity` for each item
  - Creates `InventoryLog` (type = `SALE`) for each item
  - `Shift.totalWhite/Black/Revenue += bill.*Total`
  - `TableUnit.isOccupied = false`

### 6. Cancellation

- Red "Cancel Bill" button → modal requiring a reason
- `POST /bills/:id/cancel`:
  - `Bill.status = CANCELLED`
  - `TableUnit.isOccupied = false`
  - Stock is **not** changed

### 7. Per-Item Discount

- `%` button on each `BillItemRow` → modal for entering item-level discount (0–100%)
- `PUT /bills/:id/items/:itemId` with `{ discount }` → recalculates bill totals
- Item line total formula: `qty × unitPrice × (1 − itemDiscount/100)`

### 8. Stock Deduction by Norm Quantity

- Each `Product` has a `normQuantity` field (`Float`, default `1.0`)
- On payment, stock is deducted by `qty × normQuantity` instead of just `qty`
- This allows products where one sale unit consumes a fractional or multiple inventory unit
  - Example: a glass of beer (`kom`) deducts `0.5 lit` from a keg tracked in litres
- `normQuantity` is set in `ProductsPage` admin form and stored in `Product.normQuantity`
- `InventoryLog.changeQty` is also recorded as `-qty × normQuantity`

---

## API Endpoints

| Method   | Path                              | Description                                   |
|----------|-----------------------------------|-----------------------------------------------|
| `GET`    | `/api/v1/bills/table/:tableId`    | Open bill for table (or 404)                  |
| `GET`    | `/api/v1/bills/:id`               | Bill details with items                       |
| `POST`   | `/api/v1/bills`                   | Create `{ tableId }`                          |
| `POST`   | `/api/v1/bills/:id/items`         | Add item `{ productId, color? }`              |
| `PUT`    | `/api/v1/bills/:id/items/:itemId` | Update item `{ quantity?, unitPrice?, discount?, color? }` |
| `DELETE` | `/api/v1/bills/:id/items/:itemId` | Remove item                                   |
| `PUT`    | `/api/v1/bills/:id/discount`      | Set discount `{ discountPercent }`            |
| `PUT`    | `/api/v1/bills/:id/transfer`      | Transfer table `{ tableId }`                  |
| `POST`   | `/api/v1/bills/:id/pay`           | Pay bill                                      |
| `POST`   | `/api/v1/bills/:id/cancel`        | Cancel `{ reason }`                           |

---

## Totals Calculation

```
whiteRaw = Σ (qty × unitPrice × (1 − itemDiscount/100))  [WHITE items]
blackRaw = Σ same                                          [BLACK items]
discFactor = 1 − discountPercent / 100

total      = (whiteRaw + blackRaw) × discFactor
whiteTotal = whiteRaw × discFactor
blackTotal = blackRaw × discFactor
```

`recalcBillTotals(billId)` is called after every item change or discount update.

---

## Validations and Error Codes

| Rule                                | Error Code           | HTTP |
|-------------------------------------|----------------------|------|
| Bill must be OPEN                   | `BILL_NOT_OPEN`      | 409  |
| Empty bill on payment               | `EMPTY_BILL`         | 400  |
| New table is occupied               | `TABLE_OCCUPIED`     | 409  |
| Same table on transfer              | `SAME_TABLE`         | 400  |
| Quantity < 1                        | `INVALID_QUANTITY`   | 400  |
| Price ≤ 0                           | `INVALID_PRICE`      | 400  |
| Discount out of 0–100 range         | `INVALID_DISCOUNT`   | 400  |
| Missing cancellation reason         | `REASON_REQUIRED`    | 400  |
| Bill not found                      | `BILL_NOT_FOUND`     | 404  |
| No active shift                     | `NO_ACTIVE_SHIFT`    | 403  |
| Table already occupied              | `TABLE_ALREADY_OCCUPIED` | 409 |

---

## File Structure

```
server/
├── services/billService.ts    # recalcBillTotals, getBillById, createBill,
│                              # addItem, updateItem, removeItem, setDiscount,
│                              # transferTable, payBill, cancelBill
└── routes/bills.ts            # All endpoints

src/
├── api/bills.ts               # createBill, fetchBill, addBillItem, updateBillItem,
│                              # removeBillItem, setBillDiscount, transferBill,
│                              # payBill, cancelBill
├── types/index.ts             # Bill, BillItem interfaces
└── pages/BillPage.tsx         # Split-panel POS UI
```

---

## UI Components (BillPage.tsx)

| Component        | Description                                       |
|------------------|---------------------------------------------------|
| `MenuPanel`      | Left panel — categories + product grid            |
| `BillItemRow`    | Item row with `[−]qty[+]`, `%` item discount, color toggle, delete |
| `DiscountModal`  | Discount percentage input                         |
| `TransferModal`  | Free tables list                                  |
| `CancelModal`    | Required reason for cancellation                  |
| `PayConfirmModal`| Totals summary before payment confirmation        |

---

## Connection to Other Phases

| Phase     | Connection                                               |
|-----------|----------------------------------------------------------|
| Phase 1   | Auth + JWT — user must be logged in                     |
| Phase 2   | Categories and products — added as bill items           |
| Phase 3   | Tables + Shifts — table and active shift required       |
| **Phase 4**| **Bills — POS screen** ✅                              |
| Phase 5   | Reports — closed bills make up shift revenue            |

---

## Remaining for Phase 5

- Receipt printing (thermal printer)
- Daily/weekly/monthly revenue reports
- User management (admin)
- Salary payments to waiters
