# Cashflow temporal filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sostituire il filtro mese singolo del Cashflow con range `from`/`to`, riepilogo annuale navigabile per anno (indipendente dalla griglia) e mesi cliccabili.

**Architecture:** Utility pure in `lib/cashflow/date-range.ts` (parse URL, bounds, evidenziazione); query server per range e aggregato anno; due client component nuovi (`YearSummaryBar`, `DateRangeFilter`) sincronizzano `searchParams`; `MovementsManager` compone tutto senza cambiare CRUD.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase SSR, shadcn/ui, Vitest (solo unit test utility), sonner.

**Spec:** [`docs/superpowers/specs/2026-06-04-cashflow-temporal-filters-design.md`](../specs/2026-06-04-cashflow-temporal-filters-design.md)

---

## File map

| File | Responsabilità |
|------|----------------|
| `lib/cashflow/date-range.ts` | Parse/validazione `from`/`to`/`year`, bounds mese, swap, URL builder, evidenziazione R9 |
| `lib/cashflow/date-range.test.ts` | Unit test utility (Vitest) |
| `lib/cashflow/types.ts` | `YearSummary`, `MonthSummaryEntry` |
| `lib/cashflow/format.ts` | `formatCompactEuro` per celle riepilogo |
| `lib/cashflow/queries.ts` | `listMovementsForRange`, `getRangeSummary`, `getYearMonthlySummaries` |
| `lib/cashflow/month.ts` | Mantieni `shiftMonthKey`, `monthDateBounds`; rimuovi export non usati se vuoti |
| `components/cashflow/year-summary-bar.tsx` | Riepilogo anno + griglia mesi cliccabili |
| `components/cashflow/date-range-filter.tsx` | Date picker Da/A + ‹ › mese |
| `components/cashflow/movements-manager.tsx` | Compone bar + filter + totali periodo + tabella |
| `app/(protected)/cashflow/page.tsx` | Legge `from`/`to`/`year`, carica 3 query parallele |
| `docs/MANUAL_TEST.md` | Checklist aggiornata |
| `package.json` | Script `test` + devDependency `vitest` |

---

### Task 1: Vitest e utility `date-range`

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `lib/cashflow/date-range.ts`
- Create: `lib/cashflow/date-range.test.ts`

- [ ] **Step 1: Aggiungere Vitest**

In `package.json`:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest run"
}
```

Run: `npm install -D vitest`

Create `vitest.config.ts`:

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

- [ ] **Step 2: Scrivere i test (falliscono — modulo assente)**

Create `lib/cashflow/date-range.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  buildCashflowSearchParams,
  getCurrentMonthBounds,
  isFullMonthRange,
  monthBoundsForYearMonth,
  parseDateRangeParams,
  parseYearParam,
} from "@/lib/cashflow/date-range";

describe("parseDateRangeParams", () => {
  it("defaults to current month when params missing", () => {
    const { from, to } = parseDateRangeParams(undefined, undefined);
    const current = getCurrentMonthBounds();
    expect(from).toBe(current.from);
    expect(to).toBe(current.to);
  });

  it("swaps when from > to", () => {
    const { from, to } = parseDateRangeParams("2026-06-20", "2026-06-01");
    expect(from).toBe("2026-06-01");
    expect(to).toBe("2026-06-20");
  });

  it("falls back on invalid ISO", () => {
    const { from, to } = parseDateRangeParams("bad", "2026-01-15");
    const current = getCurrentMonthBounds();
    expect(from).toBe(current.from);
    expect(to).toBe(current.to);
  });
});

describe("parseYearParam", () => {
  it("returns current year when invalid", () => {
    const year = parseYearParam("abc");
    expect(year).toBeGreaterThan(2000);
  });

  it("parses valid year", () => {
    expect(parseYearParam("2024")).toBe(2024);
  });
});

describe("monthBoundsForYearMonth", () => {
  it("returns full February 2024", () => {
    expect(monthBoundsForYearMonth(2024, 2)).toEqual({
      from: "2024-02-01",
      to: "2024-02-29",
    });
  });
});

describe("isFullMonthRange", () => {
  it("true for exact month", () => {
    expect(isFullMonthRange("2026-03-01", "2026-03-31", 2026, 3)).toBe(true);
  });

  it("false for partial range", () => {
    expect(isFullMonthRange("2026-03-10", "2026-03-31", 2026, 3)).toBe(false);
  });
});

