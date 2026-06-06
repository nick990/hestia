# Family movement visibility lock — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Impedire a un non autore di cambiare la visibilità (privato ↔ famiglia) di un movimento condiviso; gli altri campi restano modificabili.

**Architecture:** Helper puro in `lib/cashflow/movement-visibility.ts` per rilevare cambio visibilità e decidere se consentirlo; `updateMovement` carica il movimento esistente e applica la guard prima dell'update; UI disabilita il checkbox «Privato» per non autori con messaggio di aiuto. Nessuna migration DB.

**Tech Stack:** Next.js 16, React 19, Supabase RLS (invariato), Vitest.

**Spec:** [`docs/superpowers/specs/2026-06-06-family-movement-visibility-lock-design.md`](../specs/2026-06-06-family-movement-visibility-lock-design.md)

---

## File map

| File | Responsabilità |
|------|----------------|
| `lib/cashflow/movement-visibility.ts` | Helper puro: cambio visibilità, permesso |
| `lib/cashflow/movement-visibility.test.ts` | Unit test helper |
| `app/actions/movements.ts` | Fetch existing + guard in `updateMovement` |
| `app/(protected)/cashflow/page.tsx` | Prop `currentUserId` |
| `components/cashflow/movements-manager.tsx` | Checkbox disabilitato + aiuto |
| `docs/MANUAL_TEST.md` | Checklist aggiornata |

---

### Task 1: Helper visibilità (TDD)

**Files:**
- Create: `lib/cashflow/movement-visibility.ts`
- Create: `lib/cashflow/movement-visibility.test.ts`

- [ ] **Step 1: Scrivere i test (falliscono — modulo assente)**

Create `lib/cashflow/movement-visibility.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  hasVisibilityChanged,
  isVisibilityChangeAllowed,
  VISIBILITY_CHANGE_DENIED_MESSAGE,
} from "@/lib/cashflow/movement-visibility";

describe("hasVisibilityChanged", () => {
  const existing = { scope: "family" as const, family_id: "f1" };

  it("returns false when scope and family_id unchanged", () => {
    expect(hasVisibilityChanged(existing, { scope: "family", family_id: "f1" })).toBe(false);
  });

  it("returns true when scope changes", () => {
    expect(hasVisibilityChanged(existing, { scope: "private", family_id: null })).toBe(true);
  });

  it("returns true when family_id changes", () => {
    expect(hasVisibilityChanged(existing, { scope: "family", family_id: "f2" })).toBe(true);
  });
});

describe("isVisibilityChangeAllowed", () => {
  it("allows author to change visibility", () => {
    expect(isVisibilityChangeAllowed("u1", "u1", true)).toBe(true);
  });

  it("allows non-author when visibility unchanged", () => {
    expect(isVisibilityChangeAllowed("u1", "u2", false)).toBe(true);
  });

  it("denies non-author when visibility changed", () => {
    expect(isVisibilityChangeAllowed("u1", "u2", true)).toBe(false);
  });
});

describe("VISIBILITY_CHANGE_DENIED_MESSAGE", () => {
  it("is a non-empty Italian message", () => {
    expect(VISIBILITY_CHANGE_DENIED_MESSAGE).toContain("autore");
  });
});
```

- [ ] **Step 2: Eseguire test — devono fallire**

Run: `npm test -- lib/cashflow/movement-visibility.test.ts`

Expected: FAIL (module not found)

- [ ] **Step 3: Implementare**

Create `lib/cashflow/movement-visibility.ts`:

```ts
import type { MovementScope } from "@/lib/cashflow/types";

export const VISIBILITY_CHANGE_DENIED_MESSAGE =
  "Solo l'autore può cambiare la visibilità di questo movimento.";

type VisibilityFields = {
  scope: MovementScope;
  family_id: string | null;
};

export function hasVisibilityChanged(
  existing: VisibilityFields,
  next: VisibilityFields,
): boolean {
  return existing.scope !== next.scope || existing.family_id !== next.family_id;
}

export function isVisibilityChangeAllowed(
  authorId: string,
  currentUserId: string,
  visibilityChanged: boolean,
): boolean {
  if (!visibilityChanged) {
    return true;
  }

  return authorId === currentUserId;
}
```

- [ ] **Step 4: Eseguire test — devono passare**

Run: `npm test -- lib/cashflow/movement-visibility.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/cashflow/movement-visibility.ts lib/cashflow/movement-visibility.test.ts
git commit -m "feat(cashflow): add movement visibility change helpers"
```

---

