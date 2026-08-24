# Movement assignee — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sostituire scope/family_id con assegnatario (famiglia | membro) + privato; filtri Entrate/Uscite indipendenti; colonne Inserito da / Assegnatario.

**Architecture:** Migration Postgres rinomina `user_id`→`created_by`, aggiunge `assignee_kind`/`assignee_user_id`/`is_private`, aggiorna RLS. Logica filtri pura in `lib/cashflow/assignee-filters.ts` (localStorage client + apply server-side). Query caricano movimenti nel range via RLS; filtri assignee applicati in pipeline condivisa. UI: nuovo pannello filtri, form con toggle famiglia + select assegnatario.

**Tech Stack:** Next.js 16, React 19, Supabase Postgres RLS, Vitest, shadcn/ui.

**Spec:** [`docs/superpowers/specs/2026-08-24-movement-assignee-design.md`](../specs/2026-08-24-movement-assignee-design.md)

---

## File map

| File | Azione |
|------|--------|
| `supabase/migrations/20250824120000_movement_assignee.sql` | Create — schema + RLS |
| `lib/cashflow/types.ts` | Modify — nuovi tipi movimento |
| `lib/cashflow/assignee-filters.ts` | Create — filtri + localStorage |
| `lib/cashflow/assignee-filters.test.ts` | Create — unit test |
| `lib/families/queries.ts` | Modify — `listFamilyMembersForViewer()` |
| `lib/families/types.ts` | Modify — `FamilyMemberOption` |
| `lib/cashflow/queries.ts` | Modify — drop view/share; nuove colonne |
| `app/actions/movements.ts` | Modify — payload assignee |
| `components/cashflow/assignee-filter-panel.tsx` | Create — UI filtri |
| `components/cashflow/movement-form-dialog.tsx` | Modify — form assignee |
| `components/cashflow/movements-table-columns.tsx` | Modify — colonne |
| `components/cashflow/movements-table.tsx` | Modify — props colonne |
| `components/cashflow/movements-manager.tsx` | Modify — integrazione filtri |
| `components/cashflow/date-range-filter.tsx` | Modify — rimuovi view/share |
| `app/(protected)/cashflow/page.tsx` | Modify — family members, no view |
| `app/(protected)/page.tsx` | Modify — mobile home wiring |
| `components/home/mobile-home.tsx` | Modify — filtri localStorage |
| `lib/cashflow/view.ts` | Delete |
| `lib/cashflow/share.ts` | Delete |
| `lib/cashflow/view.test.ts` | Delete |
| `lib/cashflow/share.test.ts` | Delete |
| `components/cashflow/view-filter.tsx` | Delete |
| `lib/cashflow/movement-visibility.ts` | Modify o delete — sostituire con regole assignee |
| `lib/cashflow/sankey.test.ts` | Modify — nuovi campi Movement |
| `docs/MANUAL_TEST.md` | Modify — checklist |

---

### Task 1: Migration database

**Files:**
- Create: `supabase/migrations/20250824120000_movement_assignee.sql`

- [ ] **Step 1: Scrivere migration**

```sql
-- 1. Rinomina user_id → created_by
ALTER TABLE public.movements RENAME COLUMN user_id TO created_by;

-- 2. Nuove colonne (nullable temporaneamente per backfill)
ALTER TABLE public.movements
  ADD COLUMN assignee_kind text,
  ADD COLUMN assignee_user_id uuid REFERENCES auth.users (id) ON DELETE RESTRICT,
  ADD COLUMN is_private boolean NOT NULL DEFAULT false;

-- 3. Backfill da scope/family_id
UPDATE public.movements SET
  assignee_kind = 'family',
  assignee_user_id = NULL,
  is_private = false
WHERE scope = 'family';

UPDATE public.movements SET
  assignee_kind = 'member',
  assignee_user_id = created_by,
  is_private = true
WHERE scope = 'private';

-- 4. NOT NULL + vincoli
ALTER TABLE public.movements ALTER COLUMN assignee_kind SET NOT NULL;

ALTER TABLE public.movements DROP CONSTRAINT IF EXISTS movements_scope_check;
ALTER TABLE public.movements DROP CONSTRAINT IF EXISTS movements_scope_family_consistency;
ALTER TABLE public.movements DROP COLUMN scope;
ALTER TABLE public.movements DROP COLUMN family_id;

ALTER TABLE public.movements ADD CONSTRAINT movements_assignee_kind_check
  CHECK (assignee_kind IN ('family', 'member'));

ALTER TABLE public.movements ADD CONSTRAINT movements_assignee_consistency CHECK (
  (assignee_kind = 'family' AND assignee_user_id IS NULL AND is_private = false)
  OR (assignee_kind = 'member' AND assignee_user_id IS NOT NULL)
);

ALTER TABLE public.movements ADD CONSTRAINT movements_private_member CHECK (
  is_private = false OR assignee_kind = 'member'
);

-- 5. Indici
DROP INDEX IF EXISTS movements_family_occurred_idx;
CREATE INDEX movements_assignee_family_occurred_idx
  ON public.movements (occurred_on DESC) WHERE assignee_kind = 'family';
CREATE INDEX movements_assignee_member_occurred_idx
  ON public.movements (assignee_user_id, occurred_on DESC) WHERE assignee_kind = 'member';

-- 6. Helper users_share_family
CREATE OR REPLACE FUNCTION public.users_share_family(a uuid, b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_members fm1
    JOIN public.family_members fm2 ON fm1.family_id = fm2.family_id
    WHERE fm1.user_id = a AND fm2.user_id = b
  );
$$;
REVOKE ALL ON FUNCTION public.users_share_family(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.users_share_family(uuid, uuid) TO authenticated;

-- 7. RLS policies (drop old, create new)
-- SELECT: family in same family OR member non-private same family OR member private self
-- INSERT/UPDATE/DELETE: per spec sezione RLS
```