describe("buildCashflowSearchParams", () => {
  it("preserves all params", () => {
    const qs = buildCashflowSearchParams({
      from: "2026-06-01",
      to: "2026-06-30",
      year: 2025,
    });
    expect(qs).toBe("from=2026-06-01&to=2026-06-30&year=2025");
  });
});
```

- [ ] **Step 3: Run test — atteso FAIL**

Run: `npm test`
Expected: FAIL — cannot find module `@/lib/cashflow/date-range`

- [ ] **Step 4: Implementare `date-range.ts`**

Create `lib/cashflow/date-range.ts`:

```ts
import { getCurrentMonthKey, monthDateBounds, shiftMonthKey } from "@/lib/cashflow/month";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type DateRange = { from: string; to: string };

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) {
    return false;
  }
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return (
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  );
}

export function getCurrentMonthBounds(): DateRange {
  const monthKey = getCurrentMonthKey();
  const { start, end } = monthDateBounds(monthKey);
  return { from: start, to: end };
}

export function getCurrentYear(): number {
  return Number(getCurrentMonthKey().slice(0, 4));
}

export function parseDateRangeParams(
  fromParam: string | undefined,
  toParam: string | undefined,
): DateRange {
  const fallback = getCurrentMonthBounds();

  if (!fromParam || !toParam) {
    return fallback;
  }

  if (!isValidIsoDate(fromParam) || !isValidIsoDate(toParam)) {
    return fallback;
  }

  if (fromParam > toParam) {
    return { from: toParam, to: fromParam };
  }

  return { from: fromParam, to: toParam };
}

export function parseYearParam(value: string | undefined): number {
  if (!value || !/^\d{4}$/.test(value)) {
    return getCurrentYear();
  }

  const year = Number(value);
  if (year < 1970 || year > 2100) {
    return getCurrentYear();
  }

  return year;
}

export function monthBoundsForYearMonth(year: number, month: number): DateRange {
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  const { start, end } = monthDateBounds(monthKey);
  return { from: start, to: end };
}

export function shiftMonthRange(from: string, delta: number): DateRange {
  const monthKey = from.slice(0, 7);
  const nextKey = shiftMonthKey(monthKey, delta);
  const { start, end } = monthDateBounds(nextKey);
  return { from: start, to: end };
}

export function isFullMonthRange(
  from: string,
  to: string,
  year: number,
  month: number,
): boolean {
  const bounds = monthBoundsForYearMonth(year, month);
  return from === bounds.from && to === bounds.to;
}

export function buildCashflowSearchParams(params: {
  from: string;
  to: string;
  year: number;
}): string {
  return new URLSearchParams({
    from: params.from,
    to: params.to,
    year: String(params.year),
  }).toString();
}

export const MONTH_ABBR_IT = [
  "Gen",
  "Feb",
  "Mar",
  "Apr",
  "Mag",
  "Giu",
  "Lug",
  "Ago",
  "Set",
  "Ott",
  "Nov",
  "Dic",
] as const;
```

- [ ] **Step 5: Run test — atteso PASS**

Run: `npm test`
Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts lib/cashflow/date-range.ts lib/cashflow/date-range.test.ts
git commit -m "feat(cashflow): date-range utilities with vitest"
```

---

### Task 2: Tipi e query server

**Files:**
- Modify: `lib/cashflow/types.ts`
- Modify: `lib/cashflow/queries.ts`

- [ ] **Step 1: Estendere i tipi**

In `lib/cashflow/types.ts`, aggiungere:

```ts
export type MonthSummaryEntry = MonthSummary & {
  month: number;
  monthKey: string;
};

export type YearSummary = {
  year: number;
  months: MonthSummaryEntry[];
  totalIncome: number;
  totalExpense: number;
  net: number;
};
```

- [ ] **Step 2: Refactor query range + anno**

Replace `listMovementsForMonth` / `getMonthSummary` in `lib/cashflow/queries.ts`:

```ts
import type { MonthSummary, MonthSummaryEntry, Movement, YearSummary } from "@/lib/cashflow/types";
import { monthBoundsForYearMonth } from "@/lib/cashflow/date-range";

function emptyMonthSummary(month: number, year: number): MonthSummaryEntry {
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  return {
    month,
    monthKey,
    totalIncome: 0,
    totalExpense: 0,
    net: 0,
  };
}

export async function listMovementsForRange(
  from: string,
  to: string,
): Promise<Movement[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("movements")
    .select(
      "id, type, amount, occurred_on, description, created_at, category_id, movement_categories(name)",
    )
    .gte("occurred_on", from)
    .lte("occurred_on", to)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapMovement(row as MovementRow));
}

export async function getRangeSummary(from: string, to: string): Promise<MonthSummary> {
  const movements = await listMovementsForRange(from, to);

  const totalIncome = movements
    .filter((m) => m.type === "income")
    .reduce((sum, m) => sum + m.amount, 0);

  const totalExpense = movements
    .filter((m) => m.type === "expense")
    .reduce((sum, m) => sum + m.amount, 0);

  return {
    totalIncome,
    totalExpense,
    net: totalIncome - totalExpense,
  };
}

export async function getYearMonthlySummaries(year: number): Promise<YearSummary> {
  const supabase = await createClient();
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;

  const { data, error } = await supabase
    .from("movements")
    .select("type, amount, occurred_on")
    .gte("occurred_on", from)
    .lte("occurred_on", to);

  if (error) {
    throw new Error(error.message);
  }

  const months: MonthSummaryEntry[] = Array.from({ length: 12 }, (_, index) =>
    emptyMonthSummary(index + 1, year),
  );

  for (const row of data ?? []) {
    const month = Number(String(row.occurred_on).slice(5, 7));
    const entry = months[month - 1];
    const amount = Number(row.amount);

    if (row.type === "income") {
      entry.totalIncome += amount;
    } else {
      entry.totalExpense += amount;
    }
    entry.net = entry.totalIncome - entry.totalExpense;
  }

  const totalIncome = months.reduce((sum, m) => sum + m.totalIncome, 0);
  const totalExpense = months.reduce((sum, m) => sum + m.totalExpense, 0);

  return {
    year,
    months,
    totalIncome,
    totalExpense,
    net: totalIncome - totalExpense,
  };
}
```

Rimuovere `listMovementsForMonth` e `getMonthSummary`. Rimuovere import `monthDateBounds` se non più usato.

- [ ] **Step 3: Verificare build TypeScript**

Run: `npm run build`
Expected: FAIL finché `page.tsx` importa ancora le funzioni vecchie — ok in questo task; verificare almeno che `queries.ts` non abbia errori lint locali.

- [ ] **Step 4: Commit**

```bash
git add lib/cashflow/types.ts lib/cashflow/queries.ts
git commit -m "feat(cashflow): range and year summary queries"
```

---

### Task 3: Formato compatto euro

**Files:**
- Modify: `lib/cashflow/format.ts`

- [ ] **Step 1: Aggiungere `formatCompactEuro`**

```ts
export function formatCompactEuro(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "−" : "";

  if (abs >= 1000) {
    const compact = new Intl.NumberFormat("it-IT", {
      maximumFractionDigits: 1,
      notation: "compact",
    }).format(abs);
    return `${sign}${compact} €`;
  }

  return `${sign}${new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(abs)}`;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/cashflow/format.ts
git commit -m "feat(cashflow): compact euro formatter for year summary"
```

---

### Task 4: `YearSummaryBar`

**Files:**
- Create: `components/cashflow/year-summary-bar.tsx`

- [ ] **Step 1: Implementare componente**

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { formatCompactEuro, formatEuro } from "@/lib/cashflow/format";
import {
  MONTH_ABBR_IT,
  buildCashflowSearchParams,
  isFullMonthRange,
  monthBoundsForYearMonth,
} from "@/lib/cashflow/date-range";
import type { YearSummary } from "@/lib/cashflow/types";
import { cn } from "@/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useRouter } from "next/navigation";

type YearSummaryBarProps = {
  yearSummary: YearSummary;
  rangeFrom: string;
  rangeTo: string;
};

