# Phase 6.3 — Shift End Confirmation and Shift History

## Overview

Phase 6.3 adds:
1. **Section D** on `/shift/summary` — confirm end shift button and print report button
2. **Admin page** `/admin/shifts` — paginated history of all shifts with filters and detailed view

## New Functionality

### Section D: Confirm End Shift

At the bottom of `/shift/summary`:
- **"Confirm & End Shift"** button (green) — opens a confirm dialog
- **"Print Report"** button — sends the summary report to the POS printer
- End shift is blocked if there are open bills

On confirming end:
- Shift.endedAt = now()
- Revenue is saved to Shift (totalRevenue, totalWhite, totalBlack)
- ShiftContext refreshes (activeShift = null)
- Waiter is redirected to `/dashboard`

### Print Format

```
========================================
IZVESTAJ SMENE
========================================
Konobar: [NAME]
Pocetak: DD.MM.YYYY HH:mm
Kraj:    DD.MM.YYYY HH:mm
----------------------------------------
Ukupan promet:  X.XXX,XX RSD
Belo:           X.XXX,XX RSD
Crno:           X.XXX,XX RSD
Racuna:         XX
----------------------------------------
TOP PRODAJA:
1. Espresso            x45  6.750,00 RSD
...
========================================
```

### Shift History (`/admin/shifts`)

Table columns: Waiter | Date | Start | End | Duration | Revenue | White | Black | Bills

Features:
- **Filters**: Waiter (dropdown), From date, To date
- **Pagination**: 20 per page
- **Row click**: opens modal with detailed view (revenue + sales by product)
- Active shifts marked with green "Active" badge

## API Endpoints

### POST `/api/v1/shifts/:id/end`
Ends a shift by ID. Requires `{ confirm: true }` in body.

### POST `/api/v1/shifts/:id/print-summary`
Prints the shift summary report. A waiter can print their own shift.

### GET `/api/v1/shifts` *(admin only)*
Paginated shift list with filters.

Query params: `userId`, `dateFrom`, `dateTo`, `page`, `limit`

## Modified Files

| File | Change |
|------|--------|
| `server/services/shiftService.ts` | + `endShiftById`, `getShiftList` |
| `server/lib/printerService.ts` | + `printShiftSummaryReport` |
| `server/routes/shifts.ts` | + 3 new endpoints |
| `src/types/index.ts` | + `ShiftListItem`, `ShiftListResult` |
| `src/api/shifts.ts` | + `endShiftById`, `printShiftSummary`, `getShiftList` |
| `src/pages/ShiftSummaryPage.tsx` | + Section D + confirm dialog |
| `src/pages/admin/ShiftsHistoryPage.tsx` | New page |
| `src/App.tsx` | + `/admin/shifts` route |
| `src/i18n/sr.json` + `en.json` | + `shifts.confirm`, `shifts.history` keys |
