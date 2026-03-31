# Kafic App — Troubleshooting Guide

## Contents
1. [Application Won't Start](#1-application-wont-start)
2. [Login Fails / Wrong Credentials](#2-login-fails--wrong-credentials)
3. [Printer Not Working](#3-printer-not-working)
4. [Database Issues](#4-database-issues)
5. [Application is Slow or Freezes](#5-application-is-slow-or-freezes)
6. [Data Not Showing / Blank Pages](#6-data-not-showing--blank-pages)
7. [Quick Reference Table](#7-quick-reference-table)

---

## 1. Application Won't Start

### Symptom: Nothing happens on double-click

**Checks:**
1. Verify the installation is complete — re-run the installer
2. Check the Windows Event Viewer for error details:
   - `Win + R` → `eventvwr` → Windows Logs → Application

**Common fixes:**
- **Missing Visual C++ Redistributable** — download and install Microsoft Visual C++ Redistributable (x64) from the official Microsoft website
- **Antivirus blocking execution** — add the application folder to your antivirus exclusions

---

### Symptom: App opens and immediately closes

**Likely cause:** The API server cannot start because port 3001 is already in use.

**Fix:**
1. Open Task Manager (`Ctrl + Shift + Esc`)
2. Find the process using port 3001:
   - Open PowerShell as administrator
   - Run: `netstat -ano | findstr :3001`
   - Note the PID and end that process in Task Manager
3. Restart the application

---

### Symptom: "Windows protected your PC" (SmartScreen warning)

This is expected for apps without a digital signature.

**Fix:**
1. Click **"More info"**
2. Click **"Run anyway"**

---

### Symptom: White or black blank screen

**Likely cause:** The renderer process failed to load or the API server is still starting up.

**Fix:**
1. Wait 10–15 seconds (especially on first launch — the server needs a moment to initialize)
2. If still blank — close and relaunch the application
3. Check the log file: `C:\Users\<username>\kafic-app-logs\app.log`
4. If the log shows a database error — uninstall and reinstall the application (the database at `%APPDATA%\caffe-pasaz-management\kafic.db` is preserved)

---

## 2. Login Fails / Wrong Credentials

### Symptom: "Incorrect username or password"

**Check:**
- Caps Lock is off
- Username is lowercase: `admin` or `konobar`
- Default passwords: `admin123` / `konobar123`

### Resetting the Admin Password

If the password was changed and is forgotten:

1. Close the application
2. Open PowerShell
3. Open the database with the SQLite CLI:
   ```
   sqlite3 "%APPDATA%\Kafic App\kafic.db"
   ```
4. Run SQL to reset the password to `admin123`:
   ```sql
   UPDATE User SET password = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCakDJ6bUSSWBbJSb8a3Uiy' WHERE username = 'admin';
   ```
   > The hash corresponds to `admin123`. Generate a new hash for a different password.
5. Exit: `.quit`
6. Restart the application

---

## 3. Printer Not Working

### Diagnostic Steps

**Step 1 — Check the connection**
- USB: verify Windows recognizes the printer (Devices and Printers)
- Network: ping the printer's IP address (`ping 192.168.1.100`)

**Step 2 — Check application settings**
- Admin → Settings → Printer
- Verify the IP address / COM port is correct
- Verify the port (default: 9100 for network, COM3 for USB)

**Step 3 — Test Print**
- Click the "Test Print" button
- No response → connection problem
- Error message → read the message for details

---

### Network Printer — Common Fixes

| Problem | Fix |
|---------|-----|
| "Connection refused" | Verify the printer is on and connected to the network |
| "Timeout" | Check firewall — allow port 9100 |
| "Wrong IP" | Print a configuration page from the printer to get the correct IP |

### USB/COM Printer — Common Fixes

| Problem | Fix |
|---------|-----|
| No COM port listed | Install printer drivers |
| "Port is busy" | Another program is using the COM port — close it |
| Garbled characters printed | Check paper width setting (48 vs 80) in settings |

---

### Temporary Operation Without a Printer

If the printer is unavailable:
1. Admin → Settings → Printer Type: **Disabled**
2. The app continues to work normally without printing

---

## 4. Database Issues

### Symptom: "Database is locked" error

**Cause:** Multiple processes are trying to access the SQLite file simultaneously.

**Fix:**
1. Close all instances of the application
2. Check Task Manager for lingering `Kafic App.exe` processes and end them
3. Restart the application

---

### Symptom: Data is missing / database is empty

**Fix — Restore from backup:**
1. Find backup files at: `C:\Users\<username>\kafic-backup\`
2. Launch the app and log in (if possible)
3. Admin → Settings → Backup → select the latest backup → Restore
4. The app restarts with the restored data

**If the app cannot start at all:**
1. Find `kafic.db` in `%APPDATA%\Kafic App\`
2. Delete or rename the corrupted file
3. Copy a backup file from `~/kafic-backup/` and rename it to `kafic.db`
4. Launch the application

---

### Symptom: "Migration failed" on startup

**Fix:**
1. Find `kafic.db` in `%APPDATA%\Kafic App\`
2. Make a manual backup by copying the file
3. Delete the original `kafic.db`
4. Launch the app — a new empty database is created
5. Restore from backup if needed

---

## 5. Application is Slow or Freezes

### Resource Check

1. Open Task Manager (`Ctrl + Shift + Esc`)
2. Check CPU and RAM usage for `Kafic App.exe`

**If CPU is constantly 80%+:**
- May be caused by a very large database
- Check the size of `kafic.db` — if > 100 MB, contact the development team

**If RAM > 500 MB:**
- Close and restart the application
- Check for memory leaks (developer tools: Ctrl+Shift+I if available)

---

### Clearing Log Files

Log files rotate automatically, but you can delete them manually while the app is closed:
```
C:\Users\<username>\kafic-app-logs\
```

---

## 6. Data Not Showing / Blank Pages

### Symptom: Empty list, spinner never disappears

**Likely cause:** The API server is not running or not responding.

**Fix:**
1. Close and relaunch the application
2. Check the log: `C:\Users\<username>\kafic-app-logs\app.log`
3. Look for lines containing `ERROR` or `server start`

---

### Symptom: "Unauthorized" or "Session expired"

**Fix:**
1. Log out (click username → Logout)
2. Log back in
3. The JWT token has expired (auto-refreshes, but edge cases can occur)

---

## 7. Quick Reference Table

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| "Port 3001 already in use" | Old app instance running | Task Manager → end Kafic App processes |
| Bill won't close | Table occupied in another session | Log out and back in |
| Wrong prices displayed | Cache not refreshed | Press F5 or reload the page |
| Report shows 0 | No shifts in selected period | Check the date filter |
| Backup not created | Folder not accessible | Admin → Settings → change backup folder |
| Language not changing | i18n cache | Close and reopen the application |
| Keyboard not responding | Input field not focused | Click the input field, then type |

---

## Log File Locations

| Type | Location |
|------|----------|
| Application log | `C:\Users\<username>\kafic-app-logs\app.log` |
| Archived logs | `C:\Users\<username>\kafic-app-logs\app.<timestamp>.log` |
| Backup files | `C:\Users\<username>\kafic-backup\` (default) |
| Database | `C:\Users\<username>\AppData\Roaming\Kafic App\kafic.db` |

---

## Getting Support

If the issue persists after applying these fixes, provide the following to your support contact:
1. Contents of the log file (`app.log`)
2. Description of the problem and steps to reproduce it
3. Windows version
4. Application version (shown in installer filename or About screen)
