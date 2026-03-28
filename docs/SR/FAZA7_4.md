# Faza 7.4 — Admin Dashboard sa statistikama i grafikonima

## Pregled

Admin dashboard stranica koja prikazuje ključne poslovne metrike kafića u realnom vremenu, sa vizuelnim grafikonima.

## Implementirani fajlovi

### Backend
- `server/services/dashboardService.ts` — servis koji dohvata i izračunava sve metrike
- `server/routes/dashboard.ts` — GET `/api/v1/dashboard` (authenticateToken + requireAdmin)
- `server/index.ts` — mount na `/api/v1/dashboard`

### Frontend
- `src/api/dashboard.ts` — typed API klijent
- `src/pages/admin/AdminDashboardPage.tsx` — React stranica sa karticama i grafikonima

### i18n
- `src/i18n/sr.json` — dodat `adminDashboard.*` namespace
- `src/i18n/en.json` — dodat `adminDashboard.*` namespace

### Routing
- `src/App.tsx` — dodata ruta `/admin/dashboard`
- `src/pages/DashboardPage.tsx` — dodata kartica "Admin Dashboard" u admin panele

## Endpoint

```
GET /api/v1/dashboard
Authorization: Bearer <token>   (admin only)
```

### Odgovor (DashboardData)
```typescript
{
  today: {
    revenue:          number,   // prihod danas
    revenueYesterday: number,   // prihod juče
    changePercent:    number | null,  // % promena
    billCount:        number,   // broj računa danas
    avgBill:          number,   // prosečan račun danas
  },
  monthToDate: {
    revenue: number,            // prihod od početka meseca
  },
  last7Days: [                  // 7 dana unazad, uključujući danas
    { date: string, total: number, white: number, black: number }
  ],
  topProducts: [                // top 5 artikala po količini (7 dana)
    { nameSr: string, nameEn: string, quantity: number }
  ],
  whiteBlackRatio: {
    white: number,
    black: number,
  },
  categoryBreakdown: [          // raspodela prihoda po kategorijama (mesec)
    { nameSr: string, nameEn: string, total: number }
  ]
}
```

## Grafikoni (recharts)

| Grafikon | Tip | Podaci |
|---|---|---|
| Promet poslednjih 7 dana | StackedBarChart | `last7Days` (belo + crno) |
| Top 5 artikala | Horizontal BarChart | `topProducts` |
| Belo / Crno | PieChart (donut) | `whiteBlackRatio` |
| Po kategorijama | PieChart | `categoryBreakdown` |

## Prisma upiti

Servis izvršava 4 paralelna upita:
1. `todayBills` — računi sa stavkama za danas
2. `yesterdayBills` — samo ukupni iznosi za juče (poređenje)
3. `monthBills` — računi sa stavkama od početka meseca
4. `last7DaysBills` — računi sa stavkama za poslednjih 7 dana

Svi filteri: `status: 'PAID'`, `paidAt: { gte, lt }`.
