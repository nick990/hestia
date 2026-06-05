# Family share quota — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere toggle «Considera solo la mia quota» al cashflow: movimenti famiglia divisi per membri attuali in tabella, totali periodo e riepilogo annuale.

**Architecture:** Logica pura in `lib/cashflow/share.ts` (parse URL, `getEffectiveAmount`, transform movimenti); conteggio membri via RPC Postgres `security definer`; query server applicano share dopo filtro `view`; UI checkbox sotto segment control con propagazione `share=1` in tutta la navigazione cashflow.

**Tech Stack:** Next.js 16, React 19, Supabase (Postgres RLS + RPC), Vitest, shadcn Checkbox.

**Spec:** [`docs/superpowers/specs/2026-06-05-family-share-quota-design.md`](../specs/2026-06-05-family-share-quota-design.md)

---

## File map

| File | Responsabilità |
|------|----------------|
| `supabase/migrations/20250605163000_family_member_count.sql` | RPC `current_user_family_member_count()` |
| `lib/cashflow/share.ts` | Parse/build param URL, calcolo quota, transform movimenti |
| `lib/cashflow/share.test.ts` | Unit test parsing e calcolo |
| `lib/families/queries.ts` | `getFamilyMemberCount()` |
| `lib/cashflow/queries.ts` | Share in list/summary/year |
| `components/cashflow/view-filter.tsx` | Segment + checkbox quota |
| `components/cashflow/date-range-filter.tsx` | Preserva `share` in navigazione periodo |
| `components/cashflow/year-summary-bar.tsx` | Preserva `share` in navigazione anno/mesi |
| `app/(protected)/cashflow/page.tsx` | Parse `share`, fetch memberCount, wire queries |
| `components/cashflow/movements-manager.tsx` | Props `share`, `memberCount` |
| `docs/MANUAL_TEST.md` | Checklist quota famiglia |

---

### Task 1: Migration — conteggio membri famiglia

**Files:**
- Create: `supabase/migrations/20250605163000_family_member_count.sql`

- [ ] **Step 1: Creare migration**

Create `supabase/migrations/20250605163000_family_member_count.sql`:

```sql
-- Conteggio membri famiglia per quota cashflow (RLS espone solo la propria riga).

create or replace function public.current_user_family_member_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.family_members
  where family_id = (
    select family_id
    from public.family_members
    where user_id = auth.uid()
    limit 1
  );
$$;

revoke all on function public.current_user_family_member_count() from public;
grant execute on function public.current_user_family_member_count() to authenticated;
```

- [ ] **Step 2: Applicare migration in locale**

Run: `npx supabase db push` (o `supabase migration up` se stack locale attivo)

Expected: migration applicata senza errori.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20250605163000_family_member_count.sql
git commit -m "feat(db): add current_user_family_member_count RPC"
```

---

### Task 2: Logica quota (TDD)

**Files:**
- Create: `lib/cashflow/share.ts`
- Create: `lib/cashflow/share.test.ts`

- [ ] **Step 1: Scrivere i test (falliscono — modulo assente)**

Create `lib/cashflow/share.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Movement } from "@/lib/cashflow/types";
import {
  applyShareToMovements,
  buildShareSearchParams,
  getEffectiveAmount,
  isShareActive,
  parseShareParam,
  roundMoney,
} from "@/lib/cashflow/share";

const familyMovement = (amount: number): Pick<Movement, "amount" | "scope"> => ({
  amount,
  scope: "family",
});

const personalMovement = (amount: number): Pick<Movement, "amount" | "scope"> => ({
  amount,
  scope: "personal",
});

describe("parseShareParam", () => {
  it("defaults to false", () => {
    expect(parseShareParam(undefined)).toBe(false);
    expect(parseShareParam("0")).toBe(false);
    expect(parseShareParam("true")).toBe(false);
  });

  it("parses share=1", () => {
    expect(parseShareParam("1")).toBe(true);
  });
});

describe("buildShareSearchParams", () => {
  it("sets share=1 when enabled", () => {
    const params = buildShareSearchParams(new URLSearchParams(), true);
    expect(params.get("share")).toBe("1");
  });

  it("removes share when disabled", () => {
    const params = buildShareSearchParams(new URLSearchParams("share=1"), false);
    expect(params.has("share")).toBe(false);
  });
});

describe("isShareActive", () => {
  it("is inactive for mine view", () => {
    expect(isShareActive("mine", true)).toBe(false);
  });

  it("is inactive when share off", () => {
    expect(isShareActive("all", false)).toBe(false);
    expect(isShareActive("family", false)).toBe(false);
  });

  it("is active for all/family with share on", () => {
    expect(isShareActive("all", true)).toBe(true);
    expect(isShareActive("family", true)).toBe(true);
  });
});