Implementare policy complete come in spec § RLS.

- [ ] **Step 2: Applicare migration**

Run: `npx supabase db push` oppure MCP `apply_migration`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20250824120000_movement_assignee.sql
git commit -m "db: movement assignee model replaces scope/family_id"
```

---

### Task 2: Tipi TypeScript

**Files:**
- Modify: `lib/cashflow/types.ts`

- [ ] **Step 1: Aggiornare tipi**

```typescript
export type AssigneeKind = "family" | "member";

export type Movement = {
  // ...existing fields...
  created_by: string;
  assignee_kind: AssigneeKind;
  assignee_user_id: string | null;
  is_private: boolean;
  creator_name: string | null;
  assignee_name: string | null;
  // REMOVE: scope, family_id, user_id, author_name
};
```

- [ ] **Step 2: Commit**

```bash
git add lib/cashflow/types.ts
git commit -m "types: movement assignee fields"
```

---

### Task 3: Logica filtri assignee (TDD)

**Files:**
- Create: `lib/cashflow/assignee-filters.ts`
- Create: `lib/cashflow/assignee-filters.test.ts`

- [ ] **Step 1: Scrivere test che falliscono**

Coprire:
- `createDefaultFilters(members, currentUserId)` → tutti ON, showPrivate true
- `movementMatchesTypeFilter(income movement, income filters)` — family ON/OFF
- `movementMatchesTypeFilter` — member checkbox ON/OFF
- private movement — visibile solo con self ON + showPrivate ON
- zero filtri per tipo → nessun match
- `applyAssigneeFilters(movements, filters, userId)` — lista filtrata
- `parseStoredFilters` / `serializeFilters` — roundtrip localStorage JSON
- merge nuovo membro → default ON

- [ ] **Step 2: Run test — devono fallire**

Run: `npm test -- lib/cashflow/assignee-filters.test.ts`

- [ ] **Step 3: Implementare assignee-filters.ts**

Esportare:
- `ASSIGNEE_FILTERS_STORAGE_KEY = 'hestia:cashflow:filters:v1'`
- `AssigneeFiltersState`, `TypeFilterState`
- `createDefaultFilters`, `loadFilters`, `saveFilters`
- `movementMatchesTypeFilter`, `applyAssigneeFilters`
- `summarizeFilteredMovements` (per totali)

- [ ] **Step 4: Run test — devono passare**

Run: `npm test -- lib/cashflow/assignee-filters.test.ts`

- [ ] **Step 5: Commit**

```bash
git add lib/cashflow/assignee-filters.ts lib/cashflow/assignee-filters.test.ts
git commit -m "feat: assignee filter logic with tests"
```

---

### Task 4: Query famiglia membri

**Files:**
- Modify: `lib/families/types.ts`
- Modify: `lib/families/queries.ts`

- [ ] **Step 1: Aggiungere tipo e query**

```typescript
export type FamilyMemberOption = {
  user_id: string;
  display_name: string;
};

