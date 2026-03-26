# Faza 1 — Temelj: Scaffold, Autentifikacija, Baza podataka, Internacionalizacija

## Šta je urađeno

Ova faza postavlja kompletan temelj aplikacije:

- **Electron aplikacija** sa React renderom i preload skriptom
- **Express API server** koji radi unutar Electron main procesa
- **SQLite baza** sa Prisma ORM-om i kompletnom šemom
- **JWT autentifikacija** sa bcrypt hashovanjem lozinki
- **React Router** sa zaštićenim rutama i role-based pristupom
- **Tailwind CSS** sa prilagođenom tamnom paletom boja
- **react-i18next** internacionalizacija (srpski default, engleski opcija)
- **Seed podaci** (admin nalog, stolovi, kategorije)

---

## Uputstvo za pokretanje

### 1. Instaliraj zavisnosti

```bash
npm install
```

### 2. Postavi bazu podataka

```bash
# Generiši Prisma klijent
npx prisma generate

# Kreiraj bazu i tabele
npx prisma db push

# Popuni sa početnim podacima
tsx prisma/seed.ts
```

Ili sve odjednom:
```bash
npm run setup
```

### 3. Pokreni aplikaciju u development modu

```bash
npm run dev
```

Ovo pokreće:
- Electron Vite dev server za React (port 5173)
- Electron main process koji pokreće Express server (port 3001)
- BrowserWindow sa Vite dev server URL-om

### 4. Build za produkciju

```bash
npm run build
```

### 5. Pakovanje u .exe

```bash
npm run package
```

Izlaz se nalazi u `dist/` folderu.

---

## Pristupni podaci za testiranje

| Korisničko ime | Lozinka    | Uloga         |
|----------------|------------|---------------|
| `admin`        | `admin123` | Administrator |

---

## Struktura projekta

```
caffe-pasaz-management/
├── electron/                # Electron main process
│   ├── main.ts              # Ulazna tačka — pokreće server i window
│   └── preload.ts           # Bezbedni bridge main↔renderer
│
├── src/                     # React frontend (renderer process)
│   ├── api/                 # HTTP klijenti za server
│   │   └── auth.ts
│   ├── components/          # UI komponente
│   │   ├── Layout/
│   │   │   ├── MainLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Header.tsx
│   │   ├── LanguageSwitcher.tsx
│   │   └── ProtectedRoute.tsx
│   ├── context/             # React Context providers
│   │   └── AuthContext.tsx
│   ├── hooks/               # Custom hooks
│   │   └── useAuth.ts
│   ├── i18n/                # Prevodi
│   │   ├── index.ts         # i18n konfiguracija
│   │   ├── sr.json          # Srpski
│   │   └── en.json          # Engleski
│   ├── pages/               # Stranice
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   └── PlaceholderPage.tsx
│   ├── types/               # TypeScript tipovi
│   │   └── index.ts
│   ├── utils/               # Pomoćne funkcije
│   │   └── token.ts
│   ├── App.tsx              # Routing i provajderi
│   ├── main.tsx             # React ulazna tačka
│   ├── index.html           # HTML šablon
│   └── index.css            # Globalni stilovi + Tailwind
│
├── server/                  # Express API (radi u main procesu)
│   ├── routes/
│   │   └── auth.ts          # /api/v1/auth/*
│   ├── middleware/
│   │   ├── auth.ts          # requireAuth, requireAdmin
│   │   ├── errorHandler.ts  # Centralni error handler
│   │   └── logger.ts        # Request logger
│   ├── services/
│   │   └── authService.ts   # Poslovna logika za auth
│   └── index.ts             # Express konfiguracija
│
├── prisma/
│   ├── schema.prisma        # Šema baze podataka
│   └── seed.ts              # Inicijalni podaci
│
├── docs/
│   ├── SR/FAZA1.md          # Ova dokumentacija
│   └── EN/PHASE1.md         # Engleski prevod
│
├── electron.vite.config.ts  # Build konfiguracija
├── tailwind.config.js       # Tailwind konfiguracija
├── tsconfig.json            # TypeScript (renderer)
├── tsconfig.node.json       # TypeScript (main + server)
├── electron-builder.yml     # Pakovanje u .exe
└── package.json
```

---

## API endpointi

### Autentifikacija

#### `POST /api/v1/auth/login`
Prijava korisnika.

**Telo zahteva:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Uspešan odgovor (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "username": "admin",
      "fullName": "Administrator",
      "role": "ADMIN"
    }
  }
}
```

**Greška (401):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Pogrešno korisničko ime ili lozinka / Invalid username or password"
  }
}
```

#### `GET /api/v1/auth/me`
Profil ulogovanog korisnika. Zahteva `Authorization: Bearer <token>` header.

#### `POST /api/v1/auth/logout`
Odjava korisnika. Zahteva `Authorization: Bearer <token>` header.

#### `GET /api/v1/health`
Health check. Bez autentifikacije.

---

## Opis baze podataka

### User — Korisnici sistema
| Polje       | Tip      | Opis                           |
|-------------|----------|--------------------------------|
| id          | Int      | Automatski ID                  |
| username    | String   | Jedinstveno korisničko ime     |
| password    | String   | bcrypt hash (rounds: 12)       |
| fullName    | String   | Puno ime                       |
| role        | Role     | ADMIN ili WAITER               |
| active      | Boolean  | Da li je nalog aktivan         |

### Salary — Plate
| Polje   | Tip    | Opis                    |
|---------|--------|-------------------------|
| userId  | Int    | Konobar koji prima      |
| amount  | Float  | Iznos u RSD             |
| paidById| Int    | Admin koji isplaćuje    |
| note    | String | Napomena (opciono)      |

### Shift — Smene
| Polje        | Tip      | Opis                    |
|--------------|----------|-------------------------|
| userId       | Int      | Konobar na smeni        |
| startedAt    | DateTime | Početak smene           |
| endedAt      | DateTime | Kraj smene (null=aktiv) |
| totalWhite   | Float    | Ukupan beli promet      |
| totalBlack   | Float    | Ukupan crni promet      |
| totalRevenue | Float    | Ukupan promet           |

### TableUnit — Stolovi
| Polje      | Tip     | Opis                       |
|------------|---------|----------------------------|
| label      | String  | "Sto U1", "Sto S1"...      |
| zone       | Zone    | INDOOR ili OUTDOOR          |
| positionX  | Float   | Pozicija na mapi            |
| positionY  | Float   | Pozicija na mapi            |
| isOccupied | Boolean | Da li je zauzet             |

### Category — Kategorije pića
### Product — Proizvodi
### Bill — Računi
### BillItem — Stavke računa
### InventoryLog — Inventar log
### Setting — Sistemska podešavanja

---

## Poznati problemi / TODO za naredne faze

### Produkcijsko pakovanje sa Prismom
Prisma zahteva native binaries koje `electron-builder` mora pravilno upakovati.
Potrebno je:
1. Konfiguracija `files` u `electron-builder.yml` da uključi `.prisma/` binaries
2. Dinamička putanja do baze (app data direktorijum, ne project root)
3. Pokretanje `prisma migrate deploy` pri prvom pokretanju app

### Bezbednost
- JWT secret se čita iz `.env` — u produkciji koristiti OS Keychain ili electron-store

### Faze 2+
- Faza 2: Upravljanje stolovima (mapa, drag-drop)
- Faza 3: Sistem računa i naplate
- Faza 4: Inventar i stanje robe
- Faza 5: Izveštaji i statistike
- Faza 6: Upravljanje korisnicima i platama
