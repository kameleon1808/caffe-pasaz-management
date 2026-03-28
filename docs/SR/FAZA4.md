# FAZA 4 — Upravljanje Računima (POS Ekran)

## Pregled

Faza 4 implementira punu funkcionalnost POS ekrana za rad sa računima. Konobar klika na slobodan sto, otvara račun, dodaje stavke iz menija, primenjuje popuste i naplaćuje ili otkazuje račun. Sve promene zaliha i iznosa smene se automatski beleže.

---

## Implementirano

### 1. Kreiranje i otvaranje računa

- Klik na slobodan sto → `POST /bills` → kreiran `Bill` (status `OPEN`), sto postaje zauzet
- Klik na zauzet sto → preusmerenje na `/bills/:openBillId`
- Račun zahteva aktivnu smenu korisnika

### 2. POS ekran (`/bills/:id`) — split layout

**Leva strana — Meni:**
- Vertikalna lista kategorija (klik filtrira proizvode)
- Grid kartica proizvoda sa nazivom i cenom
- Klik na proizvod → dodaje stavku (ili povećava `qty` ako već postoji)

**Desna strana — Račun:**
- Lista stavki: naziv, `[−]` `qty` `[+]`, ukupno po stavci, `[⬜/⬛]`, `[✕]`
- Toggle crno/belo po stavci
- Iznosi na dnu: Belo, Crno, Popust (ako postoji), **Ukupno**

### 3. Popust na račun

- Dugme `%` u zaglavlju → modal za unos procenta (0–100%)
- `PUT /bills/:id/discount` → osvežava `whiteTotal`, `blackTotal`, `total`

### 4. Prebacivanje stola

- Dugme `↔` u zaglavlju → modal sa listom slobodnih stolova
- `PUT /bills/:id/transfer` → stari sto se oslobađa, novi se zauzima

### 5. Naplata

- Zeleno dugme "Naplati" → modal sa pregledom iznosa → potvrda
- `POST /bills/:id/pay` (Prisma transakcija):
  - `Bill.status = PAID`, `paidAt = now()`
  - `Product.stockQuantity -= qty × normQuantity` za svaku stavku
  - Kreira `InventoryLog` (type = `SALE`) za svaku stavku
  - `Shift.totalWhite/Black/Revenue += bill.*Total`
  - `TableUnit.isOccupied = false`

### 6. Otkazivanje

- Crveno dugme "Otkaži račun" → modal sa obaveznom napomenom
- `POST /bills/:id/cancel`:
  - `Bill.status = CANCELLED`
  - `TableUnit.isOccupied = false`
  - Zalihe se **ne** menjaju

### 7. Popust po stavci

- Dugme `%` na svakom `BillItemRow` → modal za unos popusta po stavci (0–100%)
- `PUT /bills/:id/items/:itemId` sa `{ discount }` → preračunava ukupne iznose računa
- Formula za stavku: `qty × unitPrice × (1 − itemDiscount/100)`

### 8. Oduzimanje zaliha prema normativu

- Svaki `Product` ima polje `normQuantity` (`Float`, default `1.0`)
- Pri naplati, zalihe se oduzimaju kao `qty × normQuantity` umesto samo `qty`
- Ovo omogućava proizvode gde jedna prodajna jedinica troši razlomljenu ili višestruku inventarnu jedinicu
  - Primer: čaša piva (`kom`) oduzima `0.5 lit` iz bureta evidentiranog u litrima
- `normQuantity` se postavlja u admin formi `ProductsPage` i čuva u `Product.normQuantity`
- `InventoryLog.changeQty` se takođe beleži kao `-qty × normQuantity`

---

## API Endpointi

