# Phase 6.2 — Warehouse State and Manual Corrections at Shift End

## Overview

Phase 6.2 extends the shift summary page (`/shift/summary`) with Section C showing the warehouse state for the current shift and allowing manual inventory adjustments.

## New Functionality

### Section C: Warehouse State

The table displays all active products:

| Column | Description |
|--------|-------------|
| Product | Name and category |
| Start Stock | Stock at shift start (retroactive calculation) |
| Sold | Deducted from stock (quantity × normQuantity, from PAID bills) |
| Purchased | Received in shift (InventoryLog PURCHASE) |
| Adjusted | Manual adjustments (ADJUSTMENT + WASTE) |
| Current Stock | Product.stockQuantity |

**Formula:** `Start Stock = Current + Sold - Purchased - Adjustments`

**Visual indicators:**
- 🟡 Yellow row — stock = 0
- 🔴 Red row — stock < `min_stock_threshold` (default 5, from Settings)

### Manual Adjustment

The "Adjust" button on each row opens a modal:
- **Type:** `ADJUSTMENT` (recording error) or `WASTE` (physical loss/breakage)
- **Quantity Change** — positive (+) or negative (-)
- **Note** — required field

On confirmation: creates `InventoryLog`, updates `Product.stockQuantity`, refreshes the table.

## API Endpoints

### GET `/api/v1/shifts/:id/inventory-summary`

```json
{
  "success": true,
  "data": {
    "items": [{
      "productId": 1, "nameSr": "Kafa", "nameEn": "Coffee", "unit": "kom",
      "categorySr": "Topli napici", "categoryEn": "Hot drinks",
      "startStock": 100, "sold": 25, "purchased": 0, "adjusted": 0, "currentStock": 75
    }],
    "minStockThreshold": 5
  }
}
```

### POST `/api/v1/shifts/:id/inventory-adjust`

```json
{ "productId": 1, "changeQty": -3, "type": "WASTE", "note": "Broken glasses" }
```

## Modified Files

| File | Change |
|------|--------|
| `server/services/shiftService.ts` | + `getShiftInventorySummary`, `adjustShiftInventory` |
| `server/routes/shifts.ts` | + 2 new endpoints |
| `src/types/index.ts` | + `InventorySummaryItem`, `ShiftInventorySummary`, `InventoryAdjustData` |
| `src/api/shifts.ts` | + `getShiftInventorySummary`, `adjustShiftInventory` |
| `src/pages/ShiftSummaryPage.tsx` | + Section C, `AdjustModal` component |
| `src/i18n/sr.json` + `en.json` | + inventory translation keys |
