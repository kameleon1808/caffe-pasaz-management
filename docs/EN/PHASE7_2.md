# Phase 7.2 — Financial Reports

## Overview

Implementation of the financial reporting system for Kafić Pasaz Management.

## Features

### Report Types

| Type | Route | Description |
|------|-------|-------------|
| Daily | `/admin/reports/daily` | Single-day report with date picker |
| Weekly | `/admin/reports/weekly` | Week report (Mon–Sun) with bar chart |
| Monthly | `/admin/reports/monthly` | Month report with line and pie charts |
| Custom | `/admin/reports/custom` | Arbitrary date range report |

### Data Shown in Every Report

- **Summary**: total revenue, white, black, bill count, average bill
- **Comparison**: percentage change vs. the equivalent previous period
- **Top 10 products**: sorted by revenue
- **Revenue by day**: displayed in a chart (bar or line)
- **Revenue by waiter (shift)**: tabular view (daily report only)
- **Category breakdown**: pie chart + table (monthly and custom)

## Architecture

### Server Layer

- `server/services/reportService.ts` — all business logic, one Prisma query per period, in-memory calculations
- `server/routes/reports.ts` — four GET endpoints mounted at `/api/v1/reports`

### Frontend Layer

- `src/api/reports.ts` — typed API client
- `src/components/reports/ReportSummaryCards.tsx` — summary cards
- `src/components/reports/TopProductsTable.tsx` — top products table
- `src/components/reports/ComparisonBadge.tsx` — percentage change badge
- `src/pages/admin/reports/DailyReportPage.tsx`
- `src/pages/admin/reports/WeeklyReportPage.tsx`
- `src/pages/admin/reports/MonthlyReportPage.tsx`
- `src/pages/admin/reports/CustomReportPage.tsx`

## Charts

Library used: **recharts** (installed as npm dependency)

- Bar chart: weekly and custom report
- Line chart: monthly report (revenue by day)
- Pie chart: monthly report (category breakdown)

## Translations

Keys added under `reports.*` in both files: `src/i18n/sr.json` and `src/i18n/en.json`.

## Dashboard Cards

Added 4 admin cards on the Dashboard for quick access to each report type.
