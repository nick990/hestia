# Family personal view — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rivedere il toggle share: UI «Vista personale»; uscite famiglia ÷ N; entrate famiglia proprie intere; entrate famiglia altrui nascoste.

**Architecture:** Logica pura estesa in `lib/cashflow/share.ts` con `currentUserId`, filtro inclusione e calcolo importo per tipo; query server applicano `applyPersonalViewToMovements`; riepilogo annuale allineato con stesse regole su righe aggregate.

**Tech Stack:** Next.js 16, React 19, Vitest, Supabase (solo lettura).

**Spec:** [`docs/superpowers/specs/2026-06-06-family-personal-view-design.md`](../specs/2026-06-06-family-personal-view-design.md)

---

## File map

| File | Responsabilità |
|------|----------------|
| `lib/cashflow/share.ts` | Filtro + importi vista personale |
| `lib/cashflow/share.test.ts` | Unit test regole |
| `lib/cashflow/queries.ts` | Wire `currentUserId`, nuova pipeline |
| `app/(protected)/cashflow/page.tsx` | Passa `currentUserId` in shareOptions |
| `components/cashflow/view-filter.tsx` | Label «Vista personale» + aiuto |
| `docs/MANUAL_TEST.md` | Checklist aggiornata |

---

### Task 1: Logica vista personale (TDD)

**Files:**
- Modify: `lib/cashflow/share.ts`
- Modify: `lib/cashflow/share.test.ts`

- [ ] **Step 1: Aggiornare i test (falliscono)**

In `lib/cashflow/share.test.ts`, aggiungere `currentUserId: "u1"` a tutti gli `opts` esistenti.

Sostituire helper:

```ts
const familyExpense = (
  amount: number,
  userId = "u1",
): Pick<Movement, "amount" | "scope" | "type" | "user_id"> => ({
  amount,
  scope: "family",
  type: "expense",
  user_id: userId,
});

const familyIncome = (
  amount: number,
  userId = "u1",
): Pick<Movement, "amount" | "scope" | "type" | "user_id"> => ({
  amount,
  scope: "family",
  type: "income",
  user_id: userId,
});

const privateMovement = (
  amount: number,
): Pick<Movement, "amount" | "scope" | "type" | "user_id"> => ({
  amount,
  scope: "private",
  type: "expense",
  user_id: "u1",
});
```

Aggiornare test `getEffectiveAmount`:
- `divides family amount` → usa `familyExpense(100)` → 33.33
- Aggiungere: `returns full amount for own family income` → `familyIncome(2000)` → 2000

Aggiungere describe `isIncludedInPersonalView`:

```ts
import {
  applyPersonalViewToMovements,
  isIncludedInPersonalView,
  // ...existing imports; remove applyShareToMovements if renamed
} from "@/lib/cashflow/share";

describe("isIncludedInPersonalView", () => {
  const opts = {
    shareEnabled: true,
    memberCount: 2,
    view: "all" as const,
    currentUserId: "u1",
  };

  it("includes all when share inactive", () => {
    expect(
      isIncludedInPersonalView(familyIncome(100, "u2"), {
        ...opts,
        shareEnabled: false,
      }),
    ).toBe(true);
  });

  it("excludes other members family income", () => {
    expect(isIncludedInPersonalView(familyIncome(100, "u2"), opts)).toBe(false);
  });

  it("includes own family income", () => {
    expect(isIncludedInPersonalView(familyIncome(100, "u1"), opts)).toBe(true);
  });

  it("includes family expenses from anyone", () => {
    expect(isIncludedInPersonalView(familyExpense(100, "u2"), opts)).toBe(true);
  });
});
```

Sostituire describe `applyShareToMovements` con `applyPersonalViewToMovements`:

```ts
describe("applyPersonalViewToMovements", () => {
  const baseMovement = (
    overrides: Partial<Movement>,
  ): Movement => ({
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
    ...overrides,
  });

  it("filters other members income and divides family expenses", () => {
    const movements = [
      baseMovement({ id: "1", type: "expense", amount: 90, scope: "family" }),
      baseMovement({
        id: "2",
        type: "income",
        amount: 2000,
        scope: "family",
        user_id: "u1",
      }),
      baseMovement({
        id: "3",
        type: "income",
        amount: 5000,
        scope: "family",
        user_id: "u2",
      }),
      baseMovement({
        id: "4",
        type: "expense",
        amount: 20,
        scope: "private",
        family_id: null,
      }),
    ];

    const result = applyPersonalViewToMovements(movements, {
      shareEnabled: true,
      memberCount: 3,
      view: "all",
      currentUserId: "u1",
    });

    expect(result).toHaveLength(3);
    expect(result.find((m) => m.id === "3")).toBeUndefined();
    expect(result.find((m) => m.id === "1")?.amount).toBe(30);
    expect(result.find((m) => m.id === "2")?.amount).toBe(2000);
    expect(result.find((m) => m.id === "4")?.amount).toBe(20);
  });

  it("returns movements unchanged when share inactive", () => {
    const movements = [baseMovement({ id: "1" })];
    const result = applyPersonalViewToMovements(movements, {
      shareEnabled: false,
      memberCount: 3,
      view: "all",
      currentUserId: "u1",
    });
    expect(result).toEqual(movements);
  });
});
```

- [ ] **Step 2: Eseguire test — devono fallire**

Run: `npm test -- lib/cashflow/share.test.ts`

Expected: FAIL

- [ ] **Step 3: Implementare `share.ts`**

Replace contents of `lib/cashflow/share.ts`:

```ts
import type { CashflowView } from "@/lib/cashflow/view";
import type { Movement } from "@/lib/cashflow/types";

export type FamilyShareOptions = {
  shareEnabled: boolean;
  memberCount: number;
  view: CashflowView;
  currentUserId: string;
};

type ShareMovement = Pick<
  Movement,
  "amount" | "scope" | "type" | "user_id"
>;

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
  return shareEnabled && view !== "private";
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function isIncludedInPersonalView(
  movement: ShareMovement,
  options: FamilyShareOptions,
): boolean {
  if (!isShareActive(options.view, options.shareEnabled)) {
    return true;
  }

  if (
    movement.scope === "family" &&
    movement.type === "income" &&
    movement.user_id !== options.currentUserId
  ) {
    return false;
  }

  return true;
}

export function getEffectiveAmount(
  movement: ShareMovement,
  options: FamilyShareOptions,
): number {
  if (!isShareActive(options.view, options.shareEnabled)) {
    return movement.amount;
  }

  if (movement.scope !== "family") {
    return movement.amount;
  }

  if (movement.type === "income") {
    return movement.amount;
  }

  if (options.memberCount <= 0) {
    return movement.amount;
  }

  return roundMoney(movement.amount / options.memberCount);
}

export function applyPersonalViewToMovements(
  movements: Movement[],
  options: FamilyShareOptions,
): Movement[] {
  if (!isShareActive(options.view, options.shareEnabled)) {
    return movements;
  }

  return movements
    .filter((movement) => isIncludedInPersonalView(movement, options))
    .map((movement) => ({
      ...movement,
      amount: getEffectiveAmount(movement, options),
    }));
}

/** @deprecated Use applyPersonalViewToMovements */
export function applyShareToMovements(
  movements: Movement[],
  options: FamilyShareOptions,
): Movement[] {
  return applyPersonalViewToMovements(movements, options);
}
```

- [ ] **Step 4: Eseguire test — devono passare**

Run: `npm test -- lib/cashflow/share.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/cashflow/share.ts lib/cashflow/share.test.ts
git commit -m "feat(cashflow): personal view filter and amount rules"
```

---

### Task 2: Query e riepilogo annuale

**Files:**
- Modify: `lib/cashflow/queries.ts`
- Modify: `app/(protected)/cashflow/page.tsx`

- [ ] **Step 1: Aggiornare default share options**

In `lib/cashflow/queries.ts`:

