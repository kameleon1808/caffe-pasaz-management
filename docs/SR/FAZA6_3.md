# Faza 6.3 — Potvrda Završetka Smene i Istorija Smena

## Pregled

Faza 6.3 dodaje:
1. **Sekcija D** na `/shift/summary` — dugme za potvrdu završetka smene i štampanje izveštaja
2. **Admin stranica** `/admin/shifts` — paginirana istorija svih smena sa filterima i detaljnim pregledom

## Nova Funkcionalnost

### Sekcija D: Potvrda Završetka

Na dnu stranice `/shift/summary` prikazuje se:
- Dugme **"Potvrdi i završi smenu"** (zeleno) — otvara confirm dijalog
- Dugme **"Štampaj izveštaj"** — šalje sumarni izveštaj na POS štampač
- Blokiran završetak ako ima otvorenih računa

Na potvrdu završetka:
- Shift.endedAt = now()
- Promet se upisuje na Shift (totalRevenue, totalWhite, totalBlack)
- ShiftContext se osvežava (activeShift = null)
- Konobar se vraća na `/dashboard`

### Format štampe izveštaja smene

```
========================================
IZVESTAJ SMENE
========================================
Konobar: [IME]
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

### Istorija Smena (`/admin/shifts`)

Tabela sa kolonama: Konobar | Datum | Početak | Kraj | Trajanje | Promet | Belo | Crno | Računa

Funkcionalnosti:
- **Filteri**: Konobar (dropdown), Od datuma, Do datuma
- **Paginacija**: 20 po strani
- **Klik na red**: otvara modal sa detaljnim pregledom (promet + prodaja po artiklima)
- Aktivne smene označene zelenim bedžom "Aktivna"

## API Endpointi

### POST `/api/v1/shifts/:id/end`
Završava smenu po ID-u. Zahteva `{ confirm: true }` u body-u.

### POST `/api/v1/shifts/:id/print-summary`
Štampa sumarni izveštaj smene. Konobar može štampati svoju smenu.

### GET `/api/v1/shifts` *(admin)*
Paginirana lista smena sa filterima.

Query params: `userId`, `dateFrom`, `dateTo`, `page`, `limit`

## Izmenjeni Fajlovi

| Fajl | Izmena |
|------|--------|
| `server/services/shiftService.ts` | + `endShiftById`, `getShiftList` |
| `server/lib/printerService.ts` | + `printShiftSummaryReport` |
| `server/routes/shifts.ts` | + 3 nova endpoint-a |
| `src/types/index.ts` | + `ShiftListItem`, `ShiftListResult` |
| `src/api/shifts.ts` | + `endShiftById`, `printShiftSummary`, `getShiftList` |
| `src/pages/ShiftSummaryPage.tsx` | + Sekcija D + confirm dijalog |
| `src/pages/admin/ShiftsHistoryPage.tsx` | Nova stranica |
| `src/App.tsx` | + `/admin/shifts` ruta |
| `src/i18n/sr.json` + `en.json` | + `shifts.confirm`, `shifts.history` |
