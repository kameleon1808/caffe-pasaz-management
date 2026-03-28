# Phase 5 — POS Thermal Printer

## Overview

Phase 5 adds POS thermal printer integration. When a waiter pays a bill, the receipt is automatically printed. The administrator can configure the printer and cafe details from the admin panel.

---

## Print Architecture

```
React (BillPage)
  └── POST /api/v1/print/receipt/:billId
       └── Express Route (server/routes/print.ts)
            └── PrinterService (server/lib/printerService.ts)
                 └── node-thermal-printer → TCP/USB printer
```

Printer settings are stored in the `Setting` table (key-value format).

---

## Printer Configuration

### Accessing Settings

**Admin → Dashboard → Printer** (or directly at `/admin/settings/printer`)

### Configuration Fields

| Field | Type | Description |
|-------|------|-------------|
| `printer_type` | `usb` / `network` / `disabled` | Connection type |
| `printer_path` | String | IP address (for network) or device path (for USB) |
| `printer_port` | Number (1–65535) | TCP port (default: 9100) |
| `printer_width` | `48` / `80` | Characters per line |
| `cafe_name` | String | Cafe name for header |
| `cafe_address` | String | Cafe address |
| `cafe_pib` | String | Tax ID (PIB) |

### Example: Network Printer (most common)

```
Type: Network (TCP/IP)
IP Address: 192.168.1.100
Port: 9100
Width: 48 characters
```

### Example: USB Printer on Windows

```
Type: USB
Path: \\.\USB001
      or
      \\.\COM3 (for serial)
```

### Example: USB Printer on Linux

```
Type: USB
Path: /dev/usb/lp0
```

---

## Receipt Format

```
========================================
[CAFE NAME]
[ADDRESS]
PIB: [TAX ID]
========================================
Bill no: 42
Date: 28.03.2026 14:35
Waiter: Marko Markovic
Table: Table 3
----------------------------------------
Item                      Qty  Total
----------------------------------------
Espresso                    2  300.00 RSD
Coca Cola 0.25l             1  200.00 RSD
Jelen Beer 0.5l             3  750.00 RSD
  Discount: 10%
----------------------------------------
Discount (15%):    -187.50 RSD
========================================
TOTAL DUE:        1,062.50 RSD
========================================
Thank you for your visit!
28.03.2026 14:35
========================================
```

---

## API Endpoints

### GET `/api/v1/settings/printer`
Returns current printer settings. Available to all logged-in users.

### PUT `/api/v1/settings/printer`
Saves printer settings. Admin only.

**Body:**
```json
{
  "printer_type": "network",
  "printer_path": "192.168.1.100",
  "printer_port": "9100",
  "printer_width": "48",
  "cafe_name": "Kafic Pasaz",
  "cafe_address": "Street 1, Belgrade",
  "cafe_pib": "123456789"
}
```

### POST `/api/v1/print/receipt/:billId`
Prints a receipt. Returns `{success, message}` or `{error, code}` (503).

### POST `/api/v1/print/test`
Prints a test page. Returns `{success, message}` or `{error, code}` (503).

---

## Supported Printer Models

The `node-thermal-printer` library uses the ESC/POS protocol, supported by virtually all POS printers:

| Manufacturer | Models |
|--------------|--------|
| **Epson** | TM-T20, TM-T88, TM-T20III, TM-T82 |
| **Star** | TSP100, TSP143, TSP650 |
| **Bixolon** | SRP-350III, SRP-Q300 |
| **Sewoo** | LK-T210, LK-T212 |
| **Citizen** | CT-E351, CT-S310 |
| Others | Any printer with ESC/POS support and a network card |

> **Recommendation:** A network printer (LAN/WiFi) is the most reliable option for this setup.

---

## Error Handling

### Printer Unavailable During Payment

If the printer is unavailable when paying:
1. Payment **succeeds** — the bill is marked as paid in the system
2. A **warning** (yellow toast) is shown: "Printer unavailable..."
3. The waiter can use the **"Reprint"** button once the printer is reconnected

### Error Codes

| Code | Cause | Solution |
|------|-------|----------|
| `PRINTER_DISABLED` | `printer_type = disabled` | Set type to USB or Network |
| `PRINTER_ERROR` | Connection refused | Check IP/path and that printer is on |
| `NETWORK_ERROR` | Network failure | Check network connection |

---

## Troubleshooting

### Printer Does Not Print

1. Check that the printer is **physically connected** and **powered on**
2. Click **"Test Print"** in settings
3. For network printers: ping the IP address (`ping 192.168.1.100`)
4. Verify that **port 9100** is open on the printer

### Text Is Garbled / Unreadable

- Try width **48** (standard 80mm roll)
- Check that the printer supports ESC/POS protocol

### USB Printer Not Recognized on Windows

- Try paths: `\\.\USB001`, `\\.\USB002`, `\\.\COM1`
- Install manufacturer drivers
- Network connection is a more reliable alternative

### Connection Timeout

- Default timeout is **5 seconds**
- For slow networks, check network latency

---

## Implementation Files

| File | Description |
|------|-------------|
| `server/lib/printerService.ts` | ESC/POS formatting and sending |
| `server/services/settingsService.ts` | Read/save settings |
| `server/routes/settings.ts` | GET/PUT /settings/printer |
| `server/routes/print.ts` | POST /print/receipt, POST /print/test |
| `src/api/settings.ts` | Frontend API client for settings |
| `src/api/print.ts` | Frontend API client for printing |
| `src/pages/admin/PrinterSettingsPage.tsx` | Admin configuration page |
| `src/pages/BillPage.tsx` | Auto-print on payment + "Reprint" button |
