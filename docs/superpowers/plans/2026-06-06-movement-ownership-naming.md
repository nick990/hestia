# Movement ownership naming — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allineare nomenclatura proprietà movimenti: `personal`/`mine` → `private` in DB, codice e UI; segment Tutti · Privati · Famiglia; toggle dialog «Privato» invertito.

**Architecture:** Big-bang rename in un unico passaggio. Migration Postgres rinomina il valore `scope` e aggiorna constraint + RLS. Codice applicativo: tipi TS, parser URL, query, share logic, server actions e componenti UI aggiornati insieme. Nessun alias legacy per `view=mine`.

**Tech Stack:** Next.js 16, React 19, Supabase (Postgres RLS), Vitest, shadcn Checkbox.

**Spec:** [`docs/superpowers/specs/2026-06-06-movement-ownership-naming-design.md`](../specs/2026-06-06-movement-ownership-naming-design.md)

---

## File map

| File | Responsabilità |
|------|----------------|
| `supabase/migrations/20250606120000_movement_scope_private.sql` | Rinomina scope, constraint, RLS |
| `lib/cashflow/types.ts` | `MovementScope = "private" \| "family"` |
| `lib/cashflow/view.ts` | `CashflowView`, parse/build URL |
| `lib/cashflow/view.test.ts` | Test parsing vista |
| `lib/cashflow/share.ts` | `view !== "private"`, scope private |
| `lib/cashflow/share.test.ts` | Test quota con nuovi nomi |
| `lib/cashflow/queries.ts` | Filtro vista `private` |
| `app/actions/movements.ts` | `isPrivate` payload, `resolveMovementScope` |
| `components/cashflow/view-filter.tsx` | Segment Tutti · Privati · Famiglia |
| `components/cashflow/movements-manager.tsx` | State `isPrivate`, checkbox «Privato» |
| `components/cashflow/movements-table.tsx` | `showPrivateBadge` |
| `components/cashflow/movements-table-columns.tsx` | Badge «Privato» |
| `docs/MANUAL_TEST.md` | Checklist aggiornata |

---

### Task 1: Migration — scope `private`

**Files:**
- Create: `supabase/migrations/20250606120000_movement_scope_private.sql`

- [ ] **Step 1: Creare migration**

Create `supabase/migrations/20250606120000_movement_scope_private.sql`:

```sql
-- Rinomina scope personal → private e aggiorna RLS.

UPDATE public.movements SET scope = 'private' WHERE scope = 'personal';

ALTER TABLE public.movements DROP CONSTRAINT movements_scope_check;
ALTER TABLE public.movements ADD CONSTRAINT movements_scope_check
  CHECK (scope IN ('private', 'family'));

ALTER TABLE public.movements DROP CONSTRAINT movements_scope_family_consistency;
ALTER TABLE public.movements ADD CONSTRAINT movements_scope_family_consistency
  CHECK (
    (scope = 'private' AND family_id IS NULL)
    OR (scope = 'family' AND family_id IS NOT NULL)
  );

ALTER TABLE public.movements ALTER COLUMN scope SET DEFAULT 'private';

DROP POLICY IF EXISTS "movements_select" ON public.movements;
DROP POLICY IF EXISTS "movements_insert" ON public.movements;
DROP POLICY IF EXISTS "movements_update" ON public.movements;
DROP POLICY IF EXISTS "movements_delete" ON public.movements;

CREATE POLICY "movements_select"
  ON public.movements FOR SELECT TO authenticated
  USING (
    (scope = 'private' AND user_id = auth.uid())
    OR (scope = 'family' AND family_id = public.current_user_family_id())
  );

CREATE POLICY "movements_insert"
  ON public.movements FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      (scope = 'private' AND family_id IS NULL)
      OR (scope = 'family' AND family_id = public.current_user_family_id())
    )
  );

CREATE POLICY "movements_update"
  ON public.movements FOR UPDATE TO authenticated
  USING (
    (scope = 'private' AND user_id = auth.uid())
    OR (scope = 'family' AND family_id = public.current_user_family_id())
  )
  WITH CHECK (
    (scope = 'private' AND user_id = auth.uid() AND family_id IS NULL)
    OR (scope = 'family' AND family_id = public.current_user_family_id())
  );

CREATE POLICY "movements_delete"
  ON public.movements FOR DELETE TO authenticated
  USING (
    (scope = 'private' AND user_id = auth.uid())
    OR (scope = 'family' AND family_id = public.current_user_family_id())
  );
```

