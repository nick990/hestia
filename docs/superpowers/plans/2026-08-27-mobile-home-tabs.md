# Home mobile a tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sul telefono `/` diventa un guscio a tab (Cashflow / Notes) con vista sotto; desktop, `/cashflow` e `/notes` restano com’è.

**Architecture:** Query `tab` su `/`. Helper puri in `lib/home/tab.ts`. `HomeShell` + `HomeTabs` wrappano la vista. Cashflow riusa `MobileHome`; Notes riusa `NotesPage` con `hideTitle`. La page carica movimenti e note in parallelo con isolation degli errori. Nessun tab sul desktop (middleware già reindirizza `/` a `/cashflow`).

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind, lucide-react, Vitest.

**Spec:** [`docs/superpowers/specs/2026-08-27-mobile-home-tabs-design.md`](../specs/2026-08-27-mobile-home-tabs-design.md)

## Global Constraints

- Solo telefono su `/`. Desktop: `/` → `/cashflow` (già nel middleware). Non toccare quel redirect.
- `/notes` e `/cashflow` restano pagine autonome **senza** riga tab.
- Copy e UI in italiano; niente em dash.
- Tab Cashflow = terracotta (`--primary`). Tab Notes = umber `oklch(0.42 0.07 55)`, token `--home-tab-notes`. Mai verde/rosso sulle icone.
- `tab` default omesso dall’URL quando Cashflow; `tab=notes` solo per Notes.
- `from`/`to` si copiano sempre tra i tab.
- Test runner: `npx vitest run`. Non inventare Playwright in questo piano.
- Non cambiare il contenuto della home movimenti (filtri, totali, lista, FAB).

---

## File map

| File | Azione | Responsabilità |
|------|--------|----------------|
| `lib/home/tab.ts` | Create | `HomeTab`, `parseHomeTab`, `buildHomeHref` |
| `lib/home/tab.test.ts` | Create | Test parse e href |
| `app/globals.css` | Modify | Token `--home-tab-notes` |
| `components/home/home-tabs.tsx` | Create | Riga icone sticky, link |
| `components/home/home-shell.tsx` | Create | Tab + slot vista a tutta altezza |
| `components/home/home-vista-error.tsx` | Create | Errore di una sola vista |
| `components/home/mobile-home.tsx` | Modify | Href mese via `buildHomeHref`; `h-full` |
| `components/notes/notes-page.tsx` | Modify | Prop opzionale `hideTitle` |
| `app/(protected)/page.tsx` | Modify | Parse tab, fetch parallelo, shell |
| `docs/manuale/index.md` | Modify | Home telefono a tab |
| `docs/manuale/cashflow.md` | Modify | Bullet telefono |
| `docs/manuale/notes.md` | Modify | Tab vs menu |
| `docs/MANUAL_TEST.md` | Modify | Checklist tab al posto di «niente Notes» |

Non toccare `app/(protected)/loading.tsx`: è lo skeleton di tutto il gruppo (anche Cashflow desktop).

---

### Task 1: Parse `tab` e costruzione href

**Files:**
- Create: `lib/home/tab.ts`
- Test: `lib/home/tab.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `export type HomeTab = "cashflow" | "notes"`
  - `export function parseHomeTab(value: string | undefined | null): HomeTab`
  - `export function buildHomeHref(input: { tab?: HomeTab; from?: string; to?: string }): string`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { buildHomeHref, parseHomeTab } from "@/lib/home/tab";

describe("parseHomeTab", () => {
  it("default e junk sono cashflow", () => {
    expect(parseHomeTab(undefined)).toBe("cashflow");
    expect(parseHomeTab(null)).toBe("cashflow");
    expect(parseHomeTab("")).toBe("cashflow");
    expect(parseHomeTab("cashflow")).toBe("cashflow");
    expect(parseHomeTab("foo")).toBe("cashflow");
  });

  it("accetta notes", () => {
    expect(parseHomeTab("notes")).toBe("notes");
  });
});

describe("buildHomeHref", () => {
  it("omette tab per cashflow e può omettere from/to", () => {
    expect(buildHomeHref({})).toBe("/");
    expect(buildHomeHref({ tab: "cashflow" })).toBe("/");
    expect(
      buildHomeHref({
        tab: "cashflow",
        from: "2026-08-01",
        to: "2026-08-31",
      }),
    ).toBe("/?from=2026-08-01&to=2026-08-31");
  });

  it("mette tab=notes e conserva from/to", () => {
    expect(buildHomeHref({ tab: "notes" })).toBe("/?tab=notes");
    expect(
      buildHomeHref({
        tab: "notes",
        from: "2026-08-01",
        to: "2026-08-31",
      }),
    ).toBe("/?tab=notes&from=2026-08-01&to=2026-08-31");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/home/tab.test.ts`

