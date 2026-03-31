# Kafic App — Administratorsko uputstvo

## Sadržaj
1. [Prijava i navigacija](#1-prijava-i-navigacija)
2. [Admin dashboard](#2-admin-dashboard)
3. [Upravljanje kategorijama](#3-upravljanje-kategorijama)
4. [Upravljanje proizvodima](#4-upravljanje-proizvodima)
5. [Upravljanje magacinom](#5-upravljanje-magacinom)
6. [Upravljanje stolovima](#6-upravljanje-stolovima)
7. [Upravljanje korisnicima](#7-upravljanje-korisnicima)
8. [Evidencija plata](#8-evidencija-plata)
9. [Izveštaji i export](#9-izveštaji-i-export)
10. [Istorija smena](#10-istorija-smena)
11. [Podešavanja kafića i štampača](#11-podešavanja-kafića-i-štampača)
12. [Backup i restore](#12-backup-i-restore)

---

## 1. Prijava i navigacija

Prijavite se sa nalogom koji ima ulogu **ADMIN**:
- Korisničko ime: `admin`
- Lozinka: `admin123` (promeniti pri prvom pokretanju!)

Admin meni sadrži sve stavke iz korisničkog menija plus:
- **Admin → Dashboard** — statistike kafića
- **Admin → Korisnici** — upravljanje nalozima
- **Admin → Plate** — evidencija isplata
- **Admin → Izveštaji** — analitički izveštaji
- **Admin → Smene** — istorija svih smena
- **Admin → Podešavanja** — konfiguracija aplikacije

---

## 2. Admin dashboard

**[Screenshot: Admin dashboard]**

Prikazuje ključne metrike u realnom vremenu:

| Kartica | Opis |
|---------|------|
| Danas | Promet tekućeg dana |
| Mesec | Promet tekućeg meseca |
| Poslednjih 7 dana | Trend po danima (grafikon) |
| Top 5 proizvoda | Najprodavaniji artikli |
| Belo/crno | Odnos bele i crne gotovine |
| Po kategorijama | Distribucija prometa po kategorijama |

---

## 3. Upravljanje kategorijama

Navigirajte na **Kategorije** iz glavnog menija.

### Kreiranje kategorije

**[Screenshot: Forma za novu kategoriju]**

1. Kliknite **"Nova kategorija"**
2. Unesite naziv na srpskom i engleskom
3. Podesite redosled sortiranja
4. Kliknite **Sačuvaj**

### Izmena kategorije

Kliknite ikonu **olovke** pored naziva kategorije.

### Brisanje kategorije

Kategorija se može deaktivirati (soft delete) — neće biti vidljiva u POS ekranu, ali ostaje u bazi za istorijske podatke.

---

## 4. Upravljanje proizvodima

Navigirajte na **Proizvodi** iz glavnog menija.

### Dodavanje novog proizvoda

**[Screenshot: Forma za novi proizvod]**

1. Kliknite **"Novi proizvod"**
2. Popunite polja:
   - **Naziv (SR/EN)** — obavezno na oba jezika
   - **Kategorija** — odaberite iz padajućeg menija
   - **Cena** — u RSD (ili konfiguriranoj valuti)
   - **Jedinica mere** — `kom`, `lit`, `dcl`, `flaša`, `g`
   - **Normativ** — koliko jedinica se oduzima iz zaliha po prodaji (default: 1.0)
   - **Početna zaliha** — početna količina na lageru
3. Kliknite **Sačuvaj**

### Izmena cene ili podataka

Kliknite ikonu **olovke** pored proizvoda.

> Izmena cene ne utiče na prethodno naplaćene račune.

### Deaktivacija proizvoda

Deaktivirani proizvodi ne prikazuju se u POS ekranu ali ostaju u bazi.

---

## 5. Upravljanje magacinom

Navigirajte na **Magacin** iz glavnog menija.

### Pregled stanja

**[Screenshot: Lista magacina]**

Tabela prikazuje za svaki proizvod:
- Trenutna zaliha
- Minimalni prag (crvena boja ako je ispod praga)
- Jedinica mere

### Nabavka (Ulaz robe)

1. Pronađite proizvod u listi
2. Kliknite **"Ulaz"** ili ikonicu za nabavku
3. Unesite količinu i napomenu
4. Potvrdi — zaliha se povećava

### Ručna korekcija zalihe

Za korekcije tipa rashod, kalo ili popis:
1. Kliknite **"Korekcija"** pored proizvoda
2. Odaberite tip: **RASHOD** ili **KOREKCIJA**
3. Unesite količinu (pozitivna = povećanje, negativna = smanjenje)
4. Dodajte napomenu (obavezno za rashode)

### Prag minimalne zalihe

Podesite minimalni prag u **Admin → Podešavanja → min_stock_threshold**.
Proizvodi ispod praga obeležavaju se crvenom bojom.

---

## 6. Upravljanje stolovima

Navigirajte na **Raspored stolova** (ikonica olovke/uređivanje pored prikaza stolova).

### Dodavanje stola

1. Kliknite **"Dodaj sto"**
2. Unesite naziv (npr. `Sto T1`)
3. Odaberite zonu: **Unutrašnji** / **Spoljašnji**
4. Kliknite Sačuvaj — sto se pojavljuje na rasporedu

### Premeštanje stola (Drag & Drop)

U modu uređivanja: uhvatite i prevucite sto na željenu poziciju.

### Deaktivacija stola

Deaktivirani stolovi ne prikazuju se korisnicima.

---

## 7. Upravljanje korisnicima

Navigirajte na **Admin → Korisnici**.

### Kreiranje novog korisnika

**[Screenshot: Forma za novog korisnika]**

1. Kliknite **"Novi korisnik"**
2. Popunite:
   - **Puno ime** — prikazuje se u sistemu
   - **Korisničko ime** — za prijavu
   - **Lozinka** — minimum 6 karaktera
   - **Uloga** — `ADMIN` ili `WAITER`
3. Kliknite **Sačuvaj**

### Izmena korisnika

Kliknite ikonu **olovke** — možete promeniti ime, lozinku i ulogu.

### Deaktivacija korisnika

Deaktivirani korisnik ne može se prijaviti ali njegovi podaci ostaju u sistemu.

### Reaktivacija korisnika

Kliknite **"Reaktiviraj"** pored deaktiviranog korisnika.

---

## 8. Evidencija plata

Navigirajte na **Admin → Plate**.

### Evidencija isplate

**[Screenshot: Forma za isplatu plate]**

1. Kliknite **"Nova isplata"**
2. Odaberite **korisnika**
3. Unesite **iznos** u RSD
4. Dodajte **napomenu** (opciono)
5. Kliknite **Sačuvaj**

### Pregled isplata

Tabela prikazuje sve isplate sa filterima:
- Po korisniku
- Po datumu (od/do)

---

## 9. Izveštaji i export

Navigirajte na **Admin → Izveštaji**.

### Dostupni izveštaji

| Izveštaj | Opis |
|----------|------|
| Dnevni | Promet za izabrani dan |
| Nedeljni | Promet za izabranu nedelju |
| Mesečni | Promet za izabrani mesec |
| Prilagođeni period | Slobodan izbor datuma od/do |

### Sadržaj izveštaja

Svaki izveštaj prikazuje:
- **Sažetak** — ukupan promet, belo/crno, broj računa, prosečan račun
- **Top proizvodi** — rang lista najprodavanijih artikala
- **Promet po danima** — grafikon (bar chart)
- **Promet po konobaru** — koliko je ko ostvario
- **Po kategorijama** — pie chart distribucija
- **Poređenje** — % rast/pad u odnosu na prethodni period

### Export podataka

U gornjem desnom uglu svakog izveštaja:
- **PDF** — kliknite ikonu PDF-a za download
- **Excel** — kliknite ikonu tabele za download

---

## 10. Istorija smena

Navigirajte na **Admin → Smene**.

Prikazuje sve smene sa:
- Ko je otvorio/zatvorio smenu
- Vreme početka i kraja
- Ukupan promet (belo/crno)
- Broj naplaćenih računa

Kliknite na smenu za detaljan prikaz (isti ekran kao konobar vidi pri završetku smene).

---

## 11. Podešavanja kafića i štampača

Navigirajte na **Admin → Podešavanja**.

### Podaci kafića

| Polje | Opis |
|-------|------|
| Naziv kafića | Prikazuje se na računima i PDF-ovima |
| Adresa | Prikazuje se na računima |
| PIB | Poreski identifikacioni broj |
| Telefon | Kontakt telefon |
| Valuta | Simbol valute (default: RSD) |
| Min. zaliha | Prag upozorenja za magacin |

### Podešavanja štampača

| Polje | Opis |
|-------|------|
| Tip štampača | USB / Mreža / Onemogućeno |
| IP adresa / COM port | Zavisno od tipa |
| Port | TCP port (default: 9100) |
| Širina papira | 48 ili 80 karaktera po redu |

**Test štampa:** Kliknite dugme da verifikujete konekciju.

---

## 12. Backup i restore

Navigirajte na **Admin → Podešavanja → Backup**.

### Ručni backup

1. Kliknite **"Kreiraj backup"**
2. Backup se čuva u konfiguriranom folderu
3. Prikazuje se lista svih backup-ova sa datumima i veličinama

### Automatski backup

Aplikacija **automatski kreira backup** pri svakom zatvaranju.
Čuva se poslednjih **30 backup fajlova**.

### Promena foldera za backup

1. Kliknite **"Promeni folder"**
2. Odaberite željeni folder (preporučuje se eksterni disk ili mrežni share)

### Restore iz backup-a

> **Upozorenje:** Restore zamenjuje trenutnu bazu. Napravite novi backup pre restore-a!

1. U listi backup-ova, kliknite **"Restore"** pored željenog fajla
2. Potvrdite u dijalogu
3. Aplikacija se automatski restartuje sa obnovljenim podacima

### Format backup fajla

```
kafic_backup_YYYY-MM-DD_HH-mm.db
```

Primer: `kafic_backup_2025-03-15_14-30.db`

---

## Preporučene redovne aktivnosti

| Aktivnost | Učestalost |
|-----------|------------|
| Pregled dnevnog izveštaja | Svaki dan |
| Provjera stanja magacina | Svaki dan |
| Pregled nedeljnog izveštaja | Svake nedelje |
| Ručni backup na eksterni disk | Jednom nedeljno |
| Izmena lozinki korisnika | Svakih 3 meseca |
