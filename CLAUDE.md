# Kafić Pasaz Management — Claude Instructions

## Project Overview
Desktop management system for Kafić Pasaz — Electron app with embedded Express API and React frontend.
Language: TypeScript throughout. UI is bilingual (Serbian / English).

**Tech Stack:**
- Frontend: React 18, React Router 6, Tailwind CSS, react-i18next
- Backend: Express 4, Prisma 5 (SQLite), JWT auth, bcryptjs
- Desktop: Electron 33, electron-vite 2

## Commands
```bash
npm run dev                              # Start Electron + Express + React (dev)
npm run build                            # Production build
npm run package                          # Build + package as installer
npx prisma studio                        # Open DB GUI at localhost:5555
npx prisma db push                       # Push schema changes (no migration file)
npx prisma migrate dev --name <name>     # Create & apply named migration
tsx prisma/seed.ts                       # Seed database with test data
npx tsc --noEmit                         # Type-check without emitting files
```

## Architecture
```
Electron (electron/main.ts)
  └── Express API (server/index.ts) — port 3001
       ├── Middleware: auth.ts, logger.ts, errorHandler.ts
       ├── Routes: /api/v1/auth, /categories, /products, /inventory
       └── Services: business logic + Prisma calls
  └── React SPA (src/)
       ├── Pages: src/pages/ and src/pages/admin/
       ├── API clients: src/api/ (mirrors server routes 1:1)
       ├── Context: AuthContext, ToastContext
       └── i18n: src/i18n/sr.json + en.json
```

## Adding a New Full-Stack Feature
1. `prisma/schema.prisma` — add model if needed, then `npx prisma db push`
2. `server/services/<name>Service.ts` — business logic + Prisma calls
3. `server/routes/<name>.ts` — Express router with auth middleware
4. Mount in `server/index.ts`
5. `src/api/<name>.ts` — fetch wrapper matching the route
6. `src/pages/admin/<Name>Page.tsx` — React admin page
7. `src/i18n/sr.json` + `en.json` — add translation keys
8. Wire route in `src/App.tsx`
9. Add card in `src/pages/DashboardPage.tsx`

## Key Conventions
- **Bilingual DB fields**: Use `nameSr` / `nameEn` for all user-visible content
- **Auth**: All protected routes use `authenticateToken` from `server/middleware/auth.ts`
- **Admin-only routes**: Add `requireAdmin` after `authenticateToken`
- **Enum-like fields**: Defined as `String` in Prisma (SQLite limitation), validated at service level
- **Translations**: camelCase keys, nested by feature — e.g. `categories.title`, `products.form.name`
- **Notifications**: Use `useToast()` hook — `toast.success()`, `toast.error()`
- **API errors**: Return `{ error: string, details?: string }` from all endpoints
- **API base URL**: `http://localhost:3001/api/v1`
- **JWT**: Stored in localStorage via `src/utils/token.ts`

## Database Models
User, Shift, TableUnit, Category, Product, Bill, BillItem, InventoryLog, Setting, Salary

**String enums (SQLite limitation):**
- `Role`: ADMIN | WAITER
- `Zone`: INDOOR | OUTDOOR
- `BillStatus`: OPEN | PAID | CANCELLED
- `Color`: WHITE | BLACK (transaction type for cash tracking)
- `InventoryType`: PURCHASE | SALE | ADJUSTMENT | WASTE

## Development Phases
- ✅ Phase 1: Auth, Dashboard, DB schema, Electron shell
- ✅ Phase 2: Categories, Products, Inventory management
- 🔲 Phase 3: TableUnit management, Bills (active orders, POS screen)
- 🔲 Phase 4: Shifts, Reports (daily/weekly/monthly)
- 🔲 Phase 5: Users management, Salary payments, Settings page