Expected: FAIL, modulo non trovato.

- [ ] **Step 3: Write minimal implementation**

```ts
export type HomeTab = "cashflow" | "notes";

export function parseHomeTab(value: string | undefined | null): HomeTab {
  return value === "notes" ? "notes" : "cashflow";
}

export function buildHomeHref(input: {
  tab?: HomeTab;
  from?: string;
  to?: string;
}): string {
  const params = new URLSearchParams();

  if (input.tab === "notes") {
    params.set("tab", "notes");
  }

  if (input.from) {
    params.set("from", input.from);
  }

  if (input.to) {
    params.set("to", input.to);
  }

  const query = params.toString();
  return query === "" ? "/" : `/?${query}`;
}
```

- [ ] **Step 4: Run tests and make sure they pass**

Run: `npx vitest run lib/home/tab.test.ts`

Expected: PASS, 4 test.

- [ ] **Step 5: Commit**

```bash
git add lib/home/tab.ts lib/home/tab.test.ts
git commit -m "feat(home): parse tab e href della home mobile"
```

---

### Task 2: Riga tab e guscio

**Files:**
- Modify: `app/globals.css` (dentro `:root` dopo `--primary`)
- Create: `components/home/home-tabs.tsx`
- Create: `components/home/home-shell.tsx`
- Create: `components/home/home-vista-error.tsx`

**Interfaces:**
- Consumes: `HomeTab`, `buildHomeHref` da Task 1
- Produces:
  - `--home-tab-notes` in CSS
  - `HomeTabs({ tab, from, to })`
  - `HomeShell({ tab, from, to, children })`
  - `HomeVistaError({ message }: { message: string })`

- [ ] **Step 1: Token umber**

In `app/globals.css` `:root`, dopo `--primary-foreground`:

```css
  --home-tab-notes: oklch(0.42 0.07 55);
```

Nel blocco `@theme inline` (dove già c’è `--color-primary`), aggiungi:

```css
  --color-home-tab-notes: var(--home-tab-notes);
```

Così in Tailwind si usa `text-home-tab-notes` e `bg-home-tab-notes`.

- [ ] **Step 2: `home-vista-error.tsx`**

```tsx
export function HomeVistaError({ message }: { message: string }) {
  return (
    <div className="px-6 py-8">
      <p className="text-sm text-destructive">{message}</p>
    </div>
  );
}
```

- [ ] **Step 3: `home-tabs.tsx`**

Server component. Link, non bottoni.

```tsx
import { buildHomeHref, type HomeTab } from "@/lib/home/tab";
import { cn } from "@/lib/utils";
import { StickyNoteIcon, WalletIcon } from "lucide-react";
import Link from "next/link";

type HomeTabsProps = {
  tab: HomeTab;
  from: string;
  to: string;
};

const items = [
  {
    id: "cashflow" as const,
    hrefTab: "cashflow" as const,
    label: "Cashflow",
    icon: WalletIcon,
    colorClass: "text-primary",
    selectedClass: "bg-primary/15 text-primary",
  },
  {
    id: "notes" as const,
    hrefTab: "notes" as const,
    label: "Notes",
    icon: StickyNoteIcon,
    colorClass: "text-home-tab-notes",
    selectedClass: "bg-home-tab-notes/15 text-home-tab-notes",
  },
];

export function HomeTabs({ tab, from, to }: HomeTabsProps) {
  return (
    <nav
      aria-label="Sezioni home"
      className="sticky top-0 z-20 flex justify-center gap-8 border-b bg-background px-4 py-2"
    >
      {items.map((item) => {
        const selected = tab === item.id;
        const Icon = item.icon;

        return (
          <Link
            key={item.id}
            href={buildHomeHref({ tab: item.hrefTab, from, to })}
            aria-current={selected ? "page" : undefined}
            className="flex min-h-11 min-w-11 flex-col items-center gap-1 rounded-lg px-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span
              className={cn(
                "flex size-10 items-center justify-center rounded-full transition-colors duration-150 motion-reduce:transition-none",
                selected ? item.selectedClass : item.colorClass,
              )}
            >
              <Icon className="size-5" />
            </span>
            <span
              className={cn(
                "text-xs font-medium",
                selected ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
```