describe("roundMoney", () => {
  it("rounds to two decimals", () => {
    expect(roundMoney(10 / 3)).toBe(3.33);
    expect(roundMoney(100 / 3)).toBe(33.33);
  });
});

describe("getEffectiveAmount", () => {
  const opts = { shareEnabled: true, memberCount: 3, view: "family" as const };

  it("returns full amount when share inactive", () => {
    expect(
      getEffectiveAmount(familyMovement(90), { ...opts, shareEnabled: false }),
    ).toBe(90);
  });

  it("returns full amount for personal scope", () => {
    expect(getEffectiveAmount(personalMovement(50), opts)).toBe(50);
  });

  it("divides family amount by member count", () => {
    expect(getEffectiveAmount(familyMovement(100), opts)).toBe(33.33);
  });

  it("does not divide when memberCount is zero", () => {
    expect(
      getEffectiveAmount(familyMovement(100), { ...opts, memberCount: 0 }),
    ).toBe(100);
  });

  it("ignores share on mine view", () => {
    expect(
      getEffectiveAmount(familyMovement(100), { ...opts, view: "mine" }),
    ).toBe(100);
  });
});

describe("applyShareToMovements", () => {
  it("transforms only family rows when share active", () => {
    const movements: Movement[] = [
      {
        id: "1",
        type: "expense",
        amount: 90,
        occurred_on: "2026-06-01",
        description: "",
        created_at: "2026-06-01T00:00:00Z",
        category_id: null,
        category_name: null,
        scope: "family",
        family_id: "f1",
        user_id: "u1",
        author_name: null,
      },
      {
        id: "2",
        type: "expense",
        amount: 20,
        occurred_on: "2026-06-01",
        description: "",
        created_at: "2026-06-01T00:00:00Z",
        category_id: null,
        category_name: null,
        scope: "personal",
        family_id: null,
        user_id: "u1",
        author_name: null,
      },
    ];

    const result = applyShareToMovements(movements, {
      shareEnabled: true,
      memberCount: 3,
      view: "all",
    });

    expect(result[0].amount).toBe(30);
    expect(result[1].amount).toBe(20);
  });
});
```

- [ ] **Step 2: Eseguire test — devono fallire**

Run: `npm test -- lib/cashflow/share.test.ts`

Expected: FAIL (modulo `@/lib/cashflow/share` non trovato)

- [ ] **Step 3: Implementare `lib/cashflow/share.ts`**

Create `lib/cashflow/share.ts`:

```ts
import type { CashflowView } from "@/lib/cashflow/view";
import type { Movement } from "@/lib/cashflow/types";

export type FamilyShareOptions = {
  shareEnabled: boolean;
  memberCount: number;
  view: CashflowView;
};

export function parseShareParam(value: string | undefined): boolean {
  return value === "1";
}

export function buildShareSearchParams(
  params: URLSearchParams,
  shareEnabled: boolean,
): URLSearchParams {
  const next = new URLSearchParams(params);
  if (shareEnabled) {
    next.set("share", "1");
  } else {
    next.delete("share");
  }
  return next;
}

