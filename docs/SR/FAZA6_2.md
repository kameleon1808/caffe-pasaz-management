# Faza 6.2 — Stanje Magacina i Ručne Korekcije na Kraju Smene

## Pregled

Faza 6.2 proširuje stranicu izveštaja smene (`/shift/summary`) sa sekcijom C koja prikazuje stanje magacina za tekuću smenu i omogućava ručne korekcije inventara.

## Nova Funkcionalnost

### Sekcija C: Stanje Magacina

Tabela prikazuje sve aktivne proizvode:

| Kolona | Opis |
|--------|------|
| Proizvod | Naziv i kategorija |
| Poč. stanje | Stanje na početku smene (retroaktivno) |
| Prodato | Oduzeto iz zaliha (quantity × normQuantity, iz PAID računa) |
| Nabavka | Primljeno u smeni (InventoryLog PURCHASE) |
| Korekcija | Ručne korekcije (ADJUSTMENT + WASTE) |
| Trenutno stanje | Product.stockQuantity |

**Formula:** `Poč. stanje = Trenutno + Prodato - Nabavka - Korekcije`

**Vizuelno označavanje:**
- 🟡 Žuti red — stanje = 0
- 🔴 Crveni red — stanje < `min_stock_threshold` (podrazumevano 5, iz Settings)

### Ručna Korekcija

Dugme "Korekcija" uz svaki red otvara modal:
- **Tip:** `KOREKCIJA` (greška u evidenciji) ili `RASTUR/LOM` (fizički gubitak)
- **Promena količine** — pozitivna (+) ili negativna (-)
- **Napomena** — obavezno polje

Po potvrdi: kreira `InventoryLog`, ažurira `Product.stockQuantity`, osvežava tabelu.

## API Endpointi

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
{ "productId": 1, "changeQty": -3, "type": "WASTE", "note": "Razbijene čaše" }
```

## Izmenjeni Fajlovi

| Fajl | Izmena |
|------|--------|
| `server/services/shiftService.ts` | + `getShiftInventorySummary`, `adjustShiftInventory` |
| `server/routes/shifts.ts` | + 2 nova endpoint-a |
| `src/types/index.ts` | + `InventorySummaryItem`, `ShiftInventorySummary`, `InventoryAdjustData` |
| `src/api/shifts.ts` | + `getShiftInventorySummary`, `adjustShiftInventory` |
| `src/pages/ShiftSummaryPage.tsx` | + Sekcija C, `AdjustModal` komponenta |
| `src/i18n/sr.json` + `en.json` | + ključevi za inventar |
