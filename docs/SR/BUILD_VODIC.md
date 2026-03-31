# Kafic App — Vodič za kreiranje instalera

## Brzi start (preporučeno)

**Duplim klikom pokrenite `BUILDUJ.bat`** u root folderu projekta.

Skript automatski:
1. Proverava Node.js verziju
2. Instalira zavisnosti ako nedostaju
3. Kreira/ažurira bazu sa demo podacima
4. Kompajlira aplikaciju
5. Kreira `.exe` installer
6. Otvara `dist/` folder sa finalnim fajlom

---

## Sistemski zahtevi za build

| Komponenta | Verzija |
|-----------|---------|
| Node.js | 18 ili noviji |
| npm | 8 ili noviji (dolazi sa Node.js) |
| Windows | 10 ili noviji (za kreiranje .exe) |
| RAM | min 4 GB (preporučeno 8 GB) |
| Disk | min 2 GB slobodnog prostora |

> **Napomena:** `.exe` installer za Windows može se kreirati **samo na Windows** mašini.
> Na macOS/Linux electron-builder pravi `.dmg`/`.AppImage` za te platforme.

---

## Instalacija Node.js (ako nije instaliran)

1. Idite na [https://nodejs.org](https://nodejs.org)
2. Preuzmite **LTS** verziju (npr. 20.x)
3. Pokrenite installer i sledite uputstva
4. Proverite instalaciju:
   ```
   node -v
   npm -v
   ```

---

## Korak po korak (ručno, bez BUILDUJ.bat)

Ako preferirate ručno pokretanje svake komande:

```bash
# 1. Instalirajte zavisnosti
npm install

# 2. Generišite Prisma klijenta
npx prisma generate

# 3. Kreirajte/ažurirajte šemu baze
npx prisma db push --accept-data-loss

# 4. Unesite demo podatke
npx tsx prisma/seed.ts

# 5. Build aplikacije (TypeScript + React + Electron)
npm run build

# 6. Kreirajte .exe installer
npx electron-builder --win --x64
```

Alternativno, sve od koraka 1–6 jednom komandom:
```bash
npm run build:installer
```

---

## Šta svaki korak radi

### `npm install`
Preuzima sve JavaScript/TypeScript zavisnosti iz interneta u `node_modules/`.
Preskočiti ako `node_modules/` već postoji (skript to radi automatski).

### `npx prisma generate`
Generiše TypeScript klijentski kod iz `prisma/schema.prisma`.
Mora se pokrenuti svaki put kada se šema promeni.

### `npx prisma db push`
Kreira ili ažurira `prisma/dev.db` SQLite fajl prema trenutnoj šemi.
Ovaj fajl se bundluje u installer — **korisnik ga dobija sa demo podacima**.

### `npx tsx prisma/seed.ts`
Puni bazu sa:
- Admin nalogom (`admin` / `admin123`)
- Konobar nalogom (`konobar` / `konobar123`)
- 6 unutrašnjih + 12 spoljašnjih stolova
- Kategorijama i 77 proizvoda
- Osnovnim podešavanjima kafića

### `npm run build`
Kompajlira sve TypeScript fajlove koristeći `electron-vite`:
- `src/` (React) → `out/renderer/`
- `server/` (Express) → `out/main/`
- `electron/` (Main process) → `out/main/`

### `electron-builder --win --x64`
Pakuje `out/` folder + `prisma/dev.db` u NSIS Windows installer.
Output: `dist/Kafic-App-Setup-1.0.0.exe`

---

## Output fajlovi

Nakon uspešnog build-a u `dist/` folderu nalaze se:

```
dist/
├── Kafic-App-Setup-1.0.0.exe   ← installer koji dajete korisniku
├── win-unpacked/               ← nepakovan build (za testiranje)
│   ├── Kafic App.exe
│   ├── resources/
│   │   ├── app.asar
│   │   └── app.asar.unpacked/
│   │       ├── node_modules/.prisma/
│   │       └── prisma/dev.db   ← seed baza (kopira se na klijenta)
└── builder-effective-config.yaml
```

Distribuirajte **samo** `Kafic-App-Setup-1.0.0.exe`.

---

## Šta se dešava na klijentskom računaru

```
Korisnik pokreće installer
    ↓
Bira folder za instalaciju (default: C:\Program Files\Kafic App\)
    ↓
Installer kopira fajlove
    ↓
Kreira prečicu na Desktop-u i u Start meniju
    ↓
Korisnik otvara aplikaciju (prvi put)
    ↓
electron/main.ts::setupProductionDatabase()
    ↓
Postavlja DATABASE_URL = file:C:\Users\<ime>\AppData\Roaming\Kafic App\kafic.db
    ↓
Kopira bundled prisma/dev.db → kafic.db (samo pri prvom pokretanju)
    ↓
Express server startuje sa ovom bazom
    ↓
Korisnik se prijavljuje: admin / admin123
```

**Baza podataka ostaje u `AppData` folderu korisnika** — deinstalacija aplikacije je ne briše.

---

## Dodavanje ikone aplikacije (opciono)

Bez ikone koristi se podrazumevana Electron ikona.

Za sopstvenu ikonu:

1. Pripremite `logo.png` (minimalno 256×256 px, idealno 512×512)
2. Konvertujte u `.ico` format:
   - Online alat: https://www.icoconverter.com/ (upload PNG, izaberite sve veličine)
   - npm alat: `npx electron-icon-builder --input=logo.png --output=build/`
3. Smestite u `build/icon.ico`
4. Dodajte liniju u `electron-builder.yml`:
   ```yaml
   win:
     icon: build/icon.ico
   ```
5. Ponovo pokrenite build

---

## Česti problemi pri build-u

### "Cannot find module '@prisma/client'"
```bash
npx prisma generate
```

### "NSIS not found" ili "Unable to load nsis module"
electron-builder automatski preuzima NSIS. Ako to ne uspe:
```bash
npm install -g windows-build-tools
```
Ili instalirajte NSIS ručno: https://nsis.sourceforge.io/

### Build se zaustavi na "Packaging for target nsis"
Proverite:
- Slobodan prostor na disku (min 2 GB)
- Antivirus možda blokira — privremeno isključite tokom build-a

### "out/main/main.js not found"
```bash
npm run build
```

### "prisma/dev.db ne postoji"
```bash
npx prisma db push
npx tsx prisma/seed.ts
```

---

## Ažuriranje verzije

Pre novog build-a, promenite verziju u `package.json`:
```json
{
  "version": "1.0.1"
}
```

Installer će se automatski zvati `Kafic-App-Setup-1.0.1.exe`.

---

## Automatizacija (CI/CD)

Za automatski build pri svakom commitu, dodajte GitHub Actions workflow:

```yaml
# .github/workflows/build.yml
name: Build Installer
on:
  push:
    tags: ['v*']
jobs:
  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: node scripts/build-installer.js
      - uses: actions/upload-artifact@v4
        with:
          name: installer
          path: dist/*.exe
```
