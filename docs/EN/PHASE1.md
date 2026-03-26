# Phase 1 — Foundation: Scaffold, Authentication, Database, Internationalization

## What Was Done

This phase sets up the complete application foundation:

- **Electron application** with React renderer and preload script
- **Express API server** running inside the Electron main process
- **SQLite database** with Prisma ORM and a complete schema
- **JWT authentication** with bcrypt password hashing
- **React Router** with protected routes and role-based access
- **Tailwind CSS** with a custom dark color palette
- **react-i18next** internationalization (Serbian default, English optional)
- **Seed data** (admin account, tables, categories)

---

## How to Run

### 1. Install dependencies

```bash
npm install
```

### 2. Set up the database

```bash
# Generate Prisma client
npx prisma generate

# Create the database and tables
npx prisma db push

# Populate with initial data
tsx prisma/seed.ts
```

Or all at once:
```bash
npm run setup
```

### 3. Run the application in development mode

```bash
npm run dev
```

This starts:
- Electron Vite dev server for React (port 5173)
- Electron main process which starts Express server (port 3001)
- BrowserWindow with the Vite dev server URL

### 4. Production build

```bash
npm run build
```

### 5. Package as .exe

```bash
npm run package
```

Output is located in the `dist/` folder.

---

## Test Credentials

| Username | Password   | Role          |
|----------|------------|---------------|
| `admin`  | `admin123` | Administrator |

---

## Project Structure

```
caffe-pasaz-management/
├── electron/                # Electron main process
│   ├── main.ts              # Entry point — starts server and window
│   └── preload.ts           # Secure bridge main↔renderer
│
├── src/                     # React frontend (renderer process)
│   ├── api/                 # HTTP clients for the server
│   ├── components/          # UI components
│   │   ├── Layout/          # MainLayout, Sidebar, Header
│   │   ├── LanguageSwitcher.tsx
│   │   └── ProtectedRoute.tsx
│   ├── context/             # React Context providers
│   │   └── AuthContext.tsx
│   ├── hooks/               # Custom hooks
│   │   └── useAuth.ts
│   ├── i18n/                # Translations (sr, en)
│   ├── pages/               # Pages (Login, Dashboard, Placeholder)
│   ├── types/               # TypeScript types
│   └── utils/               # Helper functions (token management)
│
├── server/                  # Express API (runs in main process)
│   ├── routes/auth.ts       # /api/v1/auth/*
│   ├── middleware/          # Auth, error handler, logger
│   └── services/authService.ts
│
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Initial data
│
└── docs/
    ├── SR/FAZA1.md
    └── EN/PHASE1.md
```

---

## API Endpoints

### Authentication

#### `POST /api/v1/auth/login`

**Request body:**
```json
{ "username": "admin", "password": "admin123" }
```

**Success response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": { "id": 1, "username": "admin", "fullName": "Administrator", "role": "ADMIN" }
  }
}
```

**Error response (401):**
```json
{
  "success": false,
  "error": { "code": "INVALID_CREDENTIALS", "message": "Invalid username or password" }
}
```

#### `GET /api/v1/auth/me`
Returns the logged-in user's profile. Requires `Authorization: Bearer <token>`.

#### `POST /api/v1/auth/logout`
Logs out the user. Requires `Authorization: Bearer <token>`.

#### `GET /api/v1/health`
Health check. No authentication required.

---

## Database Schema Overview

| Model        | Description                            |
|--------------|----------------------------------------|
| User         | System users (admin or waiter)         |
| Salary       | Salary payments from admin to waiter   |
| Shift        | Work shifts with revenue totals        |
| TableUnit    | Physical cafe tables (indoor/outdoor)  |
| Category     | Drink categories                       |
| Product      | Products/drinks sold                   |
| Bill         | Table bills (OPEN/PAID/CANCELLED)      |
| BillItem     | Line items within a bill               |
| InventoryLog | Log of stock changes                   |
| Setting      | Key-value system settings              |

---

## Known Issues / TODO for Future Phases

### Production Packaging with Prisma
Prisma requires native binaries that `electron-builder` must properly package:
1. Configure `files` in `electron-builder.yml` to include `.prisma/` binaries
2. Use a dynamic database path (app data directory, not project root)
3. Run `prisma migrate deploy` on first app startup

### Security
- JWT secret is read from `.env` — use OS Keychain or `electron-store` in production

### Future Phases
- Phase 2: Table management (map, drag-and-drop)
- Phase 3: Bill and payment system
- Phase 4: Inventory management
- Phase 5: Reports and statistics
- Phase 6: User and salary management