export async function listFamilyMembersForViewer(): Promise<FamilyMemberOption[]>
```

Join `family_members` + `profiles`; ordine per nome. Restituisce `[]` se viewer senza famiglia.

- [ ] **Step 2: Commit**

```bash
git add lib/families/types.ts lib/families/queries.ts
git commit -m "feat: list family members for assignee UI"
```

---

### Task 5: Query cashflow

**Files:**
- Modify: `lib/cashflow/queries.ts`

- [ ] **Step 1: Aggiornare select e mapMovement**

Select: `created_by, assignee_kind, assignee_user_id, is_private` (no scope/family_id/user_id).

Caricare nomi per `created_by` e `assignee_user_id` in un unico `loadProfileNames`.

- [ ] **Step 2: Semplificare API query**

```typescript
export async function listMovementsForRange(
  from: string,
  to: string,
  filters: AssigneeFiltersState,
  currentUserId: string,
): Promise<Movement[]>

export async function getRangeSummary(..., filters, currentUserId): Promise<MonthSummary>
export async function getYearMonthlySummaries(year, filters, currentUserId): Promise<YearSummary>
```

Rimuovere import da `view.ts` e `share.ts`. Applicare `applyAssigneeFilters` dopo map.

- [ ] **Step 3: Run build typecheck**

Run: `npm run build` (o `npx tsc --noEmit`)

- [ ] **Step 4: Commit**

```bash
git add lib/cashflow/queries.ts
git commit -m "refactor: cashflow queries use assignee filters"
```

---

### Task 6: Server Actions movimenti

**Files:**
- Modify: `app/actions/movements.ts`
- Modify or delete: `lib/cashflow/movement-visibility.ts`
- Modify: `lib/cashflow/movement-visibility.test.ts` → rinominare/adattare a assignee rules

- [ ] **Step 1: Nuovo resolveAssignee**

```typescript
async function resolveAssignee(input: {
  isFamily: boolean;
  assigneeUserId?: string;
  isPrivate?: boolean;
}): Promise<{ assignee_kind; assignee_user_id; is_private } | ActionResult>
```

Regole:
- Senza famiglia → sempre member + self, isPrivate opzionale
- isFamily → family, is_private false
- member → validate membro in famiglia; isPrivate solo se assignee === auth.uid()

- [ ] **Step 2: Aggiornare create/update/delete**

Insert/update con `created_by`, nuovi campi. Rimuovere `resolveMovementScope`, `isPrivate` legacy.

Per update: se cambio assignee/privato, validare permessi (privato solo assignee può editare — RLS + messaggio).

- [ ] **Step 3: Aggiornare test visibility**

Test: `canSetPrivate(assigneeUserId, currentUserId)`, regole cambio assignee.

- [ ] **Step 4: Run test**

Run: `npm test -- lib/cashflow/movement-visibility.test.ts`

- [ ] **Step 5: Commit**

```bash
git add app/actions/movements.ts lib/cashflow/movement-visibility.ts lib/cashflow/movement-visibility.test.ts
git commit -m "feat: movement actions with assignee payload"
```

---

### Task 7: Form movimento

**Files:**
- Modify: `components/cashflow/movement-form-dialog.tsx`

- [ ] **Step 1: Nuove props**

```typescript
familyMembers: FamilyMemberOption[];
```

- [ ] **Step 2: UI uscite/entrate**

- Stato `isFamily`, `assigneeUserId`, `isPrivate`
- Default on open: expense → isFamily=true; income → isFamily=false, assignee=self
- Toggle «Di famiglia»
- Select assegnatario (hidden se isFamily)
- Checkbox «Privato» solo se assigneeUserId === currentUserId
- Payload: `isFamily`, `assigneeUserId`, `isPrivate`

- [ ] **Step 3: Commit**

```bash
git add components/cashflow/movement-form-dialog.tsx
git commit -m "ui: movement form with assignee and family toggle"
```

---

### Task 8: Pannello filtri

**Files:**
- Create: `components/cashflow/assignee-filter-panel.tsx`

- [ ] **Step 1: Componente client**

Props: `members`, `currentUserId`, `hasFamily`, `onChange`

- Due sezioni Entrate / Uscite
- Checkbox Famiglia + per membro
- Sotto self: «Mostra privati»
- Legge/scrive localStorage via `loadFilters`/`saveFilters`
- Impedire deselezione totale? **No** — zero selezioni ammesse (spec A)

- [ ] **Step 2: Commit**

```bash
git add components/cashflow/assignee-filter-panel.tsx
git commit -m "ui: assignee filter panel for income and expense"
```

---

### Task 9: Tabella movimenti

**Files:**
- Modify: `components/cashflow/movements-table-columns.tsx`
- Modify: `components/cashflow/movements-table.tsx`

- [ ] **Step 1: Colonne**

- **Assegnatario** — «Famiglia» o `assignee_name`
- **Inserito da** — `creator_name` (sempre visibile se hasFamily)
- Badge **Privato** se `is_private`
- Rimuovere `showAuthor` condizionale su view; rimuovere `showPrivateBadge` legato a view=all

- [ ] **Step 2: Commit**

```bash
git add components/cashflow/movements-table-columns.tsx components/cashflow/movements-table.tsx
git commit -m "ui: assignee and creator columns in movements table"
```

---

### Task 10: MovementsManager + pagine

**Files:**
- Modify: `components/cashflow/movements-manager.tsx`
- Modify: `components/cashflow/date-range-filter.tsx`
- Modify: `app/(protected)/cashflow/page.tsx`
- Modify: `app/(protected)/page.tsx`
- Modify: `components/home/mobile-home.tsx`

- [ ] **Step 1: cashflow/page.tsx**

- Rimuovere `parseCashflowViewParam`, `parseShareParam`, `getFamilyMemberCount`
- Caricare `listFamilyMembersForViewer()`
- Passare `familyMembers` al manager
- Query con default filters server-side (`createDefaultFilters`) per SSR iniziale; client riapplica localStorage on mount

- [ ] **Step 2: movements-manager.tsx**

- Rimuovere `ViewFilter`, props `view`/`share`/`memberCount`/`rawMovements`
- Aggiungere `AssigneeFilterPanel`, state filtri client
- Al cambio filtri: ricalcolare lista/totali client-side da movimenti SSR **oppure** `router.refresh()` — preferire **client-side filter** su array completo per evitare round-trip (volume basso)
- Passare `familyMembers` al form dialog

- [ ] **Step 3: mobile-home.tsx + page.tsx**

- Stessi filtri localStorage
- Rimuovere view/share da URL building

- [ ] **Step 4: date-range-filter.tsx**

- Rimuovere props `view`, `share` da buildSearchParams

- [ ] **Step 5: Commit**

```bash
git add components/cashflow/movements-manager.tsx components/cashflow/date-range-filter.tsx app/(protected)/cashflow/page.tsx app/(protected)/page.tsx components/home/mobile-home.tsx
git commit -m "refactor: wire assignee filters across cashflow and mobile home"
```

---

### Task 11: Cleanup codice legacy

**Files:**
- Delete: `lib/cashflow/view.ts`, `lib/cashflow/share.ts`, `lib/cashflow/view.test.ts`, `lib/cashflow/share.test.ts`, `components/cashflow/view-filter.tsx`

- [ ] **Step 1: Rimuovere file e fix import rotti**

Run: `npm run build`

- [ ] **Step 2: Aggiornare sankey.test.ts**

Adattare fixture Movement ai nuovi campi.

- [ ] **Step 3: Run full test suite**

Run: `npm test`

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove view/share cashflow legacy"
```

