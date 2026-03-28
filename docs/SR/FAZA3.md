# FAZA 3 — Grafički Prikaz Stolova i Upravljanje Smenama

## Pregled

Faza 3 dodaje centralnu operativnu funkcionalnost: vizuelni raspored stolova po zonama i sistem smena koji kontroliše pristup radu sa stolovima.

---

## Implementirane Funkcionalnosti

### 1. Vizuelni Prikaz Stolova (`/tables`)

- Dva taba/zone: **Unutrašnjost (INDOOR)** i **Spoljna terasa (OUTDOOR)**
- Svaki sto prikazan kao interaktivna kartica:
  - **Zelena** — sto je slobodan
  - **Crvena** — sto je zauzet (postoji otvoren račun)
- Na zauzetim stolovima prikazuje se ukupan iznos otvorenog računa u RSD
- Automatsko osvežavanje svake 30 sekundi
- Zaštićeno `ShiftGuard` komponentom — korisnik mora imati aktivnu smenu
- Priprema za Fazu 4 (klikovi na stolove za otvaranje/pregled računa)

### 2. Admin Editor Rasporeda Stolova (`/admin/table-layout`)

- Lista svih stolova za svaku zonu (INDOOR / OUTDOOR tabovi)
- Kreiranje novog stola: naziv, zona, opcione koordinate (X, Y)
- Brisanje stola (soft delete) uz zaštitu — ne može se obrisati sto sa otvorenim računima
- Resetovanje pozicija na defaultni raspored (6 unutrašnjih 2×3, 12 spoljašnjih 3×4)
- Dostupno samo adminima

### 3. Upravljanje Smenama

- **Početak smene**: korisnik (admin ili konobar) mora pokrenuti smenu pre rada sa stolovima
- **Kraj smene**: nije dozvoljen dok ima otvorenih računa
- Na kraju smene automatski se izračunavaju ukupni prihodi
- `ShiftGuard` komponenta blokira pristup `/tables` bez aktivne smene
- Status smene vidljiv u header-u i na dashboard-u

### 4. Header — Status Smene

- Prikazuje "Smena aktivna od HH:MM" ako je smena pokrenuta
- Dugme za brzo završavanje smene direktno iz header-a
- Pulsujući zeleni indikator dok je smena aktivna

---

## API Endpointi

### Stolovi (`/api/v1/tables`)

| Metoda | Putanja                    | Auth         | Opis                          |
|--------|----------------------------|--------------|-------------------------------|
| GET    | `/api/v1/tables`           | korisnik     | Lista aktivnih stolova sa statusom |
| GET    | `/api/v1/tables/:id`       | korisnik     | Jedan sto                     |
| POST   | `/api/v1/tables`           | admin        | Kreiraj novi sto              |
| PUT    | `/api/v1/tables/:id`       | admin        | Ažuriraj podatke stola        |
| PUT    | `/api/v1/tables/:id/position` | admin     | Ažuriraj poziciju stola       |
| DELETE | `/api/v1/tables/:id`       | admin        | Soft delete stola             |

**GET /api/v1/tables** vraća:
```json
[
  {
    "id": 1,
    "label": "Sto U1",
    "zone": "INDOOR",
    "positionX": 50,
    "positionY": 50,
    "isOccupied": false,
    "active": true,
    "openBillTotal": 0,
    "openBillId": null
  }
]
```

### Smene (`/api/v1/shifts`)

| Metoda | Putanja                  | Auth     | Opis                              |
|--------|--------------------------|----------|-----------------------------------|
| POST   | `/api/v1/shifts/start`   | korisnik | Pokreni novu smenu                |
| POST   | `/api/v1/shifts/end`     | korisnik | Završi aktivnu smenu              |
| GET    | `/api/v1/shifts/active`  | korisnik | Trenutna aktivna smena ili `null` |
| GET    | `/api/v1/shifts/history` | korisnik | Istorija smena                    |

**Kodovi grešaka:**
- `SHIFT_ALREADY_ACTIVE` (409) — pokušaj pokretanja dok je smena već aktivna
- `SHIFT_NOT_ACTIVE` (404) — pokušaj završavanja bez aktivne smene
- `SHIFT_HAS_OPEN_BILLS` (409) — završavanje sa otvorenim računima

---

## Struktura Fajlova

### Backend

```
server/
├── services/
│   ├── tableService.ts      # CRUD za stolove + status otvorenih računa
│   └── shiftService.ts      # Pokretanje/završetak smena + validacije
├── routes/
│   ├── tables.ts            # REST endpoints za stolove
│   └── shifts.ts            # REST endpoints za smene
└── middleware/
    └── checkActiveShift.ts  # Provera aktivne smene (za buduću upotrebu u Fazi 4)
```

### Frontend

```
src/
├── api/
│   ├── tables.ts            # API klijent za stolove
│   └── shifts.ts            # API klijent za smene
├── context/
│   └── ShiftContext.tsx     # React context za stanje smene
├── hooks/
│   └── useShift.ts          # Hook za pristup ShiftContext-u
├── components/
│   └── ShiftGuard.tsx       # Guard komponenta — blokira bez smene
└── pages/
    ├── TablesPage.tsx        # Vizuelni prikaz stolova
    └── admin/
        └── TableLayoutPage.tsx  # Admin editor rasporeda
```

---

## Poslovna Pravila

1. **Jedna smena u isto vreme** — korisnik ne može imati više od jedne aktivne smene
2. **Smena pre stolova** — pristup `/tables` zahteva aktivnu smenu (ShiftGuard)
3. **Kraj smene uz otvorene račune** — nije dozvoljen; korisnik mora zatvoriti sve račune
4. **Brisanje stola uz otvorene račune** — nije dozvoljeno (soft delete zaštita)
5. **isOccupied se izvodi** — ne čuva se direktno u bazi, već se izračunava iz postojanja otvorenog Bill-a

---

## Default Raspored Stolova (Seed)

- **6 unutrašnjih stolova** (U1–U6): raspored 2 reda × 3 kolone, razmak 200px
- **12 spoljašnjih stolova** (S1–S12): raspored 3 reda × 4 kolone, razmak 180px

Pokretanje seeda: `tsx prisma/seed.ts`

---

## Prevodi (i18n)

Ključevi dodati u `sr.json` i `en.json`:
- `tables.*` — svi tekstovi za prikaz stolova
- `tableLayout.*` — svi tekstovi za admin editor
- `shifts.*` — svi tekstovi za upravljanje smenama

---

## Veza sa Ostalim Fazama

| Faza | Veza |
|------|------|
| Faza 1 | Auth + JWT (korisnik mora biti ulogovan) |
| Faza 2 | Kategorije i proizvodi (koriste se u računima) |
| **Faza 3** | **Stolovi + Smene** |
| Faza 4 | Računi (Bills) — klikovi na stolove vode do otvaranja/pregleda računa |
| Faza 5 | Izveštaji — smene imaju prihode, koristiće se u izveštajima |
