# Phase 7.3 — PDF/Excel Export and Cafe Settings Page

## Overview

Phase 7.3 adds:
1. **PDF export** for reports using the `pdfmake` library
2. **Excel export** for reports using the `exceljs` library
3. **Cafe settings page** (`/admin/settings`) with cafe info fields
4. **Extended settings API** with generic GET / and PUT / endpoints

---

## Server changes

### `server/services/settingsService.ts` (extended)
New functions:
- `getAllSettings()` — returns all settings as `Record<string, string>`
- `getSetting(key)` — returns a single value by key
- `upsertSetting(key, value)` — upserts a single setting
- `bulkUpsert(settings)` — bulk upserts multiple settings at once

### `server/routes/settings.ts` (extended)
New endpoints:
- `GET /api/v1/settings` — returns all settings (requireAuth)
- `PUT /api/v1/settings` — bulk update, body: `{ settings: Record<string, string> }` (requireAuth + requireAdmin)

---

## New frontend files

### `src/api/settings.ts` (extended)
New interface and functions:
```typescript
export interface CafeSettings {
  cafe_name?: string;
  cafe_address?: string;
  cafe_pib?: string;
  cafe_phone?: string;
  min_stock_threshold?: string;
  currency?: string;
}

export async function getSettings(): Promise<CafeSettings>
export async function updateSettings(settings: CafeSettings): Promise<void>
```

### `src/utils/exportPdf.ts` (new)
Function `exportReportToPdf(options: PdfExportOptions): void`

PDF structure:
1. Cafe header (name, address, PIB)
2. Report title
3. Revenue summary (table)
4. Top 10 products
5. Revenue by waiter
6. Footer with generation timestamp

### `src/utils/exportExcel.ts` (new)
Async function `exportReportToExcel(options: ExcelExportOptions): Promise<void>`

Excel worksheets:
- **Promet** — revenue summary and cafe info
- **Prodaja** — top products with quantity and amount
- **Konobari** — revenue by waiter/shift
- **Kategorije** — category breakdown

### `src/pages/admin/SettingsPage.tsx` (new)
Form with fields:
- Cafe Name (`cafe_name`)
- Address (`cafe_address`)
- Tax ID / PIB (`cafe_pib`)
- Phone (`cafe_phone`)
- Minimum Stock Threshold (`min_stock_threshold`)
- Currency (`currency`)

Note: Printer settings remain at `/admin/settings/printer` (Phase 5).

---

## Modified report pages

All 4 report pages received:
- `const [cafeSettings, setCafeSettings] = useState<CafeSettings>({})`
- A `useEffect` that loads settings on mount
- Two buttons: **Export PDF** (blue outline) and **Export Excel** (green outline)
- Buttons are disabled while there is no data or during loading

---

## Routes

| URL | Component |
|-----|-----------|
| `/settings` | `SettingsPage` |
| `/admin/settings` | `SettingsPage` |

---

## i18n keys added

Keys added to both `sr.json` and `en.json`:
- `settings.*` — all cafe settings labels and messages
- `export.*` — export buttons and messages

---

## Installed dependencies

```
pdfmake ^0.3.7
exceljs ^4.4.0
@types/pdfmake ^0.3.2 (devDependency)
```
