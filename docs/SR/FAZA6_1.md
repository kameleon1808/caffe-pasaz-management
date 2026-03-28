# Faza 6.1 — Sumarni izveštaj smene

## Pregled

Kada konobar klikne **"Završi smenu"** na kontrolnoj tabli, otvara se stranica `/shift/summary` koja prikazuje detaljan izveštaj tekuće smene **pre** nego što se smena zatvori.

> **Napomena:** Smena se u ovoj fazi **ne zatvara**. Zatvaranje smene implementirano je u Fazi 6.3.

---

## Korisnički tok

1. Konobar klikne **"Završi smenu"** na dashboardu
2. Aplikacija naviguje na `/shift/summary`
3. Stranica učitava izveštaj aktivne smene
4. Ako postoje otvoreni računi → prikazuje se upozorenje
5. Prikazuju se kartice prometa i tabela prodaje po artiklima

---

## API

### `GET /api/v1/shifts/:id/summary`

Vraća sumarni izveštaj smene. **Ne menja stanje smene.**

**Autentifikacija:** obavezna (`requireAuth`)

**Parametri:**
| Parametar | Tip     | Opis         |
|-----------|---------|--------------|
| `id`      | integer | ID smene     |

**Odgovor (200 OK):**
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

**Greške:**
| HTTP kod | Kod greške        | Opis                        |
|----------|-------------------|-----------------------------|
| 400      | `INVALID_SHIFT_ID`| ID smene nije validan broj  |
| 404      | `SHIFT_NOT_FOUND` | Smena ne postoji            |

---

## Implementacija

### Backend

| Fajl                                    | Izmena                                        |
|-----------------------------------------|-----------------------------------------------|
| `server/services/shiftService.ts`       | Dodata funkcija `getShiftSummary(shiftId)`    |
| `server/routes/shifts.ts`               | Dodat `GET /:id/summary` endpoint             |

**Logika agregacije (shiftService.ts):**
- Broji otvorene račune (`status = 'OPEN'`)
- Agregira promet iz `PAID` računa (`aggregate` na `total`, `whiteTotal`, `blackTotal`)
- Učitava sve `BillItem` iz `PAID` računa u smeni
- Grupira stavke po `productId`, sumira `quantity` i `lineTotal = qty × unitPrice × (1 − discount/100)`
- Sortira po `soldTotal` opadajuće

### Frontend

| Fajl                                       | Izmena                                                 |
|--------------------------------------------|--------------------------------------------------------|
| `src/types/index.ts`                       | Dodati tipovi: `ShiftSummary`, `ShiftRevenue`, `ShiftSalesItem` |
| `src/api/shifts.ts`                        | Dodata funkcija `getShiftSummary(shiftId)`             |
| `src/i18n/sr.json` + `en.json`             | Dodat blok `shifts.summary` (~20 ključeva)             |
| `src/pages/ShiftSummaryPage.tsx`           | Nova stranica (nova komponenta)                        |
| `src/App.tsx`                              | Dodat route `/shift/summary`                           |
| `src/pages/DashboardPage.tsx`              | Dugme "Završi smenu" navigira na `/shift/summary`      |

---

## Prikaz stranice

### Sekcija A — Promet smene

Šest kartica:
| Kartica            | Vrednost                                          |
|--------------------|---------------------------------------------------|
| Ukupan promet      | Suma `total` svih PAID računa                     |
| Ukupno BELO        | Suma `whiteTotal` svih PAID računa                |
| Ukupno CRNO        | Suma `blackTotal` svih PAID računa                |
| Naplaćenih računa  | Broj PAID računa                                  |
| Otkazanih računa   | Broj CANCELLED računa                             |
| Prosečan račun     | Ukupan promet ÷ broj naplaćenih računa            |

### Sekcija B — Prodaja po artiklima

Tabela sa kolonama:
- **Proizvod** — ime na aktivnom jeziku (sr/en)
- **Kategorija** — kategorija na aktivnom jeziku
- **Prodato (kom)** — ukupna količina
- **Belo (kom)** — količina sa bojom WHITE
- **Crno (kom)** — količina sa bojom BLACK
- **Iznos (RSD)** — prihod od ovog artikla

Zadnji red prikazuje zbir svih kolona.

---

## Ključevi prevoda

Svi ključevi su pod `shifts.summary.*` u `sr.json` i `en.json`.

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

## Sledeći korak

**Faza 6.3** dodaje dugme "Potvrdi završetak smene" na ovu stranicu koje zapravo zatvara smenu (poziva `POST /api/v1/shifts/end`).
