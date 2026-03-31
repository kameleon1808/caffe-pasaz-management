# Kafic App — Installation Guide

## System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Operating System | Windows 10 (64-bit) | Windows 11 (64-bit) |
| RAM | 4 GB | 8 GB |
| Free Disk Space | 500 MB | 1 GB |
| Screen Resolution | 1024×600 | 1280×800 or higher |
| Processor | Intel Core i3 / AMD Ryzen 3 | Intel Core i5 / AMD Ryzen 5 |

> **Note:** The application requires no internet connection — everything runs locally.

---

## Downloading the Installer

1. Obtain the latest `Kafic-App-Setup-x.x.x.exe` file from your development team.
2. Windows SmartScreen may show a warning for unsigned applications (see Troubleshooting section).

---

## Step-by-Step Installation

### Step 1 — Run the Installer

Double-click `Kafic-App-Setup-x.x.x.exe` to launch the installer.

If **"Windows protected your PC"** (SmartScreen) appears:
1. Click **"More info"**
2. Click **"Run anyway"**

### Step 2 — Choose Installation Folder

The installer prompts for an installation directory. Default path:
```
C:\Program Files\Kafic App\
```

You may choose an alternate folder (e.g. `C:\Kafic\`) if you lack administrator privileges.

### Step 3 — Install

Click **"Install"** and wait for the process to complete (typically 30–60 seconds).

### Step 4 — Finish

Upon completion, the installer offers:
- **Launch Kafic App** — open the application immediately
- **Close** — exit the installer without launching

The following are created automatically:
- Desktop shortcut
- Start menu entry under "Kafic App"
- Uninstaller entry in "Add/Remove Programs"

---

## First Launch and Configuration

### Database Initialization

On first launch, the application automatically creates an SQLite database and populates it with demo data.

Database location:
```
C:\Users\<username>\AppData\Roaming\Kafic App\kafic.db
```

### Default Accounts

| Role | Username | Password |
|------|----------|----------|
| Administrator | `admin` | `admin123` |
| Waiter | `konobar` | `konobar123` |

> **IMPORTANT:** Change all passwords immediately after first login via Admin → Users.

### Cafe Information Setup

Log in as admin and navigate to **Admin → Settings**:
- Cafe name
- Address
- Tax ID (for receipts)
- Phone number
- Currency (default: RSD)

---

## Printer Setup

### USB / Serial Printer

1. Connect the thermal printer via USB cable
2. Go to **Admin → Settings → Printer**
3. Select type: **USB**
4. Enter the device path (e.g. `COM3` or `\\.\USB001`)
5. Click **Test Print** to verify the connection

### Network Printer

1. Connect the printer to the same local network as the computer
2. Go to **Admin → Settings → Printer**
3. Select type: **Network**
4. Enter the printer's IP address (e.g. `192.168.1.100`)
5. Port: `9100` (ESC/POS default)
6. Click **Test Print**

### Disabling the Printer

If no printer is used, select type: **Disabled** — the app will work normally without printing.

---

## Uninstalling

1. Open **Control Panel → Programs → Add or Remove Programs**
2. Find **"Kafic App"**
3. Click **Uninstall**

> **Note:** Uninstallation does NOT delete the database or backup files. They remain in `AppData\Roaming\Kafic App\` and `~/kafic-backup/`. Delete them manually if needed.

---

## Updating

1. Download the new installer
2. Run it — the installer detects the existing installation and updates it
3. Database and settings are preserved during the update

---

## FAQ

**Q: Can I install the app without administrator rights?**
A: Yes — choose a folder inside your user profile (e.g. `C:\Users\<username>\Kafic App\`) instead of `Program Files`.

**Q: Does the app work without internet?**
A: Yes, completely. There is no telemetry or cloud dependency.

**Q: Can I run multiple instances?**
A: Not recommended. The local SQLite database is not designed for concurrent access from multiple processes.