export function YearSummaryBar({
  yearSummary,
  rangeFrom,
  rangeTo,
}: YearSummaryBarProps) {
  const router = useRouter();
  const { year } = yearSummary;

  function navigate(params: { from: string; to: string; year: number }) {
    router.push(`/cashflow?${buildCashflowSearchParams(params)}`);
  }

  function shiftYear(delta: number) {
    navigate({ from: rangeFrom, to: rangeTo, year: year + delta });
  }

  function selectMonth(month: number) {
    const bounds = monthBoundsForYearMonth(year, month);
    navigate({ from: bounds.from, to: bounds.to, year });
  }

  return (
    <section className="space-y-3 rounded-lg border bg-muted/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Anno precedente"
            onClick={() => shiftYear(-1)}
          >
            <ChevronLeftIcon />
          </Button>
          <span className="min-w-16 text-center text-sm font-semibold">{year}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Anno successivo"
            onClick={() => shiftYear(1)}
          >
            <ChevronRightIcon />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Riepilogo annuale</p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">Entrate anno</p>
          <p className="font-semibold text-emerald-600 dark:text-emerald-500">
            {formatEuro(yearSummary.totalIncome)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Uscite anno</p>
          <p className="font-semibold">{formatEuro(yearSummary.totalExpense)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Netto anno</p>
          <p
            className={cn(
              "font-semibold",
              yearSummary.net >= 0
                ? "text-emerald-600 dark:text-emerald-500"
                : "text-destructive",
            )}
          >
            {formatEuro(yearSummary.net)}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="grid min-w-[720px] grid-cols-12 gap-1">
          {yearSummary.months.map((entry) => {
            const highlighted = isFullMonthRange(
              rangeFrom,
              rangeTo,
              year,
              entry.month,
            );

            return (
              <button
                key={entry.monthKey}
                type="button"
                aria-current={highlighted ? "true" : undefined}
                onClick={() => selectMonth(entry.month)}
                className={cn(
                  "rounded-md border bg-background p-2 text-left text-xs transition-colors hover:bg-muted/50",
                  highlighted && "border-primary ring-1 ring-primary/30",
                )}
              >
                <p className="mb-1 font-medium">{MONTH_ABBR_IT[entry.month - 1]}</p>
                <p className="text-emerald-600 dark:text-emerald-500">
                  {formatCompactEuro(entry.totalIncome)}
                </p>
                <p className="text-muted-foreground">
                  {formatCompactEuro(entry.totalExpense)}
                </p>
                <p
                  className={cn(
                    entry.net >= 0
                      ? "text-emerald-600 dark:text-emerald-500"
                      : "text-destructive",
                  )}
                >
                  {formatCompactEuro(entry.net)}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/cashflow/year-summary-bar.tsx
git commit -m "feat(cashflow): year summary bar with clickable months"
```

---

### Task 5: `DateRangeFilter`

**Files:**
- Create: `components/cashflow/date-range-filter.tsx`

- [ ] **Step 1: Implementare componente**

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildCashflowSearchParams, shiftMonthRange } from "@/lib/cashflow/date-range";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type DateRangeFilterProps = {
  from: string;
  to: string;
  year: number;
};

export function DateRangeFilter({ from, to, year }: DateRangeFilterProps) {
  const router = useRouter();
  const [localFrom, setLocalFrom] = useState(from);
  const [localTo, setLocalTo] = useState(to);

  useEffect(() => {
    setLocalFrom(from);
    setLocalTo(to);
  }, [from, to]);

  function navigate(nextFrom: string, nextTo: string) {
    router.push(
      `/cashflow?${buildCashflowSearchParams({ from: nextFrom, to: nextTo, year })}`,
    );
  }

  function commitRange(nextFrom: string, nextTo: string) {
    if (!nextFrom || !nextTo) {
      return;
    }
    navigate(nextFrom, nextTo);
  }

  function shiftMonth(delta: number) {
    const next = shiftMonthRange(from, delta);
    navigate(next.from, next.to);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Periodo mese precedente"
        onClick={() => shiftMonth(-1)}
      >
        <ChevronLeftIcon />
      </Button>

      <div className="space-y-1">
        <Label htmlFor="range-from">Da</Label>
        <Input
          id="range-from"
          type="date"
          value={localFrom}
          onChange={(event) => setLocalFrom(event.target.value)}
          onBlur={() => commitRange(localFrom, localTo)}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="range-to">A</Label>
        <Input
          id="range-to"
          type="date"
          value={localTo}
          onChange={(event) => setLocalTo(event.target.value)}
          onBlur={() => commitRange(localFrom, localTo)}
        />
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Periodo mese successivo"
        onClick={() => shiftMonth(1)}
      >
        <ChevronRightIcon />
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/cashflow/date-range-filter.tsx
git commit -m "feat(cashflow): date range filter with month shortcuts"
```

---

### Task 6: Aggiornare `MovementsManager` e `page.tsx`

**Files:**
- Modify: `components/cashflow/movements-manager.tsx`
- Modify: `app/(protected)/cashflow/page.tsx`

- [ ] **Step 1: Aggiornare props e layout in `movements-manager.tsx`**

Sostituire import `shiftMonthKey` con i nuovi componenti. Props:

```tsx
type MovementsManagerProps = {
  from: string;
  to: string;
  year: number;
  movements: Movement[];
  summary: MonthSummary;
  yearSummary: YearSummary;
  categories: MovementCategoryOption[];
};
```

Rimuovere `monthKey`, `monthLabel`, `navigateMonth`, blocco ‹ › mese centrale.

In cima al `return`, prima del filtro:

```tsx
<YearSummaryBar
  yearSummary={yearSummary}
  rangeFrom={from}
  rangeTo={to}
/>

<div className="flex flex-wrap items-center justify-between gap-4">
  <DateRangeFilter from={from} to={to} year={year} />
  {/* Dialog Aggiungi movimento — invariato */}
</div>
```

Empty state: sostituire `monthLabel` con testo generico:

```tsx
<p>Nessun movimento nel periodo selezionato.</p>
```

- [ ] **Step 2: Aggiornare `page.tsx`**

```tsx
import {
  parseDateRangeParams,
  parseYearParam,
} from "@/lib/cashflow/date-range";
import {
  getRangeSummary,
  getYearMonthlySummaries,
  listMovementsForRange,
} from "@/lib/cashflow/queries";

type PageProps = {
  searchParams: Promise<{ from?: string; to?: string; year?: string }>;
};

// inside component:
const params = await searchParams;
const { from, to } = parseDateRangeParams(params.from, params.to);
const year = parseYearParam(params.year);

const [movements, summary, yearSummary, categories] = await Promise.all([
  listMovementsForRange(from, to),
  getRangeSummary(from, to),
  getYearMonthlySummaries(year),
  listCategoryOptions(),
]);

<MovementsManager
  from={from}
  to={to}
  year={year}
  movements={movements}
  summary={summary}
  yearSummary={yearSummary}
  categories={categories}
/>
```

Aggiornare `CardDescription`: «consulta i movimenti del periodo selezionato».

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add components/cashflow/movements-manager.tsx app/(protected)/cashflow/page.tsx
git commit -m "feat(cashflow): wire date range filters and year summary"
```

---

### Task 7: Pulizia e documentazione

**Files:**
- Modify: `lib/cashflow/month.ts` (opzionale: rimuovere `parseMonthParam`, `formatMonthLabel` se non referenziati)
- Modify: `docs/MANUAL_TEST.md`

- [ ] **Step 1: Rimuovere dead code**

Run: `rg "parseMonthParam|formatMonthLabel|listMovementsForMonth|getMonthSummary" --glob '*.{ts,tsx}'`

Rimuovere export/funzioni non più usati da `month.ts` e `queries.ts`.

- [ ] **Step 2: Aggiornare checklist in `docs/MANUAL_TEST.md`**

Sostituire la sezione «Cashflow (movimenti personali)» con:

```markdown
## Cashflow (movimenti personali)

- [ ] Apri `/cashflow` senza query → griglia mese corrente (`from`/`to`), riepilogo anno corrente.
- [ ] Riepilogo annuale: ‹ › anno cambia solo i mesi del riepilogo; griglia invariata.
- [ ] Click su un mese nel riepilogo → `from`/`to` impostati a quel mese intero; griglia aggiornata.
- [ ] Date picker Da/A con range parziale → movimenti e totali periodo corretti; nessun mese evidenziato nel riepilogo.
- [ ] ‹ › accanto ai date picker → salta al mese intero precedente/successivo.
- [ ] Aggiungi/modifica/elimina movimento → totali periodo e riepilogo anno coerenti dopo refresh.
- [ ] Secondo utente non vede movimenti del primo (RLS).
- [ ] Empty state periodo vuoto → CTA «Aggiungi movimento».
- [ ] Mobile: riepilogo mesi scroll orizzontale.
```

- [ ] **Step 3: Run lint e test**

Run: `npm run lint && npm test && npm run build`
Expected: all PASS

- [ ] **Step 4: Commit**

```bash
git add docs/MANUAL_TEST.md lib/cashflow/month.ts
git commit -m "docs: update cashflow manual tests for temporal filters"
```

---

## Spec coverage (self-review)

| Requisito | Task |
|-----------|------|
| R1 Range `from`/`to`, default mese corrente | Task 1, 6 |
| R2 Totali periodo | Task 2, 6 |
| R3 Lista filtrata range | Task 2, 6 |
| R4 Riepilogo anno + 12 mesi | Task 2, 4 |
| R5 ‹ › anno indipendente da griglia | Task 4 |
| R6 Click mese → bounds mese | Task 4 |
| R7 Range parziale date picker | Task 5 |
| R8 ‹ › mese intero date picker | Task 5 |
| R9 Evidenziazione mese | Task 1, 4 |
| Query `year` param | Task 1, 6 |
| Swap `from` > `to` | Task 1 |
| Responsive scroll mesi | Task 4 |
| Test manuali doc | Task 7 |
