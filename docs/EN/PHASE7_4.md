# Phase 7.4 — Admin Dashboard with Statistics and Charts

## Overview

Admin dashboard page showing key business metrics for the cafe in real time, with visual charts.

## Implemented Files

### Backend
- `server/services/dashboardService.ts` — service that fetches and computes all metrics
- `server/routes/dashboard.ts` — GET `/api/v1/dashboard` (authenticateToken + requireAdmin)
- `server/index.ts` — mounted at `/api/v1/dashboard`

### Frontend
- `src/api/dashboard.ts` — typed API client
- `src/pages/admin/AdminDashboardPage.tsx` — React page with cards and charts

### i18n
- `src/i18n/sr.json` — added `adminDashboard.*` namespace
- `src/i18n/en.json` — added `adminDashboard.*` namespace

### Routing
- `src/App.tsx` — added route `/admin/dashboard`
- `src/pages/DashboardPage.tsx` — added "Admin Dashboard" card in admin panels

## Endpoint

```
GET /api/v1/dashboard
Authorization: Bearer <token>   (admin only)
```

### Response (DashboardData)
```typescript
{
  today: {
    revenue:          number,   // today's revenue
    revenueYesterday: number,   // yesterday's revenue
    changePercent:    number | null,  // % change
    billCount:        number,   // number of bills today
    avgBill:          number,   // average bill today
  },
  monthToDate: {
    revenue: number,            // revenue from start of month
  },
  last7Days: [                  // 7 days back, including today
    { date: string, total: number, white: number, black: number }
  ],
  topProducts: [                // top 5 products by quantity (7 days)
    { nameSr: string, nameEn: string, quantity: number }
  ],
  whiteBlackRatio: {
    white: number,
    black: number,
  },
  categoryBreakdown: [          // revenue breakdown by category (month)
    { nameSr: string, nameEn: string, total: number }
  ]
}
```

## Charts (recharts)

| Chart | Type | Data |
|---|---|---|
| Revenue last 7 days | StackedBarChart | `last7Days` (white + black) |
| Top 5 products | Horizontal BarChart | `topProducts` |
| White / Black | PieChart (donut) | `whiteBlackRatio` |
| By category | PieChart | `categoryBreakdown` |

## Prisma Queries

The service runs 4 parallel queries:
1. `todayBills` — bills with items for today
2. `yesterdayBills` — totals only for yesterday (comparison)
3. `monthBills` — bills with items from start of month
4. `last7DaysBills` — bills with items for the last 7 days

All filters: `status: 'PAID'`, `paidAt: { gte, lt }`.