- [ ] **Step 2: Applicare migration in locale**

Run: `npx supabase db push`

Expected: migration applicata senza errori.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20250606120000_movement_scope_private.sql
git commit -m "feat(db): rename movement scope personal to private"
```

---

### Task 2: Tipi e parsing vista (TDD)

**Files:**
- Modify: `lib/cashflow/types.ts`
- Modify: `lib/cashflow/view.ts`
- Modify: `lib/cashflow/view.test.ts`

- [ ] **Step 1: Aggiornare i test (falliscono)**

Replace `lib/cashflow/view.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseCashflowViewParam } from "@/lib/cashflow/view";

describe("parseCashflowViewParam", () => {
  it("defaults to all", () => {
    expect(parseCashflowViewParam(undefined)).toBe("all");
    expect(parseCashflowViewParam("invalid")).toBe("all");
    expect(parseCashflowViewParam("mine")).toBe("all");
  });

  it("parses valid views", () => {
    expect(parseCashflowViewParam("all")).toBe("all");
    expect(parseCashflowViewParam("family")).toBe("family");
    expect(parseCashflowViewParam("private")).toBe("private");
  });
});
```

- [ ] **Step 2: Eseguire test — devono fallire**

Run: `npm test -- lib/cashflow/view.test.ts`

Expected: FAIL (`mine` ancora valido o `private` non riconosciuto)

- [ ] **Step 3: Implementare**

In `lib/cashflow/types.ts`:

```ts
export type MovementScope = "private" | "family";
```

In `lib/cashflow/view.ts`:

```ts
export type CashflowView = "all" | "private" | "family";

const VALID_VIEWS: CashflowView[] = ["all", "private", "family"];

export function parseCashflowViewParam(value: string | undefined): CashflowView {
  if (value && VALID_VIEWS.includes(value as CashflowView)) {
    return value as CashflowView;
  }
  return "all";
}

