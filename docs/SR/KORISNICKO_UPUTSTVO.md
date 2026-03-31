# Kafic App — Korisničko uputstvo (Konobar)

## Sadržaj
1. [Prijava i promena jezika](#1-prijava-i-promena-jezika)
2. [Početni ekran](#2-početni-ekran)
3. [Započinjanje smene](#3-započinjanje-smene)
4. [Rad sa stolovima](#4-rad-sa-stolovima)
5. [Otvaranje i upravljanje računom](#5-otvaranje-i-upravljanje-računom)
6. [Dodavanje stavki na račun](#6-dodavanje-stavki-na-račun)
7. [Popusti i posebne opcije](#7-popusti-i-posebne-opcije)
8. [Naplata i štampa računa](#8-naplata-i-štampa-računa)
9. [Završetak smene](#9-završetak-smene)

---

## 1. Prijava i promena jezika

### Prijava

**[Screenshot: Ekran za prijavu]**

1. Otvorite aplikaciju — prikazuje se ekran za prijavu
2. Unesite **Korisničko ime** i **Lozinku**
3. Kliknite **Prijavi se**

> Podrazumevani nalog: `konobar` / `konobar123`
> Lozinku menja Administrator u Admin → Korisnici.

### Promena jezika

U gornjem desnom uglu prikazuje se trenutni jezik (**SR** ili **EN**).
Kliknite na dugme da prebacite između srpskog i engleskog.

---

## 2. Početni ekran

**[Screenshot: Dashboard]**

Nakon prijave prikazuje se dashboard sa:
- Kartica **Aktivna smena** — da li je smena otvorena i ko je otvorio
- Kartica **Stolovi** — brzi pristup rasporedu stolova
- Kartica **Aktivni računi** — broj otvorenih računa

---

## 3. Započinjanje smene

> **Važno:** Bez otvorene smene nije moguće raditi sa stolovima ni otvarati račune.

**[Screenshot: Poruka "Nema aktivne smene"]**

1. Kliknite na **"Započni smenu"** dugme (prikazuje se ako nema aktivne smene)
2. Potvrdite u dijalogu
3. Smena se otvara — prikazuje se vaše ime i vreme početka

---

## 4. Rad sa stolovima

### Prikaz rasporeda stolova

**[Screenshot: Raspored stolova — unutrašnji prostori]**

Navigirajte na **Stolovi** iz menija ili dashboarda.
Stolovi su podeljeni na dve zone:
- **Unutrašnji** (oznake U1–U6) — prikazani plavom bojom
- **Spoljašnji** (oznake S1–S12) — prikazani zelenom bojom

Boje stola:
| Boja | Značenje |
|------|----------|
| Siva | Slobodan sto |
| Narandžasta/Crvena | Zauzet sto (ima otvoren račun) |

### Otvaranje stola

Kliknite na slobodan sto da biste otvorili novi račun za njega.

---

## 5. Otvaranje i upravljanje računom

### Novi račun

**[Screenshot: POS ekran]**

Po kliku na slobodan sto automatski se otvara POS ekran sa praznim računom.

Elementi POS ekrana:
- **Leva strana** — lista stavki na tekućem računu
- **Desna strana** — kategorije i proizvodi za dodavanje

### Povratak na zauzet sto

Kliknite na zauzet sto (narandžast/crven) da biste nastavili rad na otvorenom računu.

---

## 6. Dodavanje stavki na račun

**[Screenshot: Odabir kategorije i proizvoda]**

1. U desnom panelu odaberite **kategoriju** (Kafa, Pivo, Sokovi...)
2. Kliknite na **naziv proizvoda** da biste ga dodali
3. Stavka se pojavljuje u listi računa sa količinom 1

### Promena količine

- Kliknite **+** ili **−** pored stavke za povećanje/smanjenje količine
- Unesite broj direktno u polje količine
- Kliknite **X** da biste uklonili stavku sa računa

### Belo / Crno (White / Black)

Svaka stavka može biti označena kao:
- **Belo** — normalna transakcija (prikazana belo)
- **Crno** — gotovinska transakcija koja se ne evidentira zvanično (prikazana crno)

Kliknite na indikator boje pored stavke da prebacite između belo/crno.

---

## 7. Popusti i posebne opcije

### Popust na račun

**[Screenshot: Polje za unos popusta]**

1. Na dnu liste računa pronađite polje **"Popust (%)"**
2. Unesite procenat popusta (npr. `10` za 10%)
3. Ukupan iznos se automatski ažurira

### Prebacivanje stola (Transfer)

Ako gosti prelaze sa jednog stola na drugi:

1. U POS ekranu kliknite **"Prebaci sto"**
2. Odaberite ciljni (prazni) sto
3. Račun se prebacuje — prethodni sto postaje slobodan

---

## 8. Naplata i štampa računa

### Naplata

**[Screenshot: Potvrda naplate]**

1. Kliknite **"Naplati"** dugme na dnu POS ekrana
2. Prikazuje se ukupan iznos za naplatu
3. Potvrdite naplatu klikom na **"Potvrdi naplatu"**
4. Račun se zatvara, sto postaje slobodan

### Štampa računa

Po potvrdi naplate:
- Ako je štampač konfigurisan, račun se **automatski štampa**
- Za ponovnu štampu: pronađite račun u istoriji i kliknite **"Štampaj ponovo"**

### Otkazivanje računa

Ako je potrebno poništiti račun bez naplate:
1. Kliknite **"Otkaži račun"**
2. Unesite razlog (opciono)
3. Potvrdite — račun dobija status CANCELLED

---

## 9. Završetak smene

> Smenu završava konobar koji ju je otvorio, ili administrator.

**[Screenshot: Ekran za pregled smene]**

### Pregled smene pre završetka

1. Kliknite na **"Završi smenu"** u glavnom meniju
2. Prikazuje se **izveštaj smene** sa:
   - Ukupan promet (belo/crno)
   - Broj naplaćenih/otkazanih računa
   - Prodaja po artiklima
   - Stanje magacina

### Popis magacina

**[Screenshot: Sekcija magacin]**

Na ekranu završetka smene možete:
- Videti koliko je čega potrošeno
- Uneti ručne korekcije (rashod/kalo) ako je potrebno
- Dodati napomenu uz svaku korekciju

### Potvrda završetka

Kliknite **"Završi smenu"** na dnu ekrana da potvrdite kraj smene.
Aplikacija opciono može odštampati sažetak smene.

---

## Prečice na tastaturi

| Prečica | Akcija |
|---------|--------|
| `F5` | Osvežiti raspored stolova |
| `Esc` | Zatvoriti modalni dijalog |
| `Enter` | Potvrditi akciju u dijalogu |

---

## Napomene

- Nemojte zatvarati aplikaciju usred naplate — uvek završite transakciju
- Backup se kreira automatski pri svakom zatvaranju aplikacije
- Ako se aplikacija sruši, podaci ostaju sačuvani u bazi — ponovo pokrenite
