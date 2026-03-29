# Faza 8.2 — Backup Sistem i Podešavanja Aplikacije

## Pregled

Faza 8.2 dodaje automatski i ručni backup SQLite baze podataka, restore iz backup-a, i logovanje aplikacije u fajl.

---

## 1. Automatski Backup

**Triggerovano:** `before-quit` Electron event — svaki put kada se aplikacija zatvori.

**Lokacija:** `electron/main.ts` → `app.on('before-quit', ...)`

### Kako radi

1. Aplikacija prima signal za zatvaranje
2. `event.preventDefault()` odlaže zatvaranje
3. `createBackup()` kopira SQLite bazu u backup folder
4. Backup se imenuje kao `kafic_backup_YYYY-MM-DD_HH-mm.db`
5. Rotacija: briše backup-ove starije od poslednji 30
6. Aplikacija se zatvara

### Napomene
- Ako backup ne uspe, aplikacija se **i dalje zatvara** (non-fatal)
- Greška se loguje u `~/kafic-app-logs/app.log`

---

## 2. Backup Servis

**Fajl:** `electron/backupService.ts`

### Funkcije

| Funkcija | Opis |
|---|---|
| `getDbPath()` | Iz `DATABASE_URL` env, resolve apsolutna putanja |
| `getBackupFolder()` | Čita folder iz `userData/backup-config.json` |
| `setBackupFolder(path)` | Čuva novi folder u config fajl |
| `createBackup()` | Kreira backup, rotira stare |
| `listBackups()` | Vraća listu (sort: najnoviji prvi) |
| `restoreBackup(path)` | Safety backup → kopira izabrani backup → baza je zamenjena |

### Konfiguracija

Backup folder se čuva u:
```
{app.getPath('userData')}/backup-config.json
```

Default folder: `~/kafic-backup/`

### Rotacija

Čuva se najviše **30** backup fajlova. Najstariji se brišu automatski.

---

## 3. IPC Komunikacija

**Handleri u main.ts:**

| Channel | Opis | Parametri | Odgovor |
|---|---|---|---|
| `backup-create` | Kreira backup | — | `{ success, data: BackupInfo }` |
| `backup-list` | Lista backup-ova | — | `{ success, data: BackupInfo[] }` |
| `backup-restore` | Restore + restart | `backupPath: string` | `{ success }` |
| `backup-get-folder` | Vraća backup folder | — | `{ success, data: string }` |
| `backup-set-folder` | Menja backup folder | `folderPath: string` | `{ success }` |
| `backup-pick-folder` | OS folder picker dijalog | — | `{ success, data: string }` |
| `log-error` | Log greška iz renderera | `{ message, stack?, componentStack? }` | — |

---

## 4. Ručni Backup — UI

**Stranica:** `/admin/settings`

### Sekcija "Backup"

- **Backup folder**: Prikazuje trenutni folder, dugme za promenu (otvara OS folder picker)
- **Napravi backup sada**: Kreira backup odmah, ažurira listu
- **Poslednjih 10 backup-ova**: Tabela sa imenom, datumom, veličinom
- **Dugme "Vrati iz backup-a"**: Na svakom backup-u
- **Napomena**: Info o automatskom backup-u

---

## 5. Restore

### Tok operacije

1. Korisnik klikne "Vrati iz backup-a" na odabranom backup-u
2. Prikazuje se ConfirmDialog sa upozorenjem (DANGER varijanta)
3. Korisnik potvrđuje
4. `restoreBackup(path)` u main procesu:
   - Kreira safety backup trenutne baze
   - Kopira odabrani backup fajl kao novu bazu
5. `app.relaunch()` + `app.exit(0)` — aplikacija se restartuje

### Bezbedonosna kopija

Pre svakog restore-a, pravi se automatska kopija:
```
{backup_folder}/kafic_pre_restore_{timestamp}.db
```

---

## 6. electron-log

**Paket:** `electron-log` (dodat u `dependencies`)

### Konfiguracija

| Parametar | Vrednost |
|---|---|
| Log fajl | `~/kafic-app-logs/app.log` |
| Max veličina | 5 MB po fajlu |
| Max fajlova | 5 (rotacija) |
| Dev nivo | `debug` |
| Prod nivo | `warn` |

### Preusmеravanje

```ts
Object.assign(console, log.functions)
// Svi console.log/warn/error → fajl + konzola
```

---

## Pregled fajlova

| Fajl | Izmena |
|---|---|
| `electron/backupService.ts` | **NOVO** — Backup logika |
| `electron/main.ts` | IPC handleri, before-quit backup, electron-log |
| `electron/preload.ts` | Izložen `backup` API + `logError` |
| `src/api/backup.ts` | **NOVO** — Frontend IPC wrapper |
| `src/pages/admin/SettingsPage.tsx` | Dodana backup sekcija |
| `src/components/ErrorBoundary.tsx` | Koristi `logError` IPC |
| `src/i18n/sr.json` + `en.json` | Novi ključevi: `backup.*` |
| `package.json` | `electron-log` u dependencies |
| `docs/SR/FAZA8_2.md` | **NOVO** |
| `docs/EN/PHASE8_2.md` | **NOVO** |
