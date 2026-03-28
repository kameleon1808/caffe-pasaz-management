# Phase 6.1 — Shift Summary Report

## Overview

When a waiter clicks **"End Shift"** on the dashboard, the app navigates to `/shift/summary`, which shows a detailed report of the current shift **before** the shift is actually closed.

> **Note:** The shift is **not closed** in this phase. Closing the shift is implemented in Phase 6.3.

---

## User Flow

1. Waiter clicks **"End Shift"** on the dashboard
2. App navigates to `/shift/summary`
3. Page loads the active shift's report
4. If open bills exist → a warning banner is displayed
5. Revenue cards and sales-by-product table are shown

---

## API

### `GET /api/v1/shifts/:id/summary`

Returns the shift summary report. **Does not modify shift state.**

**Authentication:** required (`requireAuth`)

**Parameters:**
| Parameter | Type    | Description |
|-----------|---------|-------------|
| `id`      | integer | Shift ID    |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "openBillsCount": 0,
    "revenue": {
      "total": 15400.00,
      "white": 9200.00,
      "black": 6200.00,
      "paidCount": 12,
      "cancelledCount": 1,
      "averageBill": 1283.33
    },
    "salesByProduct": [
      {
        "productId": 3,
        "nameSr": "Espreso",
        "nameEn": "Espresso",
        "categorySr": "Kafa",
        "categoryEn": "Coffee",
        "soldTotal": 24,
        "soldWhite": 14,
        "soldBlack": 10,
        "totalAmount": 4800.00
      }
    ]
  }
}
```

**Errors:**
| HTTP Code | Error Code        | Description                     |
|-----------|-------------------|---------------------------------|
| 400       | `INVALID_SHIFT_ID`| Shift ID is not a valid number  |
| 404       | `SHIFT_NOT_FOUND` | Shift does not exist            |

---

## Implementation

### Backend

| File                                    | Change                                          |
|-----------------------------------------|-------------------------------------------------|
| `server/services/shiftService.ts`       | Added `getShiftSummary(shiftId)` function       |
| `server/routes/shifts.ts`               | Added `GET /:id/summary` endpoint               |

**Aggregation logic (shiftService.ts):**
- Counts open bills (`status = 'OPEN'`)
- Aggregates revenue from `PAID` bills (`aggregate` on `total`, `whiteTotal`, `blackTotal`)
- Loads all `BillItem` records from `PAID` bills in the shift
- Groups items by `productId`, sums `quantity` and `lineTotal = qty × unitPrice × (1 − discount/100)`
- Sorts by `soldTotal` descending

### Frontend

| File                                       | Change                                                          |
|--------------------------------------------|-----------------------------------------------------------------|
| `src/types/index.ts`                       | Added types: `ShiftSummary`, `ShiftRevenue`, `ShiftSalesItem`  |
| `src/api/shifts.ts`                        | Added `getShiftSummary(shiftId)` function                       |
| `src/i18n/sr.json` + `en.json`             | Added `shifts.summary` block (~20 keys)                         |
| `src/pages/ShiftSummaryPage.tsx`           | New page component                                              |
| `src/App.tsx`                              | Added route `/shift/summary`                                    |
| `src/pages/DashboardPage.tsx`              | "End Shift" button now navigates to `/shift/summary`            |

---

## Page Layout

### Section A — Shift Revenue

Six metric cards:
| Card              | Value                                                  |
|-------------------|--------------------------------------------------------|
| Total Revenue     | Sum of `total` for all PAID bills                      |
| Total WHITE       | Sum of `whiteTotal` for all PAID bills                 |
| Total BLACK       | Sum of `blackTotal` for all PAID bills                 |
| Paid Bills        | Count of PAID bills                                    |
| Cancelled Bills   | Count of CANCELLED bills                               |
| Average Bill      | Total revenue ÷ number of paid bills                   |

### Section B — Sales by Product

Table columns:
- **Product** — name in the active language (sr/en)
- **Category** — category in the active language
- **Sold (units)** — total quantity sold
- **White (units)** — quantity sold as WHITE
- **Black (units)** — quantity sold as BLACK
- **Amount (RSD)** — revenue from this product

The last row shows column totals.

---

## Translation Keys

All keys are under `shifts.summary.*` in `sr.json` and `en.json`.

```
shifts.summary.title
shifts.summary.subtitle
shifts.summary.back
shifts.summary.loading
shifts.summary.error_load
shifts.summary.error_no_shift
shifts.summary.open_bills_warning       ({{count}})
shifts.summary.open_bills_warning_one
shifts.summary.section_revenue
shifts.summary.section_sales
shifts.summary.card_total
shifts.summary.card_white
shifts.summary.card_black
shifts.summary.card_paid_count
shifts.summary.card_cancelled_count
shifts.summary.card_average
shifts.summary.col_product
shifts.summary.col_category
shifts.summary.col_sold_total
shifts.summary.col_sold_white
shifts.summary.col_sold_black
shifts.summary.col_amount
shifts.summary.row_total
shifts.summary.no_sales
shifts.summary.currency
```

---

## Next Step

**Phase 6.3** adds a "Confirm End Shift" button to this page that actually closes the shift (calls `POST /api/v1/shifts/end`).
