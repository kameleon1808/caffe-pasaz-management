# Faza 7.2 — Finansijski izveštaji

## Pregled

Implementacija sistema finansijskih izveštaja za Kafić Pasaz Management.

## Funkcionalnosti

### Tipovi izveštaja

| Tip | Ruta | Opis |
|-----|------|------|
| Dnevni | `/admin/reports/daily` | Izveštaj za jedan dan sa date picker-om |
| Nedeljni | `/admin/reports/weekly` | Izveštaj za nedelju (Pon–Ned) sa bar grafikonom |
| Mesečni | `/admin/reports/monthly` | Izveštaj za mesec sa line i pie grafikonom |
| Prilagođeni | `/admin/reports/custom` | Izveštaj za proizvoljni period |

### Prikazani podaci u svakom izveštaju

- **Sažetak**: ukupan promet, belo, crno, broj računa, prosečan račun
- **Poređenje**: procentualna promena u odnosu na prethodni ekvivalentni period
- **Top 10 artikala**: sortirani po prihodu
- **Promet po danima**: prikazan u grafikonu (bar ili line)
- **Promet po konobaru (smeni)**: tabelarni prikaz (dnevni izveštaj)
- **Raspodela po kategorijama**: pie grafikon + tabela (mesečni i prilagođeni)

## Arhitektura

### Server sloj

- `server/services/reportService.ts` — sva poslovna logika, jedan Prisma upit po periodu, in-memory kalkulacije
- `server/routes/reports.ts` — četiri GET endpointa montirana na `/api/v1/reports`

### Frontend sloj

- `src/api/reports.ts` — typed API klijent
- `src/components/reports/ReportSummaryCards.tsx` — kartice sa sažetkom
- `src/components/reports/TopProductsTable.tsx` — tabela top artikala
- `src/components/reports/ComparisonBadge.tsx` — bedž sa procentualnom promenom
- `src/pages/admin/reports/DailyReportPage.tsx`
- `src/pages/admin/reports/WeeklyReportPage.tsx`
- `src/pages/admin/reports/MonthlyReportPage.tsx`
- `src/pages/admin/reports/CustomReportPage.tsx`

## Grafički prikaz

Korišćena biblioteka: **recharts** (instalirana kao npm zavisnost)

- Bar chart: nedeljni i prilagođeni izveštaj
- Line chart: mesečni izveštaj (promet po danima)
- Pie chart: mesečni izveštaj (raspodela po kategorijama)

## Prevodi

Dodate ključeve pod `reports.*` u oba fajla: `src/i18n/sr.json` i `src/i18n/en.json`.

## Dashboard kartice

Dodato 4 admin kartice na Dashboard za brzi pristup svakom tipu izveštaja.