---

### Task 12: Documentazione e verifica manuale

**Files:**
- Modify: `docs/MANUAL_TEST.md`

- [ ] **Step 1: Aggiornare checklist**

13 scenari da spec § Test manuali.

- [ ] **Step 2: Run lint + build**

Run: `npm run lint && npm run build`

- [ ] **Step 3: Commit**

```bash
git add docs/MANUAL_TEST.md
git commit -m "docs: manual tests for movement assignee"
```

---

## Ordine consigliato

1. Task 1 (DB) → 2 (tipi) → 3 (filtri TDD) → 4 (family members query)
2. Task 5–6 (queries + actions) — richiedono DB
3. Task 7–10 (UI) — in parallelo possibile dopo Task 3
4. Task 11–12 (cleanup + docs)

## Note implementative

- **SSR + localStorage:** la page server usa `createDefaultFilters`; il client in `useEffect` sovrascrive con `loadFilters` e ricalcola. Evita flash impostando `useState` initializer che legge localStorage solo client-side.
- **Sankey:** usa movimenti già filtrati passati al dialog (nessun cambio chart internals oltre ai tipi).
- **getFamilyMemberCount:** rimuovere se solo usato per share; verificare grep prima di delete.
- **RLS UPDATE privato:** USING `(assignee_user_id = auth.uid())` — membro non assegnatario non può modificare privati altrui anche se conosce l'id.

## Test plan (manuale rapido)

1. Crea uscita famiglia → filtro Famiglia ON la mostra
2. Crea uscita personale a partner → partner la vede col suo filtro
3. Crea uscita privata → solo tu la vedi
4. Entrate default personale; toggle famiglia funziona
5. Colonne Inserito da / Assegnatario popolate
6. Deseleziona tutte le uscite → solo entrate in lista
7. Refresh → filtri persistono (localStorage)
8. Utente senza famiglia → no pannello filtri
