# Kafic App — User Guide (Waiter)

## Contents
1. [Login and Language](#1-login-and-language)
2. [Home Screen](#2-home-screen)
3. [Starting a Shift](#3-starting-a-shift)
4. [Working with Tables](#4-working-with-tables)
5. [Opening and Managing a Bill](#5-opening-and-managing-a-bill)
6. [Adding Items to a Bill](#6-adding-items-to-a-bill)
7. [Discounts and Special Options](#7-discounts-and-special-options)
8. [Payment and Printing](#8-payment-and-printing)
9. [Ending the Shift](#9-ending-the-shift)

---

## 1. Login and Language

### Login

**[Screenshot: Login screen]**

1. Open the application — the login screen is displayed
2. Enter your **Username** and **Password**
3. Click **Log In**

> Default account: `konobar` / `konobar123`
> Passwords are changed by the Administrator under Admin → Users.

### Language Toggle

The current language (**SR** or **EN**) is shown in the top-right corner.
Click the button to switch between Serbian and English.

---

## 2. Home Screen

**[Screenshot: Dashboard]**

After logging in, the dashboard shows:
- **Active Shift** card — whether a shift is open and who opened it
- **Tables** card — quick access to the table layout
- **Active Bills** card — number of open bills

---

## 3. Starting a Shift

> **Important:** Tables and bills cannot be accessed without an open shift.

**[Screenshot: "No active shift" message]**

1. Click the **"Start Shift"** button (shown when no shift is active)
2. Confirm in the dialog
3. The shift opens — your name and start time are displayed

---

## 4. Working with Tables

### Table Layout

**[Screenshot: Table layout — indoor area]**

Navigate to **Tables** from the menu or dashboard.
Tables are divided into two zones:
- **Indoor** (labels U1–U6) — shown in blue
- **Outdoor** (labels S1–S12) — shown in green

Table colors:
| Color | Meaning |
|-------|---------|
| Grey | Free table |
| Orange/Red | Occupied table (has an open bill) |

### Opening a Table

Click on a free table to open a new bill for it.

---

## 5. Opening and Managing a Bill

### New Bill

**[Screenshot: POS screen]**

Clicking a free table automatically opens the POS screen with an empty bill.

POS screen layout:
- **Left panel** — list of items on the current bill
- **Right panel** — categories and products to add

### Returning to an Occupied Table

Click an occupied (orange/red) table to continue working on its open bill.

---

## 6. Adding Items to a Bill

**[Screenshot: Selecting category and product]**

1. In the right panel, select a **category** (Coffee, Beer, Soft Drinks…)
2. Click a **product name** to add it to the bill
3. The item appears in the bill list with quantity 1

### Changing Quantity

- Click **+** or **−** next to an item to increase/decrease quantity
- Type a number directly in the quantity field
- Click **X** to remove an item from the bill

### White / Black

Each item can be flagged as:
- **White** — normal, officially recorded transaction
- **Black** — off-the-books cash transaction

Click the color indicator next to an item to toggle between white/black.

---

## 7. Discounts and Special Options

### Bill Discount

**[Screenshot: Discount input field]**

1. Find the **"Discount (%)"** field at the bottom of the bill list
2. Enter a percentage (e.g. `10` for 10%)
3. The total updates automatically

### Table Transfer

If guests move from one table to another:

1. Click **"Transfer Table"** in the POS screen
2. Select the target (free) table
3. The bill is transferred — the original table becomes free

---

## 8. Payment and Printing

### Payment

**[Screenshot: Payment confirmation]**

1. Click the **"Pay"** button at the bottom of the POS screen
2. The total amount is displayed
3. Confirm by clicking **"Confirm Payment"**
4. The bill closes; the table becomes free

### Printing

After confirming payment:
- If a printer is configured, the receipt is **printed automatically**
- For reprints: find the bill in history and click **"Reprint"**

### Cancelling a Bill

To void a bill without payment:
1. Click **"Cancel Bill"**
2. Enter a reason (optional)
3. Confirm — the bill receives status CANCELLED

---

## 9. Ending the Shift

> A shift can be ended by the waiter who opened it, or by an administrator.

**[Screenshot: Shift summary screen]**

### Shift Review Before Closing

1. Click **"End Shift"** in the main menu
2. The **shift report** is displayed with:
   - Total revenue (white/black)
   - Number of paid/cancelled bills
   - Sales by product
   - Inventory status

### Inventory Check

**[Screenshot: Inventory section]**

On the end-of-shift screen you can:
- View how much of each product was consumed
- Enter manual adjustments (waste/spoilage) if needed
- Add a note to each adjustment

### Confirming the End

Click **"End Shift"** at the bottom of the screen to confirm.
The app can optionally print a shift summary.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `F5` | Refresh table layout |
| `Esc` | Close modal dialog |
| `Enter` | Confirm dialog action |

---

## Notes

- Never close the app in the middle of a payment — always complete the transaction first
- A backup is automatically created every time the application is closed
- If the app crashes, data remains safely in the database — simply relaunch it