```ts
import {
  applyPersonalViewToMovements,
  getEffectiveAmount,
  isIncludedInPersonalView,
  type FamilyShareOptions,
} from "@/lib/cashflow/share";
```

```ts
const DEFAULT_SHARE_OPTIONS: FamilyShareOptions = {
  shareEnabled: false,
  memberCount: 0,
  view: "all",
  currentUserId: "",
};
```

Replace `applyShareToMovements` call in `listMovementsForRange`:

```ts
  return applyPersonalViewToMovements(movements, options);
```

- [ ] **Step 2: Allineare `getYearMonthlySummaries`**

Estendere select:

```ts
    .select("type, amount, occurred_on, scope, user_id")
```

Nel loop, prima di aggregare:

```ts
    const movement = {
      amount: Number(row.amount),
      scope: row.scope as Movement["scope"],
      type: row.type as Movement["type"],
      user_id: row.user_id,
    };

    if (!isIncludedInPersonalView(movement, options)) {
      continue;
    }

    const amount = getEffectiveAmount(movement, options);
```

- [ ] **Step 3: Passare `currentUserId` dalla page**

In `app/(protected)/cashflow/page.tsx`:

```ts
  const shareOptions = {
    shareEnabled: share,
    memberCount,
    view,
    currentUserId: user.id,
  };
```

- [ ] **Step 4: Verificare build**

Run: `npm run build`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/cashflow/queries.ts app/(protected)/cashflow/page.tsx
git commit -m "feat(cashflow): wire personal view through queries"
```

---

### Task 3: UI label e aiuto

**Files:**
- Modify: `components/cashflow/view-filter.tsx`

- [ ] **Step 1: Aggiornare copy**

Sostituire label e testo aiuto:

```tsx
            <Label htmlFor="family-share-quota" className="font-normal">
              Vista personale
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Uscite famiglia divise per {memberCount}{" "}
            {memberCount === 1 ? "membro" : "membri"}; entrate famiglia solo le
            tue; privati interi.
          </p>
```

- [ ] **Step 2: Commit**

```bash
git add components/cashflow/view-filter.tsx
git commit -m "feat(cashflow): rename share toggle to Vista personale"
```

---

### Task 4: Documentazione e verifica

**Files:**
- Modify: `docs/MANUAL_TEST.md`

- [ ] **Step 1: Aggiornare sezione quota**

Rinominare header in `## Vista personale (share)` e sostituire checklist:

```markdown
- [ ] Toggle «Vista personale» visibile in Tutti e Famiglia; nascosto in Privati
- [ ] Default off: importi e righe invariati rispetto a prima del toggle
- [ ] Toggle on + uscita famiglia 300 €, N=3 → 100 € in tabella e totali
- [ ] Toggle on + entrata famiglia propria → importo intero (non diviso)
- [ ] Toggle on + entrata famiglia altrui → riga assente; totali senza quella entrata
- [ ] Toggle on + privato → importo intero
- [ ] Testo aiuto: uscite divise, entrate solo tue, privati interi
- [ ] Cambio periodo, anno, vista: `share=1` preservato in URL
- [ ] Vista Privati: nessun effetto share anche con `share=1` in URL
- [ ] Modifica movimento family: form mostra importo pieno del DB
- [ ] Riepilogo annuale coerente con tabella periodo (share on)
```

- [ ] **Step 2: Eseguire tutti i test**

Run: `npm test`

Expected: tutti PASS

- [ ] **Step 3: Build**

Run: `npm run build`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add docs/MANUAL_TEST.md
git commit -m "docs: update manual tests for personal view"
```

---

## Spec coverage (self-review)

| Requisito | Task |
|-----------|------|
| R1–R2 UI copy | Task 3 |
| R3–R5 URL / viste | Task 2–3 (invariato + test) |
| R6–R10 Logica | Task 1 |
| R11 Query/totali | Task 2 |
| R12 Dialog | Nessuna modifica |
| R13–R14 Navigazione / memberCount | Invariato |
| Test manuali | Task 4 |
