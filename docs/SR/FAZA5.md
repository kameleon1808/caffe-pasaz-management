# Faza 5 — POS Termalni Štampač

## Pregled

Faza 5 dodaje integraciju sa POS termalnim štampačem. Kada konobar naplati račun, račun se automatski štampa. Administrator može konfigurisati štampač i podatke o kafeu iz admin panela.

---

## Arhitektura štampanja

```
React (BillPage)
  └── POST /api/v1/print/receipt/:billId
       └── Express Route (server/routes/print.ts)
            └── PrinterService (server/lib/printerService.ts)
                 └── node-thermal-printer → TCP/USB štampač
```

Podešavanja štampača se čuvaju u `Setting` tabeli (ključ-vrednost).

---

## Konfiguracija štampača

### Pristup podešavanjima

**Admin → Dashboard → Štampač** (ili direktno `/admin/settings/printer`)

### Polja konfiguracije

| Polje | Tip | Opis |
|-------|-----|------|
| `printer_type` | `usb` / `network` / `disabled` | Tip konekcije |
| `printer_path` | String | IP adresa (za network) ili putanja uređaja (za USB) |
| `printer_port` | Number (1–65535) | TCP port (podrazumevano: 9100) |
| `printer_width` | `48` / `80` | Broj karaktera po liniji |
| `cafe_name` | String | Naziv kafića za zaglavlje |
| `cafe_address` | String | Adresa kafića |
| `cafe_pib` | String | PIB broj za fiskalni pečat |

### Primer: Mrežni štampač (najčešće)

```
Tip: Network (TCP/IP)
IP adresa: 192.168.1.100
Port: 9100
Širina: 48 karaktera
```

### Primer: USB štampač na Windows-u

```
Tip: USB
Putanja: \\.\USB001
         ili
         \\.\COM3 (za serijski)
```

### Primer: USB štampač na Linux-u

```
Tip: USB
Putanja: /dev/usb/lp0
```

---

## Format računa

```
========================================
[NAZIV KAFIĆA]
[ADRESA]
PIB: [PIB BROJ]
========================================
Račun br: 42
Datum: 28.03.2026 14:35
Konobar: Marko Marković
Sto: Sto 3
----------------------------------------
Artikal                   Kol  Ukupno
----------------------------------------
Espreso                     2  300.00 RSD
Coca Cola 0.25l             1  200.00 RSD
Jelen pivo 0.5l             3  750.00 RSD
  Popust: 10%
----------------------------------------
Popust (15%):      -187.50 RSD
========================================
ZA NAPLATU:        1,062.50 RSD
========================================
Hvala na poseti!
28.03.2026 14:35
========================================
```

---

## API Endpointi

### GET `/api/v1/settings/printer`
Vraća trenutna podešavanja štampača. Dostupno svim ulogovanim korisnicima.

### PUT `/api/v1/settings/printer`
Čuva podešavanja štampača. Samo admin.

**Body:**
```json
{
  "printer_type": "network",
  "printer_path": "192.168.1.100",
  "printer_port": "9100",
  "printer_width": "48",
  "cafe_name": "Kafić Pasaz",
  "cafe_address": "Ulica 1, Beograd",
  "cafe_pib": "123456789"
}
```

### POST `/api/v1/print/receipt/:billId`
Štampa račun. Vraća `{success, message}` ili `{error, code}` (503).

### POST `/api/v1/print/test`
Štampa testnu stranicu. Vraća `{success, message}` ili `{error, code}` (503).

---

## Podržani modeli štampača

Biblioteka `node-thermal-printer` koristi ESC/POS protokol koji podržavaju gotovo svi POS štampači:

| Proizvođač | Modeli |
|------------|--------|
| **Epson** | TM-T20, TM-T88, TM-T20III, TM-T82 |
| **Star** | TSP100, TSP143, TSP650 |
| **Bixolon** | SRP-350III, SRP-Q300 |
| **Sewoo** | LK-T210, LK-T212 |
| **Citizen** | CT-E351, CT-S310 |
| Ostali | Bilo koji sa ESC/POS podrškom i mrežnom karticom |

> **Preporuka:** Mrežni štampač (LAN/WiFi) je najpouzdaniji za ovu konfiguraciju.

---

## Upravljanje greškama

### Štampač nije dostupan pri naplati

Ako štampač nije dostupan kada se naplaćuje:
1. Naplata **prolazi** — račun je plaćen u sistemu
2. Prikazuje se **upozorenje** (žuti toast): "Štampač nije dostupan..."
3. Konobar može koristiti dugme **"Ponovo štampaj"** kada se štampač poveže

### Greške i kodovi

| Kod | Uzrok | Rešenje |
|-----|-------|---------|
| `PRINTER_DISABLED` | `printer_type = disabled` | Postavite tip na USB ili Network |
| `PRINTER_ERROR` | Konekcija odbijena | Proverite IP/putanju i da li je štampač uključen |
| `NETWORK_ERROR` | Greška mreže | Proverite mrežnu konekciju |

---

## Troubleshooting

### Štampač ne štampa ništa

1. Proverite da li je štampač **fizički priključen** i **uključen**
2. Kliknite **"Test štampe"** u podešavanjima
3. Za mrežne: pingujte IP adresu (`ping 192.168.1.100`)
4. Proverite da li je **port 9100** otvoren na štampaču

### Tekst je iskrivljen / nerazumljiv

- Pokušajte sa širinom **48** (standardna 80mm rolna)
- Proverite da li štampač podržava ESC/POS protokol

### USB štampač na Windows-u nije prepoznat

- Pokušajte putanje: `\\.\USB001`, `\\.\USB002`, `\\.\COM1`
- Instalirajte drajvere proizvođača
- Mrežna konekcija je pouzdanija alternativa

### Timeout pri konekciji

- Podrazumevani timeout je **5 sekundi**
- Za spore mreže, proverite mrežnu latenciju

---

## Fajlovi implementacije

| Fajl | Opis |
|------|------|
| `server/lib/printerService.ts` | ESC/POS formatiranje i slanje |
| `server/services/settingsService.ts` | Čitanje/čuvanje podešavanja |
| `server/routes/settings.ts` | GET/PUT /settings/printer |
| `server/routes/print.ts` | POST /print/receipt, POST /print/test |
| `src/api/settings.ts` | Frontend API klijent za podešavanja |
| `src/api/print.ts` | Frontend API klijent za štampanje |
| `src/pages/admin/PrinterSettingsPage.tsx` | Admin stranica za konfiguraciju |
| `src/pages/BillPage.tsx` | Auto-štampa pri naplati + "Ponovo štampaj" |
