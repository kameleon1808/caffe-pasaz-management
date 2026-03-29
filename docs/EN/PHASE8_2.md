# Phase 8.2 — Backup System & Application Settings

## Overview

Phase 8.2 adds automatic and manual SQLite database backup, restore from backup, and application file logging.

---

## 1. Automatic Backup

**Triggered by:** `before-quit` Electron event — every time the application closes.

**Location:** `electron/main.ts` → `app.on('before-quit', ...)`

### How it works

1. Application receives quit signal
2. `event.preventDefault()` delays the quit
3. `createBackup()` copies the SQLite database to the backup folder
4. Backup is named `kafic_backup_YYYY-MM-DD_HH-mm.db`
5. Rotation: deletes backups older than the last 30
6. Application closes

### Notes
- If the backup fails, the application **still closes** (non-fatal)
- The error is logged to `~/kafic-app-logs/app.log`

---

## 2. Backup Service

**File:** `electron/backupService.ts`

### Functions

| Function | Description |
|---|---|
| `getDbPath()` | Reads `DATABASE_URL` env, resolves absolute path |
| `getBackupFolder()` | Reads folder from `userData/backup-config.json` |
| `setBackupFolder(path)` | Saves new folder to config file |
| `createBackup()` | Creates backup, rotates old ones |
| `listBackups()` | Returns list (sort: newest first) |
| `restoreBackup(path)` | Safety backup → copies selected backup → database is replaced |

### Configuration

Backup folder is stored in:
```
{app.getPath('userData')}/backup-config.json
```

Default folder: `~/kafic-backup/`

### Rotation

A maximum of **30** backup files are kept. The oldest are deleted automatically.

---

## 3. IPC Communication

**Handlers in main.ts:**

| Channel | Description | Parameters | Response |
|---|---|---|---|
| `backup-create` | Creates backup | — | `{ success, data: BackupInfo }` |
| `backup-list` | Lists backups | — | `{ success, data: BackupInfo[] }` |
| `backup-restore` | Restore + restart | `backupPath: string` | `{ success }` |
| `backup-get-folder` | Returns backup folder | — | `{ success, data: string }` |
| `backup-set-folder` | Changes backup folder | `folderPath: string` | `{ success }` |
| `backup-pick-folder` | OS folder picker dialog | — | `{ success, data: string }` |
| `log-error` | Log error from renderer | `{ message, stack?, componentStack? }` | — |

---

## 4. Manual Backup — UI

**Page:** `/admin/settings`

### "Backup" Section

- **Backup folder**: Shows current folder, button to change (opens OS folder picker)
- **Create backup now**: Creates a backup immediately, updates the list
- **Last 10 backups**: Table with name, date, size
- **"Restore from backup" button**: On each backup entry
- **Note**: Info about automatic backup

---

## 5. Restore

### Operation Flow

1. User clicks "Restore from backup" on a selected backup
2. A ConfirmDialog is shown with a warning (DANGER variant)
3. User confirms
4. `restoreBackup(path)` in main process:
   - Creates a safety backup of the current database
   - Copies the selected backup file as the new database
5. `app.relaunch()` + `app.exit(0)` — application restarts

### Safety Copy

Before every restore, an automatic copy is made:
```
{backup_folder}/kafic_pre_restore_{timestamp}.db
```

---

## 6. electron-log

**Package:** `electron-log` (added to `dependencies`)

### Configuration

| Parameter | Value |
|---|---|
| Log file | `~/kafic-app-logs/app.log` |
| Max size | 5 MB per file |
| Max files | 5 (rotation) |
| Dev level | `debug` |
| Prod level | `warn` |

### Redirection

```ts
Object.assign(console, log.functions)
// All console.log/warn/error → file + console
```

---

## File Overview

| File | Change |
|---|---|
| `electron/backupService.ts` | **NEW** — Backup logic |
| `electron/main.ts` | IPC handlers, before-quit backup, electron-log |
| `electron/preload.ts` | Exposed `backup` API + `logError` |
| `src/api/backup.ts` | **NEW** — Frontend IPC wrapper |
| `src/pages/admin/SettingsPage.tsx` | Added backup section |
| `src/components/ErrorBoundary.tsx` | Uses `logError` IPC |
| `src/i18n/sr.json` + `en.json` | New keys: `backup.*` |
| `package.json` | `electron-log` in dependencies |
| `docs/SR/FAZA8_2.md` | **NEW** |
| `docs/EN/PHASE8_2.md` | **NEW** |