export function buildCashflowViewSearchParams(
  params: URLSearchParams,
  view: CashflowView,
): URLSearchParams {
  const next = new URLSearchParams(params);
  if (view === "all") {
    next.delete("view");
  } else {
    next.set("view", view);
  }
  return next;
}
```

- [ ] **Step 4: Eseguire test — devono passare**

Run: `npm test -- lib/cashflow/view.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/cashflow/types.ts lib/cashflow/view.ts lib/cashflow/view.test.ts
git commit -m "refactor(cashflow): rename view mine to private"
```

---

### Task 3: Logica quota (TDD)

**Files:**
- Modify: `lib/cashflow/share.ts`
- Modify: `lib/cashflow/share.test.ts`

- [ ] **Step 1: Aggiornare i test**

In `lib/cashflow/share.test.ts`, sostituire tutte le occorrenze:

- `personalMovement` → `privateMovement` con `scope: "private"`
- `"mine"` → `"private"` nei test `isShareActive` e `getEffectiveAmount`
- `"returns full amount for personal scope"` → `"returns full amount for private scope"`
- `"is inactive for mine view"` → `"is inactive for private view"`
- `"ignores share on mine view"` → `"ignores share on private view"`
- `scope: "personal"` nel fixture `applyShareToMovements` → `scope: "private"`

Test aggiornato per `isShareActive`:

```ts
describe("isShareActive", () => {
  it("is inactive for private view", () => {
    expect(isShareActive("private", true)).toBe(false);
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
```

- [ ] **Step 2: Eseguire test — devono fallire**

Run: `npm test -- lib/cashflow/share.test.ts`

Expected: FAIL

- [ ] **Step 3: Implementare**

In `lib/cashflow/share.ts`, riga 31:

```ts
return shareEnabled && view !== "private";
```

- [ ] **Step 4: Eseguire test — devono passare**

Run: `npm test -- lib/cashflow/share.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/cashflow/share.ts lib/cashflow/share.test.ts
git commit -m "refactor(cashflow): use private view in share logic"
```

---

### Task 4: Query movimenti

**Files:**
- Modify: `lib/cashflow/queries.ts`

- [ ] **Step 1: Aggiornare filtro vista**

In `applyViewFilter`, sostituire:

```ts
  if (view === "mine") {
    return query.eq("scope", "personal");
  }
```

con:

```ts
  if (view === "private") {
    return query.eq("scope", "private");
  }
```

- [ ] **Step 2: Verificare build**

Run: `npm run build`

Expected: errori TypeScript su componenti non ancora aggiornati — risolti nei task UI.

- [ ] **Step 3: Commit**

```bash
git add lib/cashflow/queries.ts
git commit -m "refactor(cashflow): filter private scope in queries"
```

---

### Task 5: Server actions — `isPrivate`

**Files:**
- Modify: `app/actions/movements.ts`

- [ ] **Step 1: Sostituire `resolveMovementScope`**

```ts
async function resolveMovementScope(
  isPrivate: boolean | undefined,
): Promise<ActionResult | { scope: MovementScope; family_id: string | null }> {
  if (isPrivate) {
    return { scope: "private", family_id: null };
  }

  const membership = await getCurrentUserFamily();

  if (!membership) {
    return { scope: "private", family_id: null };
  }

  return { scope: "family", family_id: membership.family_id };
}
```

- [ ] **Step 2: Aggiornare payload create/update**

In `createMovement` e `updateMovement`:

- Sostituire `sharedWithFamily?: boolean` con `isPrivate?: boolean`
- Sostituire `resolveMovementScope(input.sharedWithFamily)` con `resolveMovementScope(input.isPrivate)`

- [ ] **Step 3: Verificare build**

Run: `npm run build`

Expected: errori su `movements-manager.tsx` finché non aggiornato in Task 7.

- [ ] **Step 4: Commit**

```bash
git add app/actions/movements.ts
git commit -m "refactor(cashflow): use isPrivate in movement actions"
```

---

### Task 6: Segment control vista

**Files:**
- Modify: `components/cashflow/view-filter.tsx`

- [ ] **Step 1: Riordinare e rinominare opzioni**

Sostituire `VIEW_OPTIONS`:

```ts
const VIEW_OPTIONS: Array<{ value: CashflowView; label: string }> = [
  { value: "all", label: "Tutti" },
  { value: "private", label: "Privati" },
  { value: "family", label: "Famiglia" },
];
```

Nessun altro cambiamento necessario: `showShareToggle` resta `view === "all" || view === "family"`.

- [ ] **Step 2: Commit**

```bash
git add components/cashflow/view-filter.tsx
git commit -m "refactor(cashflow): reorder view segment to Tutti/Privati/Famiglia"
```

---

### Task 7: Dialog movimento — toggle «Privato»

**Files:**
- Modify: `components/cashflow/movements-manager.tsx`

- [ ] **Step 1: Sostituire state e payload**

Sostituire `sharedWithFamily` / `setSharedWithFamily` con `isPrivate` / `setIsPrivate`.

State iniziale:

```ts
const [isPrivate, setIsPrivate] = useState(false);
```

In `resetFormForCreate`:

```ts
setIsPrivate(false);
```

In `openEditDialog`:

```ts
setIsPrivate(raw.scope === "private");
```

In `handleSubmit` payload:

```ts
isPrivate: hasFamily ? isPrivate : true,
```

- [ ] **Step 2: Sostituire checkbox nel form**

Sostituire il blocco `{hasFamily ? (... sharedWithFamily ...) : null}` con:

```tsx
{hasFamily ? (
  <div className="flex items-center gap-2">
    <Checkbox
      id="movement-private"
      checked={isPrivate}
      onCheckedChange={(checked) => setIsPrivate(checked === true)}
    />
    <Label htmlFor="movement-private" className="font-normal">
      Privato
    </Label>
  </div>
) : null}
```

- [ ] **Step 3: Commit**

```bash
git add components/cashflow/movements-manager.tsx
git commit -m "refactor(cashflow): invert dialog toggle to Privato"
```

---

### Task 8: Badge tabella

**Files:**
- Modify: `components/cashflow/movements-table.tsx`
- Modify: `components/cashflow/movements-table-columns.tsx`

- [ ] **Step 1: Rinominare prop in movements-table.tsx**

```ts
const showPrivateBadge = view === "all";
```

Passare `showPrivateBadge` a `createMovementColumns`.

- [ ] **Step 2: Aggiornare movements-table-columns.tsx**

In `MovementColumnActions`:

```ts
showPrivateBadge: boolean;
```

Nel cell della descrizione:

```tsx
{showPrivateBadge && row.original.scope === "private" ? (
  <Badge variant="secondary" className="ml-2 align-middle">
    Privato
  </Badge>
) : null}
```

- [ ] **Step 3: Commit**

```bash
git add components/cashflow/movements-table.tsx components/cashflow/movements-table-columns.tsx
git commit -m "refactor(cashflow): rename Personale badge to Privato"
```

---

### Task 9: Documentazione test manuali

**Files:**
- Modify: `docs/MANUAL_TEST.md`

- [ ] **Step 1: Aggiornare sezione Famiglie**

Sostituire in tutta la sezione «Famiglie e movimenti condivisi» e «Quota famiglia»:

| Prima | Dopo |
|-------|------|
| movimento personale (toggle off) | movimento privato (checkbox «Privato» attiva) |
| Solo miei | Privati |
| movimenti personali | movimenti privati |
| personali pieni | privati pieni |
| solo personali | solo privati |

Checklist aggiornata (estratto):

```markdown
- [ ] Utente A: movimento default condiviso → visibile a B in Tutti e Famiglia.
- [ ] Utente A: movimento privato (checkbox «Privato» attiva) → visibile ad A in Tutti e Privati; B non lo vede.
- [ ] Vista Privati: solo movimenti privati propri; nessun family.
- [ ] Totali periodo cambiano tra Tutti / Privati / Famiglia.
- [ ] Segment control: ordine Tutti · Privati · Famiglia.
- [ ] Toggle «Considera solo la mia quota» visibile in Tutti e Famiglia; nascosto in Privati.
- [ ] Toggle on + Tutti: movimenti privati pieni, family divisi; totali mix corretti.
- [ ] Vista Privati: nessun effetto quota anche con `share=1` in URL.
- [ ] URL `?view=mine` → vista Tutti (default).
- [ ] URL `?view=private` → vista Privati.
```

- [ ] **Step 2: Commit**

```bash
git add docs/MANUAL_TEST.md
git commit -m "docs: update manual tests for private movement naming"
```

---

### Task 10: Verifica finale

**Files:** (nessuno — solo comandi)

- [ ] **Step 1: Eseguire tutti i test**

Run: `npm test`

Expected: tutti PASS

- [ ] **Step 2: Build produzione**

Run: `npm run build`

Expected: build OK senza errori TypeScript

- [ ] **Step 3: Grep residui (opzionale sanity check)**

Run: `rg '"mine"|"personal"|sharedWithFamily|showPersonalBadge|Solo miei|Personale' --glob '*.{ts,tsx}'`

Expected: nessun match nei file applicativi (migration storiche escluse)

---

## Spec coverage (self-review)

| Requisito | Task |
|-----------|------|
| R1 MovementScope private | Task 2 |
| R2 CashflowView private | Task 2 |
| R3 URL mine → all | Task 2 |
| R4 Segment ordine | Task 6 |
| R5–R7 Filtri vista | Task 4 |
| R8 Badge Privato | Task 8 |
| R9–R10 Toggle dialog | Task 7 |
| R11–R12 Quota | Task 3 |
| R13 RLS | Task 1 |
| R14 Senza famiglia | Task 7 (isPrivate: true) |
| Test manuali | Task 9 |