| Metod    | Ruta                              | Opis                                          |
|----------|-----------------------------------|-----------------------------------------------|
| `GET`    | `/api/v1/bills/table/:tableId`    | Otvoren račun za sto (ili 404)                |
| `GET`    | `/api/v1/bills/:id`               | Detalji računa sa stavkama                    |
| `POST`   | `/api/v1/bills`                   | Kreiranje `{ tableId }`                       |
| `POST`   | `/api/v1/bills/:id/items`         | Dodaj stavku `{ productId, color? }`          |
| `PUT`    | `/api/v1/bills/:id/items/:itemId` | Izmeni stavku `{ quantity?, unitPrice?, discount?, color? }` |
| `DELETE` | `/api/v1/bills/:id/items/:itemId` | Obriši stavku                                 |
| `PUT`    | `/api/v1/bills/:id/discount`      | Popust `{ discountPercent }`                  |
| `PUT`    | `/api/v1/bills/:id/transfer`      | Prebaci sto `{ tableId }`                     |
| `POST`   | `/api/v1/bills/:id/pay`           | Naplati                                       |
| `POST`   | `/api/v1/bills/:id/cancel`        | Otkaži `{ reason }`                           |

---

## Izračun iznosa

```
whiteRaw = Σ (qty × unitPrice × (1 − itemDiscount/100))  [WHITE stavke]
blackRaw = Σ isto                                          [BLACK stavke]
discFactor = 1 − discountPercent / 100

total      = (whiteRaw + blackRaw) × discFactor
whiteTotal = whiteRaw × discFactor
blackTotal = blackRaw × discFactor
```

Funkcija `recalcBillTotals(billId)` poziva se posle svake izmene stavke ili promene popusta.

---

## Validacije i kodovi grešaka

| Pravilo                              | Kod greške           | HTTP |
|--------------------------------------|----------------------|------|
| Račun mora biti OPEN                 | `BILL_NOT_OPEN`      | 409  |
| Prazni račun pri naplati             | `EMPTY_BILL`         | 400  |
| Novi sto zauzet                      | `TABLE_OCCUPIED`     | 409  |
| Isti sto pri prebacivanju            | `SAME_TABLE`         | 400  |
| Količina < 1                         | `INVALID_QUANTITY`   | 400  |
| Cena ≤ 0                             | `INVALID_PRICE`      | 400  |
| Popust van 0–100                     | `INVALID_DISCOUNT`   | 400  |
| Nedostaje napomena                   | `REASON_REQUIRED`    | 400  |
| Račun ne postoji                     | `BILL_NOT_FOUND`     | 404  |
| Nema aktivne smene                   | `NO_ACTIVE_SHIFT`    | 403  |
| Sto već zauzet                       | `TABLE_ALREADY_OCCUPIED` | 409 |

---

## Struktura fajlova

```
server/
├── services/billService.ts    # recalcBillTotals, getBillById, createBill,
│                              # addItem, updateItem, removeItem, setDiscount,
│                              # transferTable, payBill, cancelBill
└── routes/bills.ts            # Svi endpointi

src/
├── api/bills.ts               # createBill, fetchBill, addBillItem, updateBillItem,
│                              # removeBillItem, setBillDiscount, transferBill,
│                              # payBill, cancelBill
├── types/index.ts             # Bill, BillItem interfejsi
└── pages/BillPage.tsx         # Split-panel POS UI
```

---

## UI komponente (BillPage.tsx)

| Komponenta       | Opis                                              |
|------------------|---------------------------------------------------|
| `MenuPanel`      | Leva strana — kategorije + grid proizvoda         |
| `BillItemRow`    | Red stavke sa `[−]qty[+]`, `%` popust po stavci, toggle boja, brisanje |
| `DiscountModal`  | Unos procenta popusta                             |
| `TransferModal`  | Lista slobodnih stolova                           |
| `CancelModal`    | Obavezna napomena za otkazivanje                  |
| `PayConfirmModal`| Pregled iznosa pred naplatu                       |

---

## Veza sa ostalim fazama

| Faza      | Veza                                                     |
|-----------|----------------------------------------------------------|
| Faza 1    | Auth + JWT — korisnik mora biti ulogovan                |
| Faza 2    | Kategorije i proizvodi — dodaju se kao stavke           |
| Faza 3    | Stolovi + Smene — sto i smena su obavezni               |
| **Faza 4**| **Računi — POS ekran** ✅                               |
| Faza 5    | Izveštaji — zatvoreni računi čine prihod smene          |

---

## Preostalo za Fazu 5

- Štampa računa (termalni štampač)
- Dnevni/nedeljni/mesečni izveštaji prihoda
- Upravljanje korisnicima (admin)
- Isplata plata konobarima