Selected = disco tinta (`bg-*/15`), a riposo = solo colore icona, nessun disco. Focus = anello sistema. `min-h-11` ≈ 44px.

- [ ] **Step 4: `home-shell.tsx`**

Altezza: header layout è `h-14` (3.5rem). Flex per lo slot vista:

```tsx
import { HomeTabs } from "@/components/home/home-tabs";
import type { HomeTab } from "@/lib/home/tab";
import type { ReactNode } from "react";

type HomeShellProps = {
  tab: HomeTab;
  from: string;
  to: string;
  children: ReactNode;
};

export function HomeShell({ tab, from, to, children }: HomeShellProps) {
  return (
    <div className="flex h-[calc(100dvh-3.5rem-1px)] min-h-0 flex-col">
      <HomeTabs tab={tab} from={from} to={to} />
      <div className="min-h-0 flex-1 overflow-y-auto" key={tab}>
        {children}
      </div>
    </div>
  );
}
```

Cambio vista: `key={tab}` smonta e rimonta. Niente fade obbligatorio se `tw-animate-css` non è banale da verificare; R16 è soddisfatto da un swap istantaneo, che è anche il caso `prefers-reduced-motion`. Non aggiungere keyframes.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css components/home/home-tabs.tsx components/home/home-shell.tsx components/home/home-vista-error.tsx
git commit -m "feat(home): riga tab sticky Cashflow e Notes"
```

---

### Task 3: Vista Cashflow e titolo Notes

**Files:**
- Modify: `components/home/mobile-home.tsx`
- Modify: `components/notes/notes-page.tsx`

**Interfaces:**
- Consumes: `buildHomeHref` da Task 1
- Produces: `NotesPage` accetta `hideTitle?: boolean` (default false)

- [ ] **Step 1: Mese e altezza in `mobile-home.tsx`**

Aggiungi:

```tsx
import { buildHomeHref } from "@/lib/home/tab";
```

In `shiftMonth`, sostituisci `router.push(\`/?\${params.toString()}\`)` con:

```tsx
function shiftMonth(delta: number) {
  const next = shiftMonthRange(from, delta);

  startNavigation(() => {
    setVisibleMonthKey(next.from.slice(0, 7));
    router.push(
      buildHomeHref({
        tab: "cashflow",
        from: next.from,
        to: next.to,
      }),
    );
  });
}
```

Rimuovi la variabile `params` locale se non serve più.

Wrapper, da:

```tsx
<div className="flex h-[calc(100dvh-3.5rem-1px)] flex-col gap-4 p-6 pb-24"
```

a:

```tsx
<div
  className="flex h-full min-h-0 flex-col gap-4 p-6 pb-24"
  aria-busy={navigating}
>
```

`h-full` riempie lo slot della vista. Il FAB resta `fixed` solo in questa vista.

- [ ] **Step 2: `hideTitle` su `NotesPage`**

Estendi le props:

```tsx
type NotesPageProps = {
  currentUserId: string;
  notes: Note[];
  prefs: NoteUiPrefs;
  hasFamily: boolean;
  hideTitle?: boolean;
};
```

Nella funzione, default `hideTitle = false`. Sul `main`:

```tsx
<main
  className={cn(
    "mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8",
    hideTitle && "py-4",
  )}
>
  {hideTitle ? null : (
    <h1 className="text-2xl font-semibold tracking-tight">Notes</h1>
  )}
  <div className={hideTitle ? undefined : "mt-6"}>
    <NoteComposer hasFamily={hasFamily} />
  </div>
```

Importa `cn` da `@/lib/utils` se non c’è già.

Su `/notes` non passare `hideTitle`. Sulla home passare `hideTitle`.

- [ ] **Step 3: Commit**

```bash
git add components/home/mobile-home.tsx components/notes/notes-page.tsx
git commit -m "feat(home): mese e titolo Notes adattati alla vista"
```

---

### Task 4: Page `/` con fetch parallelo e isolation

**Files:**
- Modify: `app/(protected)/page.tsx`

**Interfaces:**
- Consumes: `parseHomeTab`, `HomeShell`, `HomeVistaError`, `MobileHome`, `NotesPage`, query esistenti
- Produces: home mobile a tab funzionante

Le query `listAllMovementsForRange`, `listNotesForCurrentUser` e `getNoteUiPrefs` **throw** su errore. Isolare con `settled` locale in fondo al file (non esportare).

- [ ] **Step 1: Sostituisci `app/(protected)/page.tsx`**

```tsx
import { HomeShell } from "@/components/home/home-shell";
import { HomeVistaError } from "@/components/home/home-vista-error";
import { MobileHome } from "@/components/home/mobile-home";
import { NotesPage } from "@/components/notes/notes-page";
import { listCategoryOptions } from "@/lib/categories/queries";
import {
  getTodayIsoDate,
  parseDateRangeParams,
} from "@/lib/cashflow/date-range";
import { listAllMovementsForRange } from "@/lib/cashflow/queries";
import {
  getCurrentUserFamily,
  listFamilyMembersForViewer,
} from "@/lib/families/queries";
import { parseHomeTab } from "@/lib/home/tab";
import { getNoteUiPrefs, listNotesForCurrentUser } from "@/lib/notes/queries";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type HomePageProps = {
  searchParams: Promise<{ from?: string; to?: string; tab?: string }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const tab = parseHomeTab(params.tab);
  const { from, to } = parseDateRangeParams(params.from, params.to);
  const monthKey = from.slice(0, 7);
  const family = await getCurrentUserFamily();
  const hasFamily = family !== null;

  const [
    movementsResult,
    membersResult,
    categoriesResult,
    notesResult,
    prefsResult,
  ] = await Promise.all([
    settled(listAllMovementsForRange(from, to)),
    settled(listFamilyMembersForViewer()),
    settled(listCategoryOptions()),
    settled(listNotesForCurrentUser()),
    settled(getNoteUiPrefs()),
  ]);

  const cashflowReady =
    movementsResult.ok && membersResult.ok && categoriesResult.ok;
  const notesReady = notesResult.ok && prefsResult.ok;

  return (
    <div className="mx-auto w-full max-w-5xl flex-1">
      <HomeShell tab={tab} from={from} to={to}>
        {tab === "notes" ? (
          notesReady ? (
            <NotesPage
              currentUserId={user.id}
              notes={notesResult.value}
              prefs={prefsResult.value}
              hasFamily={hasFamily}
              hideTitle
            />
          ) : (
            <HomeVistaError
              message={
                !notesResult.ok ? notesResult.error : prefsResult.error
              }
            />
          )
        ) : cashflowReady ? (
          <MobileHome
            monthKey={monthKey}
            from={from}
            allMovements={movementsResult.value}
            hasFamily={hasFamily}
            currentUserId={user.id}
            defaultOccurredOn={getTodayIsoDate()}
            familyMembers={membersResult.value}
            categories={categoriesResult.value}
          />
        ) : (
          <HomeVistaError
            message={
              !movementsResult.ok
                ? movementsResult.error
                : !membersResult.ok
                  ? membersResult.error
                  : categoriesResult.error
            }
          />
        )}
      </HomeShell>
    </div>
  );
}

async function settled<T>(
  promise: Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  try {
    return { ok: true, value: await promise };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Qualcosa è andato storto.",
    };
  }
}
```

Nel ramo `notesReady`, TypeScript restringe `notesResult` e `prefsResult` a `ok: true`. Nel ramo errore Notes, se `notesResult.ok` allora `prefsResult` è `ok: false` e `.error` esiste.

- [ ] **Step 2: Typecheck e test**

Run: `npx tsc --noEmit`

Expected: exit 0.

Run: `npx vitest run`

Expected: tutti i test verdi, incluso `lib/home/tab.test.ts`.

- [ ] **Step 3: Commit**

```bash
git add app/(protected)/page.tsx
git commit -m "feat(home): guscio a tab Cashflow e Notes sul telefono"
```

---

### Task 5: Manuale e checklist

**Files:**
- Modify: `docs/manuale/index.md`
- Modify: `docs/manuale/cashflow.md` (sezione «Dove li trovi»)
- Modify: `docs/manuale/notes.md`
- Modify: `docs/MANUAL_TEST.md`

**Interfaces:**
- Consumes: comportamento shippato
- Produces: docs utente allineate

- [ ] **Step 1: `docs/manuale/index.md`**

Dopo il paragrafo «Questo manuale spiega…», prima di «Sezioni»:

```md
Sul **telefono**, la schermata iniziale ha due tab: **Cashflow** (riepilogo del mese e nuovi movimenti) e **Notes** (stessi appunti della pagina Notes). In alto restano il nome Hestia e il menu. Dal menu apri ancora Cashflow completo e Notes come pagine a sé.
```

- [ ] **Step 2: `docs/manuale/cashflow.md`**

Nella sezione «Dove li trovi», il bullet telefono diventa:

```md
- Sul **telefono**, la schermata iniziale apre il tab Cashflow: mese in corso, totali, filtri e ultimi movimenti, con il + per aggiungerne uno. Il tab Notes è accanto. Dal menu, **Cashflow** apre la lista completa.
```

- [ ] **Step 3: `docs/manuale/notes.md`**

Dopo il primo paragrafo:

```md
Sul telefono le trovi anche dal tab **Notes** della schermata iniziale. Dal menu, **Notes** apre la stessa bacheca a pagina intera, senza i tab.
```

- [ ] **Step 4: `docs/MANUAL_TEST.md`**

Sostituisci `- [ ] Home \`/\` invariata (niente Notes).` con:

```md
## Home mobile (tab)

- [ ] Telefono: `/` mostra riga tab Cashflow (terracotta) e Notes (umber) sotto l’header; Cashflow è selezionato.
- [ ] Tab Notes → bacheca note, senza h1 «Notes»; Indietro torna a Cashflow; refresh su `/?tab=notes` resta su Notes.
- [ ] Su Notes, `from`/`to` restano in URL; tornare a Cashflow mostra lo stesso mese.
- [ ] Cambio mese sul tab Cashflow non perde la lista; FAB + solo su Cashflow.
- [ ] Menu → Notes apre `/notes` **senza** riga tab; menu → Cashflow apre `/cashflow` completa.
- [ ] Desktop: `/` reindirizza a `/cashflow`; nessuna riga tab.
```

Lascia la sezione Notes esistente.

- [ ] **Step 5: Commit**

```bash
git add docs/manuale/index.md docs/manuale/cashflow.md docs/manuale/notes.md docs/MANUAL_TEST.md
git commit -m "docs: home telefono a tab nel manuale e nei test"
```

---

## Spec coverage

| ID | Task |
|----|------|
| R1 | 4 (middleware già ok) |
| R2 | 2 |
| R3–R4, R9–R11 | 1, 2, 3, 4 |
| R5, R12 | 3, 4 |
| R6–R8 | 3, 4 (non toccare route `/notes` `/cashflow`) |
| R13–R16 | 2 (swap istantaneo = reduced motion) |
| R17 | 4 |
| R18 | 5 |

R16 fade: swap `key={tab}` senza animazione. Se in review si vuole il crossfade, aggiungerlo allora, non in questo piano.

## Verifica manuale rapida

1. User-agent iPhone: apri `/` → tab Cashflow, home di sempre, + visibile.
2. Tap Notes → composer e sezioni; niente titolo pagina; tap Cashflow torna.
3. Cambia mese, vai Notes, torna: stesso mese.
4. Menu Notes → `/notes` con h1, senza tab.
5. Desktop: `/` → `/cashflow`, nav testuale.
