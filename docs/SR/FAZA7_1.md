# Faza 7.1 — Upravljanje korisnicima i plate

## Pregled

Ova faza implementira kompletan CRUD za korisnike sistema i evidenciju isplata plata konobarima.

## Implementirani fajlovi

### Server

| Fajl | Opis |
|---|---|
| `server/services/userService.ts` | Biznis logika za korisnike (CRUD, soft delete, validacija) |
| `server/services/salaryService.ts` | Biznis logika za isplate plata |
| `server/routes/users.ts` | REST rute za korisnike |
| `server/routes/salaries.ts` | REST rute za plate |

### Frontend

| Fajl | Opis |
|---|---|
| `src/api/users.ts` | API klijent za korisnike |
| `src/api/salaries.ts` | API klijent za plate |
| `src/pages/admin/UsersPage.tsx` | Stranica za upravljanje korisnicima |
| `src/pages/admin/SalariesPage.tsx` | Stranica za isplate plata |

## API Endpointi

### Korisnici (`/api/v1/users`)

| Metoda | Putanja | Opis |
|---|---|---|
| GET | `/` | Lista svih korisnika (bez lozinke) |
| GET | `/:id` | Jedan korisnik po ID-u |
| POST | `/` | Kreiranje novog korisnika |
| PUT | `/:id` | Izmena korisnika |
| DELETE | `/:id` | Deaktivacija (soft delete) |
| PUT | `/:id/reactivate` | Reaktivacija korisnika |

### Plate (`/api/v1/salaries`)

| Metoda | Putanja | Opis |
|---|---|---|
| GET | `/` | Lista isplata (filteri: userId, dateFrom, dateTo) |
| POST | `/` | Nova isplata plate |

## Poslovna pravila

### Korisnici
- Lozinka se hešira bcryptjs-om sa salt rounds = 10
- Username mora biti jedinstven u celom sistemu
- Admin ne može deaktivirati sopstveni nalog
- Korisnik sa aktivnom smenom ne može biti deaktiviran
- Deaktivacija je soft delete (`active = false`), ne fizičko brisanje
- Role su validovane na servisnom sloju: `ADMIN` | `WAITER`

### Plate
- Iznos mora biti pozitivan broj (> 0)
- Datum isplate je opcion — default je trenutno vreme
- Svaka isplata pamti ko ju je kreirao (`paidById` = trenutno ulogovani admin)
- Filtriranje po korisniku i opsegu datuma

## Frontend funkcionalnosti

### UsersPage
- Tabela korisnika sa kolonama: Ime, Username, Rola, Status, Datum kreiranja, Akcije
- Badge za rolu (Administrator/Konobar) i status (Aktivan/Neaktivan)
- Modal za kreiranje: fullName, username, password (min 6 znakova), role dropdown
- Modal za izmenu: fullName, username, opciona nova lozinka
- Confirm dialog za deaktivaciju
- Deaktivacija nije prikazana za sopstveni nalog

### SalariesPage
- Kartice sa ukupno isplaćenim i poslednjom isplatom po konobaru
- Filtri: konobar, od datuma, do datuma
- Tabela istorije sortirana po datumu (desc)
- Modal za isplatu: konobar dropdown (samo aktivni), iznos, datum, napomena
