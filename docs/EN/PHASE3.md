# PHASE 3 — Visual Table Display & Shift Management

## Overview

Phase 3 adds the core operational functionality: visual table layout by zones, and a shift system that controls access to table operations.

---

## Implemented Features

### 1. Visual Table Display (`/tables`)

- Two tabs/zones: **Indoor (INDOOR)** and **Outdoor Terrace (OUTDOOR)**
- Each table displayed as an interactive card:
  - **Green** — table is free
  - **Red** — table is occupied (has an open bill)
- Occupied tables show the total amount of the open bill in RSD
- Auto-refresh every 30 seconds
- Protected by `ShiftGuard` — user must have an active shift
- Prepared for Phase 4 (table clicks for opening/viewing bills)

### 2. Admin Table Layout Editor (`/admin/table-layout`)

- List of all tables per zone (INDOOR / OUTDOOR tabs)
- Create new table: name, zone, optional coordinates (X, Y)
- Delete table (soft delete) with protection — cannot delete a table with open bills
- Reset all positions to default layout (6 indoor 2×3, 12 outdoor 3×4)
- Accessible to admins only

### 3. Shift Management

- **Start shift**: user (admin or waiter) must start a shift before working with tables
- **End shift**: not allowed while there are open bills
- Total revenue is automatically calculated at shift end
- `ShiftGuard` component blocks access to `/tables` without an active shift
- Shift status visible in the header and on the dashboard

### 4. Header — Shift Status

- Displays "Shift active since HH:MM" when a shift is running
- Quick end-shift button directly from the header
- Pulsing green indicator while shift is active

---

## API Endpoints

### Tables (`/api/v1/tables`)

| Method | Path                       | Auth    | Description                        |
|--------|----------------------------|---------|------------------------------------|
| GET    | `/api/v1/tables`           | user    | List active tables with status     |
| GET    | `/api/v1/tables/:id`       | user    | Single table                       |
| POST   | `/api/v1/tables`           | admin   | Create new table                   |
| PUT    | `/api/v1/tables/:id`       | admin   | Update table data                  |
| PUT    | `/api/v1/tables/:id/position` | admin | Update table position             |
| DELETE | `/api/v1/tables/:id`       | admin   | Soft delete table                  |

**GET /api/v1/tables** returns:
```json
[
  {
    "id": 1,
    "label": "Sto U1",
    "zone": "INDOOR",
    "positionX": 50,
    "positionY": 50,
    "isOccupied": false,
    "active": true,
    "openBillTotal": 0,
    "openBillId": null
  }
]
```

### Shifts (`/api/v1/shifts`)

| Method | Path                     | Auth | Description                          |
|--------|--------------------------|------|--------------------------------------|
| POST   | `/api/v1/shifts/start`   | user | Start a new shift                    |
| POST   | `/api/v1/shifts/end`     | user | End the active shift                 |
| GET    | `/api/v1/shifts/active`  | user | Current active shift or `null`       |
| GET    | `/api/v1/shifts/history` | user | Shift history                        |

**Error codes:**
- `SHIFT_ALREADY_ACTIVE` (409) — attempting to start when a shift is already active
- `SHIFT_NOT_ACTIVE` (404) — attempting to end without an active shift
- `SHIFT_HAS_OPEN_BILLS` (409) — ending shift with open bills

---

## File Structure

### Backend

```
server/
├── services/
│   ├── tableService.ts      # Table CRUD + open bill status
│   └── shiftService.ts      # Start/end shift + validations
├── routes/
│   ├── tables.ts            # REST endpoints for tables
│   └── shifts.ts            # REST endpoints for shifts
└── middleware/
    └── checkActiveShift.ts  # Active shift check (for Phase 4 use)
```

### Frontend

```
src/
├── api/
│   ├── tables.ts            # API client for tables
│   └── shifts.ts            # API client for shifts
├── context/
│   └── ShiftContext.tsx     # React context for shift state
├── hooks/
│   └── useShift.ts          # Hook to access ShiftContext
├── components/
│   └── ShiftGuard.tsx       # Guard component — blocks without active shift
└── pages/
    ├── TablesPage.tsx        # Visual table display
    └── admin/
        └── TableLayoutPage.tsx  # Admin layout editor
```

---

## Business Rules

1. **One shift at a time** — a user cannot have more than one active shift
2. **Shift before tables** — access to `/tables` requires an active shift (ShiftGuard)
3. **End shift with open bills** — not allowed; user must close all bills first
4. **Delete table with open bills** — not allowed (soft delete protection)
5. **isOccupied is derived** — not stored directly in the database; calculated from the existence of an open Bill record

---

## Default Table Layout (Seed)

- **6 indoor tables** (U1–U6): 2 rows × 3 columns layout, 200px spacing
- **12 outdoor tables** (S1–S12): 3 rows × 4 columns layout, 180px spacing

Run seed: `tsx prisma/seed.ts`

---

## Translations (i18n)

Keys added to both `sr.json` and `en.json`:
- `tables.*` — all table display texts
- `tableLayout.*` — all admin editor texts
- `shifts.*` — all shift management texts

---

## Connections to Other Phases

| Phase | Connection |
|-------|------------|
| Phase 1 | Auth + JWT (user must be logged in) |
| Phase 2 | Categories and products (used in bills) |
| **Phase 3** | **Tables + Shifts** |
| Phase 4 | Bills — table clicks lead to opening/viewing bills |
| Phase 5 | Reports — shifts have revenues, used in reporting |