### Task 2: Guard in `updateMovement`

**Files:**
- Modify: `app/actions/movements.ts`

- [ ] **Step 1: Importare helper**

Aggiungere in cima a `app/actions/movements.ts`:

```ts
import {
  hasVisibilityChanged,
  isVisibilityChangeAllowed,
  VISIBILITY_CHANGE_DENIED_MESSAGE,
} from "@/lib/cashflow/movement-visibility";
```

- [ ] **Step 2: Fetch existing e guard prima dell'update**

In `updateMovement`, dopo la validazione categoria e **prima** di `resolveMovementScope`, aggiungere fetch:

```ts
  const { data: existing, error: fetchError } = await supabase
    .from("movements")
    .select("user_id, scope, family_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return { ok: false, error: fetchError.message };
  }

  if (!existing) {
    return { ok: false, error: "Movimento non trovato." };
  }
```

Dopo `resolveMovementScope` e destructuring `{ scope, family_id }`, prima dell'`.update()`:

```ts
  const visibilityChanged = hasVisibilityChanged(
    {
      scope: existing.scope as MovementScope,
      family_id: existing.family_id,
    },
    { scope, family_id },
  );

  if (
    !isVisibilityChangeAllowed(existing.user_id, user.id, visibilityChanged)
  ) {
    return { ok: false, error: VISIBILITY_CHANGE_DENIED_MESSAGE };
  }
```

- [ ] **Step 3: Verificare build**

Run: `npm run build`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/actions/movements.ts
git commit -m "feat(cashflow): block visibility change by non-authors"
```

---

### Task 3: UI — checkbox disabilitato

**Files:**
- Modify: `app/(protected)/cashflow/page.tsx`
- Modify: `components/cashflow/movements-manager.tsx`

- [ ] **Step 1: Passare `currentUserId` dalla page**

In `app/(protected)/cashflow/page.tsx`, aggiungere prop a `MovementsManager`:

```tsx
            currentUserId={user.id}
```

- [ ] **Step 2: Aggiornare props e logica in MovementsManager**

In `MovementsManagerProps`:

```ts
  currentUserId: string;
```

Destructuring:

```ts
  currentUserId,
```

Calcolare prima del return (o inline nel JSX):

```ts
  const canChangeVisibility =
    !editingMovement || editingMovement.user_id === currentUserId;
```

- [ ] **Step 3: Checkbox disabilitato + testo aiuto**

Sostituire il blocco `{hasFamily ? (...)` del checkbox con:

```tsx
              {hasFamily ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="movement-private"
                      checked={isPrivate}
                      disabled={!canChangeVisibility}
                      onCheckedChange={(checked) => setIsPrivate(checked === true)}
                    />
                    <Label htmlFor="movement-private" className="font-normal">
                      Privato
                    </Label>
                  </div>
                  {!canChangeVisibility ? (
                    <p className="text-xs text-muted-foreground">
                      Solo l&apos;autore può cambiare la visibilità
                    </p>
                  ) : null}
                </div>
              ) : null}
```

- [ ] **Step 4: Verificare build**

Run: `npm run build`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/(protected)/cashflow/page.tsx components/cashflow/movements-manager.tsx
git commit -m "feat(cashflow): disable visibility toggle for non-authors"
```

---

### Task 4: Documentazione e verifica

**Files:**
- Modify: `docs/MANUAL_TEST.md`

- [ ] **Step 1: Aggiornare checklist Famiglie**

In sezione «Famiglie e movimenti condivisi», sostituire:

```markdown
- [ ] B modifica/elimina movimento family di A → OK.
```

con:

```markdown
- [ ] B modifica importo/descrizione movimento family di A → OK; visibilità invariata.
- [ ] B apre modifica movimento family di A → checkbox «Privato» disabilitato + messaggio aiuto.
- [ ] B elimina movimento family di A → OK.
- [ ] A modifica il proprio movimento family → può attivare «Privato»; movimento sparisce a B.
```

- [ ] **Step 2: Eseguire tutti i test**

Run: `npm test`

Expected: tutti PASS

- [ ] **Step 3: Build finale**

Run: `npm run build`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add docs/MANUAL_TEST.md
git commit -m "docs: manual tests for family movement visibility lock"
```

---

## Spec coverage (self-review)

| Requisito | Task |
|-----------|------|
| R1–R4 Guard server | Task 1, 2 |
| R5–R6 create/delete invariati | Nessuna modifica |
| R7–R11 UI | Task 3 |
| Test manuali | Task 4 |
