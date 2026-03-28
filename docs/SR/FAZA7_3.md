# Faza 7.3 — PDF/Excel Export i Podešavanja Kafića

## Pregled

Faza 7.3 dodaje:
1. **PDF export** izveštaja koristeći `pdfmake` biblioteku
2. **Excel export** izveštaja koristeći `exceljs` biblioteku
3. **Stranica za podešavanja kafića** (`/admin/settings`) sa podacima o kafeu
4. **Proširenje settings API-ja** sa generičkim GET / i PUT / endpointima

---

## Novo u bazi / serveru

### `server/services/settingsService.ts` (prošireno)
Dodane funkcije:
- `getAllSettings()` — vraća sva podešavanja kao `Record<string, string>`
- `getSetting(key)` — vraća jednu vrednost po ključu
- `upsertSetting(key, value)` — upsertuje jedno podešavanje
- `bulkUpsert(settings)` — bulk upsert više podešavanja odjednom

### `server/routes/settings.ts` (prošireno)
Novi endpointi:
- `GET /api/v1/settings` — vraća sva podešavanja (requireAuth)
- `PUT /api/v1/settings` — bulk update, body: `{ settings: Record<string, string> }` (requireAuth + requireAdmin)

---

## Novi frontend fajlovi

### `src/api/settings.ts` (prošireno)
Dodat novi interfejs i funkcije:
```typescript
export interface CafeSettings {
  cafe_name?: string;
  cafe_address?: string;
  cafe_pib?: string;
  cafe_phone?: string;
  min_stock_threshold?: string;
  currency?: string;
}

export async function getSettings(): Promise<CafeSettings>
export async function updateSettings(settings: CafeSettings): Promise<void>
```

### `src/utils/exportPdf.ts` (novo)
Funkcija `exportReportToPdf(options: PdfExportOptions): void`

PDF struktura:
1. Zaglavlje kafića (naziv, adresa, PIB)
2. Naslov izveštaja
3. Sažetak prometa (tabela)
4. Top 10 artikala
5. Promet po konobaru
6. Footer sa datumom generisanja

### `src/utils/exportExcel.ts` (novo)
Async funkcija `exportReportToExcel(options: ExcelExportOptions): Promise<void>`

Excel radni listovi:
- **Promet** — sažetak prometa i podaci o kafeu
- **Prodaja** — top artikli sa količinom i iznosom
- **Konobari** — promet po konobaru/smeni
- **Kategorije** — raspodela po kategorijama

### `src/pages/admin/SettingsPage.tsx` (novo)
Forma sa poljima:
- Naziv kafića (`cafe_name`)
- Adresa (`cafe_address`)
- PIB (`cafe_pib`)
- Telefon (`cafe_phone`)
- Minimalan prag zaliha (`min_stock_threshold`)
- Valuta (`currency`)

Napomena: Podešavanja štampača su na `/admin/settings/printer` (Faza 5).

---

## Izmenjene stranice izveštaja

Svaka od 4 stranice izveštaja dobila je:
- `const [cafeSettings, setCafeSettings] = useState<CafeSettings>({})`
- `useEffect` koji učitava podešavanja pri montaži
- Dva dugmeta: **Export PDF** (plavo) i **Export Excel** (zeleno)
- Dugmad su onesposobljena dok nema podataka ili tokom učitavanja

---

## Rute

| URL | Komponenta |
|-----|-----------|
| `/settings` | `SettingsPage` |
| `/admin/settings` | `SettingsPage` |

---

## Prevodi

Dodati ključevi u `sr.json` i `en.json`:
- `settings.*` — sva podešavanja kafića
- `export.*` — export dugmad i poruke

---

## Instalovane zavisnosti

```
pdfmake ^0.3.7
exceljs ^4.4.0
@types/pdfmake ^0.3.2 (devDependency)
```
