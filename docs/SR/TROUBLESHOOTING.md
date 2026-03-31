# Kafic App — Rešavanje problema (Troubleshooting)

## Sadržaj
1. [Aplikacija se ne pokreće](#1-aplikacija-se-ne-pokreće)
2. [Greška pri prijavi / Login ne radi](#2-greška-pri-prijavi--login-ne-radi)
3. [Štampač ne radi](#3-štampač-ne-radi)
4. [Problem sa bazom podataka](#4-problem-sa-bazom-podataka)
5. [Aplikacija radi sporo ili se zamrzava](#5-aplikacija-radi-sporo-ili-se-zamrzava)
6. [Podaci se ne prikazuju / prazne stranice](#6-podaci-se-ne-prikazuju--prazne-stranice)
7. [Česti problemi i rešenja](#7-česti-problemi-i-rešenja)

---

## 1. Aplikacija se ne pokreće

### Simptom: Ništa se ne dešava po duplom kliku

**Provere:**
1. Proverite da li je instalacija kompletna — ponovo pokrenite installer
2. Proverite Windows Event Viewer (Preglednik događaja) za detalje o grešci:
   - `Win + R` → `eventvwr` → Windows Logs → Application

**Česta rešenja:**
- **Nedostaje Visual C++ Redistributable** — preuzmite i instalirajte Microsoft Visual C++ Redistributable (x64) sa zvaničnog Microsoft sajta
- **Antivirus blokira pokretanje** — dodajte folder aplikacije u izuzetke antivirusa

---

### Simptom: Aplikacija se otvori i odmah zatvori

**Mogući uzrok:** API server ne može da se pokrene jer je port 3001 zauzet.

**Rešenje:**
1. Otvorite Task Manager (`Ctrl + Shift + Esc`)
2. Pronađite procesom koji koristi port 3001:
   - Otvorite PowerShell kao administrator
   - Pokrenite: `netstat -ano | findstr :3001`
   - Note-ujte PID i u Task Manageru pronađite i završite taj proces
3. Pokrenite aplikaciju ponovo

---

### Simptom: "Windows zaštitio vaš PC" (SmartScreen upozorenje)

Ovo je normalno za aplikacije bez digitalnog potpisa.

**Rešenje:**
1. Kliknite **"Više informacija"**
2. Kliknite **"Svejedno pokreni"**

---

### Simptom: Bela ili crna prazna stranica

**Mogući uzrok:** Renderer process se nije učitao ili API server nije spreman.

**Rešenje:**
1. Sačekajte 10–15 sekundi (posebno pri prvom pokretanju — server treba malo da se inicijalizuje)
2. Ako i dalje prazno — zatvorite i ponovo pokrenite aplikaciju
3. Proverite log fajl: `C:\Users\<korisnik>\kafic-app-logs\app.log`
4. Ako log pokazuje grešku s bazom — deinstalirajte i instalirajte aplikaciju ponovo (baza u `%APPDATA%\caffe-pasaz-management\kafic.db` ostaje nepromenjena)

---

## 2. Greška pri prijavi / Login ne radi

### Simptom: "Pogrešno korisničko ime ili lozinka"

**Proverite:**
- Caps Lock nije uključen
- Koristite tačno korisničko ime (mala slova): `admin` ili `konobar`
- Podrazumevana lozinka: `admin123` / `konobar123`

### Reset admin lozinke

Ako je lozinka promenjena i zaboravljena:

1. Zatvorite aplikaciju
2. Otvorite PowerShell i navigirajte do foldera projekta (dev) ili pronađite `dev.db`
3. Instalirajte SQLite CLI ako ga nemate: https://sqlite.org/download.html
4. Otvorite bazu:
   ```
   sqlite3 "%APPDATA%\Kafic App\kafic.db"
   ```
5. Izvršite SQL za reset lozinke na `admin123`:
   ```sql
   UPDATE User SET password = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCakDJ6bUSSWBbJSb8a3Uiy' WHERE username = 'admin';
   ```
   > Hash odgovara lozinki `admin123`. Za drugu lozinku koristite bcrypt generator.
6. Izađite: `.quit`
7. Pokrenite aplikaciju

---

## 3. Štampač ne radi

### Dijagnostički koraci

**Korak 1 — Proverite konekciju**
- USB: proverte da li Windows prepoznaje štampač (Uređaji i štampači)
- Mreža: pingujte IP adresu štampača (`ping 192.168.1.100`)

**Korak 2 — Proverite podešavanja u aplikaciji**
- Admin → Podešavanja → Štampač
- Proverite tačnost IP adrese / COM porta
- Proverite port (default: 9100 za mrežne, COM3 za USB)

**Korak 3 — Test štampa**
- Kliknite "Test štampa" dugme
- Ako nema odgovora — problem je u konekciji
- Ako se pojavi greška — pogledajte poruku za detalje

---

### Mrežni štampač — česta rešenja

| Problem | Rešenje |
|---------|---------|
| "Connection refused" | Proverite da li je štampač uključen i na mreži |
| "Timeout" | Proverite firewall — dozvolite port 9100 |
| "Wrong IP" | Odštampajte konfiguracionu stranicu štampača za tačnu IP adresu |

### USB/COM štampač — česta rešenja

| Problem | Rešenje |
|---------|---------|
| Nema COM porta | Instalirajte drajvere za štampač |
| "Port is busy" | Drugi program koristi COM port — zatvorite ga |
| Štampa nerazumljive znakove | Proverite širinu papira (48 vs 80) u podešavanjima |

---

### Privremeni rad bez štampača

Ako štampač nije dostupan:
1. Admin → Podešavanja → Tip štampača: **Onemogućeno**
2. Aplikacija nastavlja rad normalno bez štampe

---

## 4. Problem sa bazom podataka

### Simptom: "Database is locked" greška

**Uzrok:** Više procesa pokušava da pristupi SQLite fajlu istovremeno.

**Rešenje:**
1. Zatvorite sve instance aplikacije
2. Proverite Task Manager za zaostale `Kafic App.exe` procese i završite ih
3. Pokrenite aplikaciju ponovo

---

### Simptom: Podaci su nestali / baza je prazna

**Rešenje — Restore iz backup-a:**
1. Pronađite backup fajlove u: `C:\Users\<korisnik>\kafic-backup\`
2. Pokrenite aplikaciju i prijavite se (ako je moguće)
3. Admin → Podešavanja → Backup → odaberite poslednji backup → Restore
4. Aplikacija se restartuje sa obnovljenim podacima

**Ako aplikacija uopšte ne može da se pokrene:**
1. Pronađite `kafic.db` u `%APPDATA%\Kafic App\`
2. Obrišite ili preimenujte oštećeni fajl
3. Kopirajte backup fajl iz `~/kafic-backup/` i preimenujte ga u `kafic.db`
4. Pokrenite aplikaciju

---

### Simptom: "Migration failed" pri pokretanju

**Rešenje:**
1. Pronađite `kafic.db` u `%APPDATA%\Kafic App\`
2. Napravite ručni backup kopiranjem fajla
3. Obrišite original `kafic.db`
4. Pokrenite aplikaciju — kreira se nova, prazna baza
5. Ako je potrebno, restore-ujte iz backup-a

---

## 5. Aplikacija radi sporo ili se zamrzava

### Provera resursa

1. Otvorite Task Manager (`Ctrl + Shift + Esc`)
2. Proverite CPU i RAM upotrebu za `Kafic App.exe`

**Ako CPU konstantno 80%+:**
- Može biti prouzrokovano ogromnom količinom podataka u bazi
- Proverite veličinu `kafic.db` fajla — ako je > 100 MB, kontaktirajte razvojni tim

**Ako RAM > 500 MB:**
- Zatvorite i ponovo pokrenite aplikaciju
- Provjerite da li ima memory leak (developer meni: Ctrl+Shift+I ako je dostupno)

---

### Čišćenje log fajlova

Log fajlovi se automatski rotiraju, ali ih možete ručno obrisati:
```
C:\Users\<korisnik>\kafic-app-logs\
```
Fajlovi su bezbedni za brisanje dok aplikacija ne radi.

---

## 6. Podaci se ne prikazuju / prazne stranice

### Simptom: Prazna lista, spinner ne nestaje

**Mogući uzrok:** API server nije pokrenut ili ne odgovara.

**Rešenje:**
1. Zatvorite i ponovo pokrenite aplikaciju
2. Proverite log: `C:\Users\<korisnik>\kafic-app-logs\app.log`
3. Potražite linije koje sadrže `ERROR` ili `server start`

---

### Simptom: "Unauthorized" ili "Session expired"

**Rešenje:**
1. Odjavite se (kliknite na korisničko ime → Odjava)
2. Prijavite se ponovo
3. JWT token je istekao (automatski se osvežava ali može doći do edge case-a)

---

## 7. Česti problemi i rešenja

| Simptom | Verovatni uzrok | Rešenje |
|---------|----------------|---------|
| "Port 3001 already in use" | Stara instanca aplikacije | Task Manager → završite Kafic App procese |
| Račun se ne zatvara | Sto je zauzet drugom sesmom | Odjavite se i prijavite ponovo |
| Cene su pogrešne | Cache nije osvežen | F5 ili ponovo učitajte stranicu |
| Izveštaj pokazuje 0 | Nema smena u izabranom periodu | Proverite filter datuma |
| Backup se ne kreira | Folder nije dostupan | Admin → Podešavanja → promenite backup folder |
| Jezik se ne menja | i18n cache | Zatvorite i ponovo otvorite aplikaciju |
| Tastaura ne reaguje | Focus nije na polju | Kliknite na input polje, pa kucajte |

---

## Lokacija log fajlova

| Tip | Lokacija |
|-----|----------|
| Aplikacioni log | `C:\Users\<korisnik>\kafic-app-logs\app.log` |
| Stari log | `C:\Users\<korisnik>\kafic-app-logs\app.<timestamp>.log` |
| Backup fajlovi | `C:\Users\<korisnik>\kafic-backup\` (default) |
| Baza podataka | `C:\Users\<korisnik>\AppData\Roaming\Kafic App\kafic.db` |

---

## Kontakt za podršku

Ako problem i dalje postoji nakon primene ovih rešenja, pošaljite:
1. Sadržaj log fajla (`app.log`)
2. Opis problema i koraci da se reprodukuje
3. Verzija operativnog sistema
4. Verzija aplikacije (prikazuje se u App → About ili u nazivu instalera)
