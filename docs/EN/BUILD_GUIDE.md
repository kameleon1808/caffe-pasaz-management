# Kafic App — Build Guide

## Quick Start (Recommended)

**Double-click `BUILDUJ.bat`** in the project root folder.

The script automatically:
1. Checks the Node.js version
2. Installs dependencies if missing
3. Creates/updates the database with demo data
4. Compiles the application
5. Creates the `.exe` installer
6. Opens the `dist/` folder with the final file

---

## Build System Requirements

| Component | Version |
|-----------|---------|
| Node.js | 18 or newer |
| npm | 8 or newer (comes with Node.js) |
| Windows | 10 or newer (required for .exe creation) |
| RAM | min 4 GB (8 GB recommended) |
| Disk | min 2 GB free space |

> **Note:** A Windows `.exe` installer can only be built **on a Windows** machine.
> On macOS/Linux, electron-builder produces `.dmg`/`.AppImage` for those platforms.

---

## Installing Node.js (if not installed)

1. Go to [https://nodejs.org](https://nodejs.org)
2. Download the **LTS** version (e.g. 20.x)
3. Run the installer and follow the steps
4. Verify the installation:
   ```
   node -v
   npm -v
   ```

---

## Step by Step (Manual, without BUILDUJ.bat)

If you prefer running each command manually:

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma client
npx prisma generate

# 3. Create/update the database schema
npx prisma db push --accept-data-loss

# 4. Seed demo data
npx tsx prisma/seed.ts

# 5. Build the application (TypeScript + React + Electron)
npm run build

# 6. Create the .exe installer
npx electron-builder --win --x64
```

Alternatively, run steps 1–6 with a single command:
```bash
npm run build:installer
```

---

## What Each Step Does

### `npm install`
Downloads all JavaScript/TypeScript dependencies into `node_modules/`.
Skipped automatically if `node_modules/` already exists.

### `npx prisma generate`
Generates TypeScript client code from `prisma/schema.prisma`.
Must be run whenever the schema changes.

### `npx prisma db push`
Creates or updates `prisma/dev.db` (SQLite file) to match the current schema.
This file is bundled into the installer — **the end user receives it pre-seeded with demo data**.

### `npx tsx prisma/seed.ts`
Populates the database with:
- Admin account (`admin` / `admin123`)
- Waiter account (`konobar` / `konobar123`)
- 6 indoor + 12 outdoor tables
- Categories and 77 products
- Basic cafe settings

### `npm run build`
Compiles all TypeScript files using `electron-vite`:
- `src/` (React) → `out/renderer/`
- `server/` (Express) → `out/main/`
- `electron/` (Main process) → `out/main/`

### `electron-builder --win --x64`
Packages the `out/` folder + `prisma/dev.db` into an NSIS Windows installer.
Output: `dist/Kafic-App-Setup-1.0.0.exe`

---

## Output Files

After a successful build, the `dist/` folder contains:

```
dist/
├── Kafic-App-Setup-1.0.0.exe   ← the installer you give to the client
├── win-unpacked/               ← unpacked build (for testing)
│   ├── Kafic App.exe
│   ├── resources/
│   │   ├── app.asar
│   │   └── app.asar.unpacked/
│   │       ├── node_modules/.prisma/
│   │       └── prisma/dev.db   ← seed database (copied to client machine)
└── builder-effective-config.yaml
```

Distribute **only** `Kafic-App-Setup-1.0.0.exe`.

---

## What Happens on the Client Machine

```
User runs the installer
    ↓
Selects installation folder (default: C:\Program Files\Kafic App\)
    ↓
Installer copies files
    ↓
Creates Desktop shortcut and Start menu entry
    ↓
User opens the application (first time)
    ↓
electron/main.ts::setupProductionDatabase()
    ↓
Sets DATABASE_URL = file:C:\Users\<name>\AppData\Roaming\Kafic App\kafic.db
    ↓
Copies bundled prisma/dev.db → kafic.db (first launch only)
    ↓
Express server starts with this database
    ↓
User logs in: admin / admin123
```

**The database lives in the user's `AppData` folder** — uninstalling the app does not delete it.

---

## Adding an Application Icon (Optional)

Without an icon, the default Electron icon is used.

To add your own icon:

1. Prepare `logo.png` (minimum 256×256 px, ideally 512×512)
2. Convert to `.ico` format:
   - Online tool: https://www.icoconverter.com/ (upload PNG, select all sizes)
   - npm tool: `npx electron-icon-builder --input=logo.png --output=build/`
3. Place it at `build/icon.ico`
4. Add a line to `electron-builder.yml`:
   ```yaml
   win:
     icon: build/icon.ico
   ```
5. Rebuild

---

## Common Build Issues

### "Cannot find module '@prisma/client'"
```bash
npx prisma generate
```

### "NSIS not found" or "Unable to load nsis module"
electron-builder downloads NSIS automatically. If that fails:
```bash
npm install -g windows-build-tools
```
Or install NSIS manually: https://nsis.sourceforge.io/

### Build stalls at "Packaging for target nsis"
Check:
- Free disk space (min 2 GB)
- Antivirus may be blocking — temporarily disable during build

### "out/main/main.js not found"
```bash
npm run build
```

### "prisma/dev.db does not exist"
```bash
npx prisma db push
npx tsx prisma/seed.ts
```

---

## Updating the Version

Before a new build, change the version in `package.json`:
```json
{
  "version": "1.0.1"
}
```

The installer will automatically be named `Kafic-App-Setup-1.0.1.exe`.

---

## Automation (CI/CD)

To automatically build on every tagged commit, add a GitHub Actions workflow:

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
