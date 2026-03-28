# Phase 7.1 — User Management and Salary Payments

## Overview

This phase implements a complete CRUD for system users and salary payment tracking for waiters.

## Implemented Files

### Server

| File | Description |
|---|---|
| `server/services/userService.ts` | Business logic for users (CRUD, soft delete, validation) |
| `server/services/salaryService.ts` | Business logic for salary payments |
| `server/routes/users.ts` | REST routes for users |
| `server/routes/salaries.ts` | REST routes for salaries |

### Frontend

| File | Description |
|---|---|
| `src/api/users.ts` | API client for users |
| `src/api/salaries.ts` | API client for salaries |
| `src/pages/admin/UsersPage.tsx` | User management page |
| `src/pages/admin/SalariesPage.tsx` | Salary payments page |

## API Endpoints

### Users (`/api/v1/users`)

| Method | Path | Description |
|---|---|---|
| GET | `/` | List all users (without password) |
| GET | `/:id` | Single user by ID |
| POST | `/` | Create a new user |
| PUT | `/:id` | Update user |
| DELETE | `/:id` | Deactivate (soft delete) |
| PUT | `/:id/reactivate` | Reactivate user |

### Salaries (`/api/v1/salaries`)

| Method | Path | Description |
|---|---|---|
| GET | `/` | List payments (filters: userId, dateFrom, dateTo) |
| POST | `/` | New salary payment |

## Business Rules

### Users
- Password is hashed with bcryptjs at salt rounds = 10
- Username must be unique across the entire system
- An admin cannot deactivate their own account
- A user with an active shift cannot be deactivated
- Deactivation is a soft delete (`active = false`), not physical deletion
- Roles are validated at the service layer: `ADMIN` | `WAITER`

### Salaries
- Amount must be a positive number (> 0)
- Payment date is optional — defaults to current time
- Every payment records who created it (`paidById` = currently logged-in admin)
- Filtering by user and date range

## Frontend Features

### UsersPage
- Users table with columns: Full Name, Username, Role, Status, Created At, Actions
- Badge for role (Administrator/Waiter) and status (Active/Inactive)
- Create modal: fullName, username, password (min 6 characters), role dropdown
- Edit modal: fullName, username, optional new password
- Confirm dialog for deactivation
- Deactivate button is hidden for the currently logged-in user's own row

### SalariesPage
- Summary cards showing total paid and last payment per waiter
- Filters: waiter, date from, date to
- History table sorted by date (desc)
- Payment modal: waiter dropdown (active users only), amount, date, note
