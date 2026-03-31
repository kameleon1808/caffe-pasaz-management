# Kafic App — Uputstvo za instalaciju

## Sistemski zahtevi

| Komponenta | Minimum | Preporučeno |
|------------|---------|-------------|
| Operativni sistem | Windows 10 (64-bit) | Windows 11 (64-bit) |
| RAM memorija | 4 GB | 8 GB |
| Slobodan prostor | 500 MB | 1 GB |
| Rezolucija ekrana | 1024×600 | 1280×800 ili više |
| Procesor | Intel Core i3 / AMD Ryzen 3 | Intel Core i5 / AMD Ryzen 5 |

> **Napomena:** Aplikacija ne zahteva internet konekciju — sve radi lokalno.

---

## Preuzimanje instalera

1. Pronađite najnoviji `Kafic-App-Setup-x.x.x.exe` fajl koji ste dobili od razvojnog tima.
2. Proverite da je fajl potpisan — Windows SmartScreen može prikazati upozorenje za nepotpisane aplikacije (vidite odeljak Troubleshooting).

---

## Korak-po-korak instalacija

### Korak 1 — Pokrenite installer

Duplim klikom otvorite `Kafic-App-Setup-x.x.x.exe`.

Ako se pojavi prozor **"Windows zaštitio vaš PC"** (Windows SmartScreen):
1. Kliknite **"Više informacija"**
2. Kliknite **"Svejedno pokreni"**

### Korak 2 — Odaberite folder za instalaciju

Installer prikazuje dijalog za odabir foldera. Preporučena putanja:
```
C:\Program Files\Kafic App\
```

Možete odabrati i drugi folder, npr. `C:\Kafic\` ako nemate administratorske privilegije.

### Korak 3 — Instalacija

Kliknite **"Instaliraj"** i sačekajte da se proces završi (obično 30–60 sekundi).

### Korak 4 — Završetak

Po završetku, installer nudi opcije:
- **Pokreni Kafic App** — pokrenuti aplikaciju odmah
- **Zatvori** — zatvori installer bez pokretanja

Automatski se kreiraju:
- Prečica na radnoj površini (Desktop)
- Unos u Start meniu pod "Kafic App"
- Uninstalator u "Dodaj/ukloni programe"

---

## Prvo pokretanje i konfiguracija

### Inicijalizacija baze podataka

Pri prvom pokretanju aplikacija automatski kreira SQLite bazu podataka i popunjava je demo podacima.

Lokacija baze:
```
C:\Users\<korisnik>\AppData\Roaming\Kafic App\kafic.db
```

### Podrazumevani nalozi

| Uloga | Korisničko ime | Lozinka |
|-------|---------------|---------|
| Administrator | `admin` | `admin123` |
| Konobar | `konobar` | `konobar123` |

> **VAŽNO:** Promenite lozinke odmah po prvom pokretanju u Admin → Korisnici.

### Konfiguracija podataka kafića

Prijavite se kao admin i idite na **Admin → Podešavanja**:
- Naziv kafića
- Adresa
- PIB (za račune)
- Telefon
- Valuta (default: RSD)

---

## Podešavanje štampača

### USB/Serijski štampač

1. Povežite termalni štampač USB kablom
2. Idite na **Admin → Podešavanja → Štampač**
3. Odaberite tip: **USB**
4. Unesite putanju uređaja (npr. `COM3` ili `\\.\USB001`)
5. Kliknite **Test štampa** da proverite konekciju

### Mrežni štampač

1. Povežite štampač na istu lokalnu mrežu kao računar
2. Idite na **Admin → Podešavanja → Štampač**
3. Odaberite tip: **Mreža (Network)**
4. Unesite IP adresu štampača (npr. `192.168.1.100`)
5. Port: `9100` (default za ESC/POS)
6. Kliknite **Test štampa**

### Deaktivacija štampača

Ako ne koristite štampač, odaberite tip: **Onemogućeno** — aplikacija će raditi normalno bez štampe.

---

## Deinstalacija

1. Otvorite **Kontrolna tabla → Programi → Dodaj ili ukloni programe**
2. Pronađite **"Kafic App"**
3. Kliknite **Deinstaliraj**

> **Napomena:** Deinstalacija NE briše bazu podataka ni backup fajlove. Oni ostaju u `AppData\Roaming\Kafic App\` i `~/kafic-backup/`. Možete ih ručno obrisati.

---

## Ažuriranje aplikacije

1. Preuzmite novu verziju instalera
2. Pokrenite ga — installer automatski detektuje postojeću instalaciju i ažurira je
3. Baza podataka i podešavanja se čuvaju tokom ažuriranja

---

## Česta pitanja

**P: Da li mogu instalirati aplikaciju bez administratorskih prava?**
O: Da — odaberite folder u vašem korisničkom profilu (npr. `C:\Users\<korisnik>\Kafic App\`) umesto `Program Files`.

**P: Da li aplikacija radi bez interneta?**
O: Da, potpuno. Nema telemetrije ni cloud zavisnosti.

**P: Mogu li pokrenuti više instanci?**
O: Ne preporučuje se. Baza podataka je lokalna SQLite i nije dizajnirana za konkurentni pristup sa više procesa.