export function isShareActive(
  view: CashflowView,
  shareEnabled: boolean,
): boolean {
  return shareEnabled && view !== "mine";
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function getEffectiveAmount(
  movement: Pick<Movement, "amount" | "scope">,
  options: FamilyShareOptions,
): number {
  if (!isShareActive(options.view, options.shareEnabled)) {
    return movement.amount;
  }

  if (movement.scope !== "family") {
    return movement.amount;
  }

  if (options.memberCount <= 0) {
    return movement.amount;
  }

  return roundMoney(movement.amount / options.memberCount);
}

export function applyShareToMovements(
  movements: Movement[],
  options: FamilyShareOptions,
): Movement[] {
  if (!isShareActive(options.view, options.shareEnabled)) {
    return movements;
  }

  return movements.map((movement) => ({
    ...movement,
    amount: getEffectiveAmount(movement, options),
  }));
}
```

- [ ] **Step 4: Eseguire test — devono passare**

Run: `npm test -- lib/cashflow/share.test.ts`

Expected: PASS (tutti i test)

- [ ] **Step 5: Commit**

```bash
git add lib/cashflow/share.ts lib/cashflow/share.test.ts
git commit -m "feat: add family share quota calculation helpers"
```

---

### Task 3: Query conteggio membri

**Files:**
- Modify: `lib/families/queries.ts`

- [ ] **Step 1: Aggiungere `getFamilyMemberCount`**

Append to `lib/families/queries.ts`:

```ts
export async function getFamilyMemberCount(): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("current_user_family_member_count");

  if (error) {
    throw new Error(error.message);
  }

  return typeof data === "number" ? data : 0;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/families/queries.ts
git commit -m "feat: add getFamilyMemberCount query"
```

---

### Task 4: Integrare share nelle query cashflow

**Files:**
- Modify: `lib/cashflow/queries.ts`

- [ ] **Step 1: Import e tipo opzioni default**

At top of `lib/cashflow/queries.ts`, add imports:

```ts
import {
  applyShareToMovements,
  getEffectiveAmount,
  type FamilyShareOptions,
} from "@/lib/cashflow/share";
```

Add helper after `applyViewFilter`:

```ts
const DEFAULT_SHARE_OPTIONS: FamilyShareOptions = {
  shareEnabled: false,
  memberCount: 0,
  view: "all",
};

function resolveShareOptions(
  view: CashflowView,
  shareOptions?: Partial<FamilyShareOptions>,
): FamilyShareOptions {
  return {
    ...DEFAULT_SHARE_OPTIONS,
    view,
    ...shareOptions,
  };
}
```

- [ ] **Step 2: Aggiornare `listMovementsForRange`**

Change signature and return:

```ts
export async function listMovementsForRange(
  from: string,
  to: string,
  view: CashflowView = "all",
  shareOptions?: Partial<FamilyShareOptions>,
): Promise<Movement[]> {
  const options = resolveShareOptions(view, shareOptions);
  // ... existing query unchanged until return ...
  const movements = rows.map((row) => mapMovement(row, authorNames));
  return applyShareToMovements(movements, options);
}
```

- [ ] **Step 3: Aggiornare `getRangeSummary`**

```ts
export async function getRangeSummary(
  from: string,
  to: string,
  view: CashflowView = "all",
  shareOptions?: Partial<FamilyShareOptions>,
): Promise<MonthSummary> {
  const movements = await listMovementsForRange(from, to, view, shareOptions);
  // ... rest unchanged (sums already use effective amounts) ...
}
```

- [ ] **Step 4: Aggiornare `getYearMonthlySummaries`**

Change select to include `scope`:

```ts
.select("type, amount, occurred_on, scope")
```

Add `shareOptions` param and apply in loop:

```ts
export async function getYearMonthlySummaries(
  year: number,
  view: CashflowView = "all",
  shareOptions?: Partial<FamilyShareOptions>,
): Promise<YearSummary> {
  const options = resolveShareOptions(view, shareOptions);
  // ... existing query with scope in select ...

  for (const row of data ?? []) {
    const month = Number(String(row.occurred_on).slice(5, 7));
    const entry = months[month - 1];
    const amount = getEffectiveAmount(
      { amount: Number(row.amount), scope: row.scope as Movement["scope"] },
      options,
    );

    if (row.type === "income") {
      entry.totalIncome += amount;
    } else {
      entry.totalExpense += amount;
    }
    entry.net = entry.totalIncome - entry.totalExpense;
  }
  // ... rest unchanged ...
}
```

- [ ] **Step 5: Verificare build**

Run: `npm run build`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add lib/cashflow/queries.ts
git commit -m "feat: apply family share quota in cashflow queries"
```

---

### Task 5: Page server — parse share e wire dati

**Files:**
- Modify: `app/(protected)/cashflow/page.tsx`

- [ ] **Step 1: Estendere searchParams e fetch**

```ts
import { parseShareParam } from "@/lib/cashflow/share";
import { getFamilyMemberCount } from "@/lib/families/queries";

type PageProps = {
  searchParams: Promise<{
    from?: string;
    to?: string;
    year?: string;
    view?: string;
    share?: string;
  }>;
};

// inside component:
const share = parseShareParam(params.share);
const family = await getCurrentUserFamily();
const memberCount = family ? await getFamilyMemberCount() : 0;
const shareOptions = { shareEnabled: share, memberCount, view };

const [movements, summary, yearSummary, categories] = await Promise.all([
  listMovementsForRange(from, to, view, shareOptions),
  getRangeSummary(from, to, view, shareOptions),
  getYearMonthlySummaries(year, view, shareOptions),
  listCategoryOptions(),
]);

// MovementsManager props:
<MovementsManager
  // ...existing...
  share={share}
  memberCount={memberCount}
/>
```

- [ ] **Step 2: Commit**

```bash
git add app/(protected)/cashflow/page.tsx
git commit -m "feat: wire family share quota on cashflow page"
```

---

### Task 6: UI toggle e propagazione URL

**Files:**
- Modify: `components/cashflow/view-filter.tsx`
- Modify: `components/cashflow/movements-manager.tsx`
- Modify: `components/cashflow/date-range-filter.tsx`
- Modify: `components/cashflow/year-summary-bar.tsx`

- [ ] **Step 1: Estendere `ViewFilter` con checkbox quota**

Replace `components/cashflow/view-filter.tsx` content:

```tsx
"use client";

import type { CashflowView } from "@/lib/cashflow/view";
import { buildCashflowViewSearchParams } from "@/lib/cashflow/view";
import { buildCashflowSearchParams } from "@/lib/cashflow/date-range";
import { buildShareSearchParams } from "@/lib/cashflow/share";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

const VIEW_OPTIONS: Array<{ value: CashflowView; label: string }> = [
  { value: "all", label: "Tutti" },
  { value: "family", label: "Famiglia" },
  { value: "mine", label: "Solo miei" },
];

type ViewFilterProps = {
  view: CashflowView;
  share: boolean;
  memberCount: number;
  from: string;
  to: string;
  year: number;
  hasFamily: boolean;
};

export function ViewFilter({
  view,
  share,
  memberCount,
  from,
  to,
  year,
  hasFamily,
}: ViewFilterProps) {
  const router = useRouter();

  if (!hasFamily) {
    return null;
  }

  function buildNavigationParams(nextView: CashflowView, nextShare: boolean) {
    return buildShareSearchParams(
      buildCashflowViewSearchParams(
        new URLSearchParams(buildCashflowSearchParams({ from, to, year })),
        nextView,
      ),
      nextShare,
    );
  }

  function handleViewChange(nextView: CashflowView) {
    if (nextView === view) {
      return;
    }
    router.push(`/cashflow?${buildNavigationParams(nextView, share).toString()}`);
  }

  function handleShareChange(nextShare: boolean) {
    if (nextShare === share) {
      return;
    }
    router.push(`/cashflow?${buildNavigationParams(view, nextShare).toString()}`);
  }

  const showShareToggle = view === "all" || view === "family";

  return (
    <div className="space-y-3">
      <div
        role="radiogroup"
        aria-label="Vista movimenti"
        data-slot="button-group"
        className="inline-flex w-full rounded-lg border bg-muted/30 p-0.5"
      >
        {VIEW_OPTIONS.map((option) => {
          const selected = view === option.value;

          return (
            <Button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              variant={selected ? "default" : "ghost"}
              size="sm"
              className={cn(
                "h-8 flex-1 rounded-md shadow-none",
                !selected && "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => handleViewChange(option.value)}
            >
              {option.label}
            </Button>
          );
        })}
      </div>

      {showShareToggle ? (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Checkbox
              id="family-share-quota"
              checked={share}
              onCheckedChange={(checked) => handleShareChange(checked === true)}
            />
            <Label htmlFor="family-share-quota" className="font-normal">
              Considera solo la mia quota
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">
            I movimenti famiglia sono divisi per {memberCount}{" "}
            {memberCount === 1 ? "membro" : "membri"}
          </p>
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Passare props in `MovementsManager`**

In `components/cashflow/movements-manager.tsx`:

Add to props type and destructuring: `share: boolean`, `memberCount: number`.

Update `ViewFilter` usage:

```tsx
<ViewFilter
  view={view}
  share={share}
  memberCount={memberCount}
  from={from}
  to={to}
  year={year}
  hasFamily={hasFamily}
/>
```

Pass `share` to child components:

```tsx
<YearSummaryBar
  yearSummary={yearSummary}
  rangeFrom={from}
  rangeTo={to}
  view={view}
  share={share}
/>

<DateRangeFilter from={from} to={to} year={year} view={view} share={share} />
```

- [ ] **Step 3: Preservare `share` in `DateRangeFilter`**

Add prop `share?: boolean` (default `false`).

Import `buildShareSearchParams`.

Update `navigate`:

```ts
function navigate(nextFrom: string, nextTo: string) {
  const params = buildShareSearchParams(
    buildCashflowViewSearchParams(
      new URLSearchParams(
        buildCashflowSearchParams({ from: nextFrom, to: nextTo, year }),
      ),
      view,
    ),
    share,
  );
  router.push(`/cashflow?${params.toString()}`);
}
```

- [ ] **Step 4: Preservare `share` in `YearSummaryBar`**

Same pattern: add `share?: boolean`, import `buildShareSearchParams`, chain in `navigate`.

- [ ] **Step 5: Verificare build**

Run: `npm run build`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add components/cashflow/view-filter.tsx components/cashflow/movements-manager.tsx components/cashflow/date-range-filter.tsx components/cashflow/year-summary-bar.tsx
git commit -m "feat: add family share quota toggle and URL propagation"
```

---

### Task 7: Documentazione test manuali

**Files:**
- Modify: `docs/MANUAL_TEST.md`

- [ ] **Step 1: Aggiungere sezione checklist**

Append after block «Famiglie e movimenti condivisi»:

```markdown
## Quota famiglia (share)

- [ ] Toggle «Considera solo la mia quota» visibile in Tutti e Famiglia; nascosto in Solo miei
- [ ] Default off: importi e totali invariati rispetto a prima del toggle
- [ ] Toggle on + Famiglia: importo tabella = pieno ÷ N membri; totali periodo e anno coerenti
- [ ] Toggle on + Tutti: movimenti personali pieni, family divisi; totali mix corretti
- [ ] Testo aiuto mostra N membri corretto
- [ ] Cambio periodo (‹ › date picker), anno (‹ › riepilogo), click mese: `share=1` preservato in URL
- [ ] Cambio vista Tutti ↔ Famiglia: stato share preservato
- [ ] Vista Solo miei: nessun effetto quota anche con `share=1` in URL
- [ ] Modifica movimento family: form mostra importo pieno del DB, non la quota
- [ ] Admin aggiunge terzo membro: totali quota ricalcolati con N=3
```

- [ ] **Step 2: Commit**

```bash
git add docs/MANUAL_TEST.md
git commit -m "docs: add manual tests for family share quota"
```

---

### Task 8: Verifica finale

- [ ] **Step 1: Eseguire tutti i test**

Run: `npm test`

Expected: PASS (inclusi `share.test.ts` e `view.test.ts`)

- [ ] **Step 2: Build produzione**

Run: `npm run build`

Expected: PASS

- [ ] **Step 3: Smoke test manuale rapido**

1. Apri `/cashflow` con utente in famiglia (2+ membri)
2. Attiva toggle → URL contiene `share=1`
3. Confronta totali periodo con/senza toggle in vista Famiglia
4. Verifica che modifica movimento mostri importo pieno

---

## Spec coverage (self-review)

| Requisito spec | Task |
|----------------|------|
| R1–R2 Toggle UI | Task 6 |
| R3 URL `share=1` | Task 2, 6 |
| R4 Ignora share su `mine` | Task 2 (`isShareActive`) |
| R5 Navigazione preserva share | Task 6 |
| R6 memberCount attuale | Task 1, 3 |
| R7 Arrotondamento per riga | Task 2 |
| R8 Query list/summary/year | Task 4 |
| R9 DB invariato | Task 4 (transform read-only) |
| R10 Form importo reale | Nessuna modifica dialog (movements server-side transform; edit usa `movement.amount` originale dal click — verificare che `openEditDialog` riceva movement prima del transform) |

**Nota implementativa R10:** `openEditDialog` usa `movement` dalla tabella che ha amount già diviso quando share è on. **Fix richiesto in Task 6:** passare alla tabella anche `rawMovements` o memorizzare amount originale. Soluzione minima: in `page.tsx` passare `movements` (transformed) e `rawMovements` (non transformed) a `MovementsManager`; tabella usa transformed per display; `onEdit` risolve id su `rawMovements`.

Aggiungere a Task 5/6:

**Task 5 Step 1b — raw movements per edit dialog**

In `page.tsx`:

```ts
const [movements, rawMovements, summary, yearSummary, categories] = await Promise.all([
  listMovementsForRange(from, to, view, shareOptions),
  listMovementsForRange(from, to, view, { ...shareOptions, shareEnabled: false }),
  // ...
]);

<MovementsManager rawMovements={rawMovements} movements={movements} ... />
```

In `MovementsManager`, `openEditDialog`:

```ts
function openEditDialog(movement: Movement) {
  const raw = rawMovements.find((m) => m.id === movement.id) ?? movement;
  setEditingMovement(raw);
  setAmount(String(raw.amount));
  // ...
}
```

Pass `rawMovements` prop through `MovementsManager` → used only in edit handler, not in table.

---

## Execution handoff

Plan salvato in `docs/superpowers/plans/2026-06-05-family-share-quota.md`. Due opzioni di esecuzione:

1. **Subagent-Driven (consigliato)** — un subagent per task, review tra un task e l’altro
2. **Inline Execution** — implementazione in questa sessione con checkpoint

Quale preferisci?
