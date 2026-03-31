# Kafic App — Administrator Guide

## Contents
1. [Login and Navigation](#1-login-and-navigation)
2. [Admin Dashboard](#2-admin-dashboard)
3. [Managing Categories](#3-managing-categories)
4. [Managing Products](#4-managing-products)
5. [Inventory Management](#5-inventory-management)
6. [Table Management](#6-table-management)
7. [User Management](#7-user-management)
8. [Salary Records](#8-salary-records)
9. [Reports and Export](#9-reports-and-export)
10. [Shift History](#10-shift-history)
11. [Cafe and Printer Settings](#11-cafe-and-printer-settings)
12. [Backup and Restore](#12-backup-and-restore)

---

## 1. Login and Navigation

Log in with an **ADMIN** role account:
- Username: `admin`
- Password: `admin123` (change this on first launch!)

The admin menu includes everything from the user menu, plus:
- **Admin → Dashboard** — cafe statistics
- **Admin → Users** — account management
- **Admin → Salaries** — salary payment records
- **Admin → Reports** — analytical reports
- **Admin → Shifts** — full shift history
- **Admin → Settings** — application configuration

---

## 2. Admin Dashboard

**[Screenshot: Admin dashboard]**

Displays key real-time metrics:

| Card | Description |
|------|-------------|
| Today | Revenue for the current day |
| This Month | Revenue for the current month |
| Last 7 Days | Daily trend chart |
| Top 5 Products | Best-selling items |
| White/Black | Ratio of official vs. off-books cash |
| By Category | Revenue distribution by category |

---

## 3. Managing Categories

Navigate to **Categories** from the main menu.

### Creating a Category

**[Screenshot: New category form]**

1. Click **"New Category"**
2. Enter the name in both Serbian and English
3. Set the sort order
4. Click **Save**

### Editing a Category

Click the **pencil** icon next to the category name.

### Deactivating a Category

Categories are soft-deleted — they disappear from the POS screen but remain in the database for historical data.

---

## 4. Managing Products

Navigate to **Products** from the main menu.

### Adding a New Product

**[Screenshot: New product form]**

1. Click **"New Product"**
2. Fill in the fields:
   - **Name (SR/EN)** — required in both languages
   - **Category** — select from dropdown
   - **Price** — in RSD (or configured currency)
   - **Unit** — `kom`, `lit`, `dcl`, `flaša`, `g`
   - **Norm Qty** — how many units are deducted from stock per sale (default: 1.0)
   - **Initial Stock** — starting quantity in inventory
3. Click **Save**

### Editing Price or Details

Click the **pencil** icon next to the product.

> Changing the price does not affect previously settled bills.

### Deactivating a Product

Deactivated products are hidden from the POS screen but remain in the database.

---

## 5. Inventory Management

Navigate to **Inventory** from the main menu.

### Viewing Stock

**[Screenshot: Inventory list]**

The table shows for each product:
- Current stock quantity
- Minimum threshold (shown in red if below threshold)
- Unit of measure

### Stock Replenishment (Purchase)

1. Find the product in the list
2. Click **"Purchase"** or the replenishment icon
3. Enter quantity and a note
4. Confirm — stock is increased

### Manual Stock Adjustment

For corrections such as waste, spoilage, or stock counts:
1. Click **"Adjust"** next to the product
2. Select type: **WASTE** or **ADJUSTMENT**
3. Enter quantity (positive = increase, negative = decrease)
4. Add a note (required for waste entries)

### Minimum Stock Threshold

Set the minimum alert threshold in **Admin → Settings → min_stock_threshold**.
Products below the threshold are highlighted in red.

---

## 6. Table Management

Navigate to the table layout editor (pencil/edit icon next to the table view).

### Adding a Table

1. Click **"Add Table"**
2. Enter a label (e.g. `Table T1`)
3. Select zone: **Indoor** / **Outdoor**
4. Click Save — the table appears on the layout

### Moving Tables (Drag & Drop)

In edit mode: grab and drag a table to the desired position.

### Deactivating a Table

Deactivated tables are hidden from users.

---

## 7. User Management

Navigate to **Admin → Users**.

### Creating a New User

**[Screenshot: New user form]**

1. Click **"New User"**
2. Fill in:
   - **Full Name** — displayed throughout the system
   - **Username** — used for login
   - **Password** — minimum 6 characters
   - **Role** — `ADMIN` or `WAITER`
3. Click **Save**

### Editing a User

Click the **pencil** icon — you can change the name, password, and role.

### Deactivating a User

A deactivated user cannot log in, but their data remains in the system.

### Reactivating a User

Click **"Reactivate"** next to a deactivated user.

---

## 8. Salary Records

Navigate to **Admin → Salaries**.

### Recording a Payment

**[Screenshot: Salary payment form]**

1. Click **"New Payment"**
2. Select the **user**
3. Enter the **amount** in RSD
4. Add a **note** (optional)
5. Click **Save**

### Viewing Records

The table shows all payments with filters:
- By user
- By date range (from/to)

---

## 9. Reports and Export

Navigate to **Admin → Reports**.

### Available Reports

| Report | Description |
|--------|-------------|
| Daily | Revenue for a selected day |
| Weekly | Revenue for a selected week |
| Monthly | Revenue for a selected month |
| Custom Period | Free date range selection |

### Report Contents

Each report includes:
- **Summary** — total revenue, white/black split, bill count, average bill
- **Top Products** — ranked list of best sellers
- **Revenue by Day** — bar chart over time
- **Revenue by Waiter** — who generated how much
- **By Category** — pie chart distribution
- **Comparison** — % growth/decline vs. previous period

### Exporting Data

In the top-right corner of each report:
- **PDF** — click the PDF icon to download
- **Excel** — click the table icon to download

---

## 10. Shift History

Navigate to **Admin → Shifts**.

Displays all shifts with:
- Who opened/closed the shift
- Start and end times
- Total revenue (white/black)
- Number of paid bills

Click on a shift for the detailed view (same screen waiters see when ending a shift).

---

## 11. Cafe and Printer Settings

Navigate to **Admin → Settings**.

### Cafe Information

| Field | Description |
|-------|-------------|
| Cafe Name | Shown on receipts and PDF exports |
| Address | Shown on receipts |
| Tax ID | Tax identification number |
| Phone | Contact phone number |
| Currency | Currency symbol (default: RSD) |
| Min. Stock | Inventory warning threshold |

### Printer Settings

| Field | Description |
|-------|-------------|
| Printer Type | USB / Network / Disabled |
| IP Address / COM Port | Depends on type |
| Port | TCP port (default: 9100) |
| Paper Width | 48 or 80 characters per line |

**Test Print:** Click the button to verify the connection.

---

## 12. Backup and Restore

Navigate to **Admin → Settings → Backup**.

### Manual Backup

1. Click **"Create Backup"**
2. The backup is saved to the configured folder
3. A list of all backups is shown with dates and file sizes

### Automatic Backup

The application **automatically creates a backup** on every close.
The most recent **30 backup files** are retained.

### Changing the Backup Folder

1. Click **"Change Folder"**
2. Select the desired folder (an external drive or network share is recommended)

### Restoring from a Backup

> **Warning:** Restore replaces the current database. Create a new backup before restoring!

1. In the backup list, click **"Restore"** next to the desired file
2. Confirm in the dialog
3. The application restarts automatically with the restored data

### Backup File Format

```
kafic_backup_YYYY-MM-DD_HH-mm.db
```

Example: `kafic_backup_2025-03-15_14-30.db`

---

## Recommended Routine Activities

| Activity | Frequency |
|----------|-----------|
| Review daily report | Every day |
| Check inventory levels | Every day |
| Review weekly report | Every week |
| Manual backup to external drive | Once a week |
| Rotate user passwords | Every 3 months |
