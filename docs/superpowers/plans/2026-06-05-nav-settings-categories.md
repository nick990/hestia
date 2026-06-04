# Nav, Settings & Categories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rimuovere Dashboard, impostare Cashflow come home, introdurre Settings (Categorie + Utenti) e categorie globali opzionali sui movimenti.

**Architecture:** Migrazione `movement_categories` + FK su `movements`; Settings con layout sidebar; mutazioni categorie via Server Actions + `requireAdmin`; redirect centralizzati su `/cashflow`.

**Tech Stack:** Next.js 16 App Router, Supabase SSR, shadcn/ui, sonner.

**Spec:** [`docs/superpowers/specs/2026-06-05-nav-settings-categories-design.md`](../specs/2026-06-05-nav-settings-categories-design.md)

---

## File map

| File | Azione |
|------|--------|
| `supabase/migrations/20250605120000_movement_categories.sql` | Create |
| `lib/categories/types.ts` | Create |
| `lib/categories/queries.ts` | Create |
| `app/actions/categories.ts` | Create |
| `app/(protected)/settings/layout.tsx` | Create |
| `app/(protected)/settings/page.tsx` | Create |
| `app/(protected)/settings/categories/page.tsx` | Create |
| `app/(protected)/settings/users/page.tsx` | Create |
| `components/settings/settings-nav.tsx` | Create |
| `components/settings/categories-manager.tsx` | Create |
| `app/(protected)/users/page.tsx` | Modify → redirect |
| `app/(protected)/dashboard/page.tsx` | Delete |
| `components/layout/app-nav.tsx` | Modify |
| `lib/auth/member.ts` | Modify redirects |
| `lib/supabase/middleware.ts` | Modify |
| `app/page.tsx`, `app/auth/callback/route.ts` | Modify |
| `app/actions/members.ts` | Modify revalidatePath |
| `lib/cashflow/types.ts`, `queries.ts` | Modify |
| `app/actions/movements.ts` | Modify |
| `components/cashflow/movements-manager.tsx` | Modify |
| `app/(protected)/cashflow/page.tsx` | Modify props |
| `docs/MANUAL_TEST.md`, `README.md`, `docs/SUPABASE_SETUP.md` | Modify |

---

### Task 1: Migrazione categorie

**Files:**
- Create: `supabase/migrations/20250605120000_movement_categories.sql`

- [ ] **Step 1: Creare migrazione**

```sql
-- Categorie globali movimenti

create table public.movement_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  constraint movement_categories_name_not_blank check (trim(name) <> '')
);

create unique index movement_categories_name_lower_unique
  on public.movement_categories (lower(trim(name)));

alter table public.movements
  add column category_id uuid references public.movement_categories (id) on delete restrict;

create index movements_category_id_idx on public.movements (category_id);

alter table public.movement_categories enable row level security;

create policy "movement_categories_select_authenticated"
  on public.movement_categories
  for select
  to authenticated
  using (true);
```

Mutazioni INSERT/UPDATE/DELETE: solo Server Actions con `requireAdmin()` + `createAdminClient()` (come `members`), nessuna policy write per `authenticated`.

- [ ] **Step 2: Applicare migrazione**

MCP `apply_migration` su progetto `ifxgeqsdrowcbbtmjowx` oppure `supabase db push`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20250605120000_movement_categories.sql
git commit -m "feat(db): add movement_categories and optional category_id on movements"
```

---

### Task 2: Redirect e rimozione Dashboard

**Files:**
- Delete: `app/(protected)/dashboard/page.tsx`
- Modify: `app/page.tsx`, `lib/supabase/middleware.ts`, `app/auth/callback/route.ts`, `lib/auth/member.ts`

- [ ] **Step 1: Sostituire `/dashboard` con `/cashflow`**

In `app/page.tsx`:

```typescript
redirect("/cashflow");
```

In `lib/supabase/middleware.ts` — tutte le occorrenze `dashboardUrl.pathname = "/dashboard"` → `"/cashflow"`.

Aggiungere:

```typescript
if (pathname === "/dashboard") {
  const cashflowUrl = request.nextUrl.clone();
  cashflowUrl.pathname = "/cashflow";
  cashflowUrl.search = "";
  return NextResponse.redirect(cashflowUrl);
}

if (pathname.startsWith("/users")) {
  const usersUrl = request.nextUrl.clone();
  usersUrl.pathname = "/settings/users";
  usersUrl.search = request.nextUrl.search;
  return NextResponse.redirect(usersUrl);
}

if (pathname.startsWith("/settings/users") && member.role !== "admin") {
  const categoriesUrl = request.nextUrl.clone();
  categoriesUrl.pathname = "/settings/categories";
  categoriesUrl.search = "";
  return NextResponse.redirect(categoriesUrl);
}
```

(Rimuovere il blocco vecchio `pathname.startsWith("/users")` che redirectava a dashboard.)

In `app/auth/callback/route.ts`: default `next` = `"/cashflow"`.

In `lib/auth/member.ts` `requireAdmin()`:

```typescript
redirect("/cashflow");
```

- [ ] **Step 2: Eliminare dashboard page**

```bash
rm app/(protected)/dashboard/page.tsx
```

- [ ] **Step 3: Verificare**

```bash
rg '/dashboard' --glob '!docs/superpowers/**'
```

Expected: solo docs storici o voci MANUAL_TEST da aggiornare in Task 8.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove dashboard and redirect home to cashflow"
```

---

### Task 3: Navigazione principale

**Files:**
- Modify: `components/layout/app-nav.tsx`

- [ ] **Step 1: Aggiornare navItems e logo**

```typescript
const navItems = [
  { href: "/cashflow", label: "Cashflow", adminOnly: false },
  { href: "/settings", label: "Impostazioni", adminOnly: false },
] as const;
```

Logo link: `href="/cashflow"`.

- [ ] **Step 2: Commit**

```bash
git add components/layout/app-nav.tsx
git commit -m "refactor(nav): cashflow and settings as primary nav items"
```

---

### Task 4: Layout Settings e pagina Utenti

**Files:**
- Create: `components/settings/settings-nav.tsx`
- Create: `app/(protected)/settings/layout.tsx`
- Create: `app/(protected)/settings/page.tsx`
- Create: `app/(protected)/settings/users/page.tsx`
- Modify: `app/(protected)/users/page.tsx`
- Modify: `app/actions/members.ts`

- [ ] **Step 1: `settings-nav.tsx`**

Client o server link list — esempio server:

```tsx
import Link from "next/link";
import { getCurrentMember } from "@/lib/auth/member";
import { cn } from "@/lib/utils";

const items = [
  { href: "/settings/categories", label: "Categorie", adminOnly: false },
  { href: "/settings/users", label: "Utenti", adminOnly: true },
] as const;

export async function SettingsNav({ pathname }: { pathname: string }) {
  const member = await getCurrentMember();
  const isAdmin = member?.role === "admin" && !member.disabled_at;

  return (
    <nav className="flex flex-col gap-1 sm:w-48">
      {items.map((item) => {
        if (item.adminOnly && !isAdmin) return null;
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-lg px-3 py-2 text-sm",
              active
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

Passare `pathname` dalla layout via header o usare client `usePathname()` in variante client.

- [ ] **Step 2: `settings/layout.tsx`**

```tsx
import { SettingsNav } from "@/components/settings/settings-nav";
import { headers } from "next/headers";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get("x-pathname") ?? "";
  // Alternativa semplice: SettingsNav come client con usePathname()

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 p-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Impostazioni</h1>
      <div className="flex flex-col gap-8 sm:flex-row">
        <SettingsNav pathname={pathname} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
```

**Nota implementatore:** usare `SettingsNav` client con `usePathname()` da `next/navigation` per evitare hack su headers.

- [ ] **Step 3: `settings/page.tsx`**

```tsx
import { redirect } from "next/navigation";

export default function SettingsPage() {
  redirect("/settings/categories");
}
```

- [ ] **Step 4: `settings/users/page.tsx`**

Copiare contenuto da `app/(protected)/users/page.tsx` (Card + `MembersManager`).

- [ ] **Step 5: Legacy `/users`**

```tsx
import { redirect } from "next/navigation";

export default function UsersLegacyPage() {
  redirect("/settings/users");
}
```

- [ ] **Step 6: `members.ts` revalidate**

```typescript
function revalidateUsers() {
  revalidatePath("/settings/users");
}
```

- [ ] **Step 7: Commit**

```bash
git add app/(protected)/settings components/settings app/(protected)/users/page.tsx app/actions/members.ts
git commit -m "feat(settings): add layout, sidebar nav, and move users under settings"
```

---

### Task 5: Categorie — types, queries, actions

**Files:**
- Create: `lib/categories/types.ts`
- Create: `lib/categories/queries.ts`
- Create: `app/actions/categories.ts`

- [ ] **Step 1: Types**

```typescript
export type MovementCategory = {
  id: string;
  name: string;
  created_at: string;
  movement_count?: number;
};
```

- [ ] **Step 2: `listCategoriesWithCounts` in queries.ts**

Query `movement_categories` ordered by `name`, poi conteggio movimenti per id (admin client o RPC). Per v1: due query — lista categorie + `select category_id, count` grouped su movements con admin client in server page only, oppure singola query SQL raw in action.

Esempio page-level:

```typescript
export async function listCategoriesWithCounts(): Promise<MovementCategory[]> {
  const supabase = await createClient();
  const { data: categories, error } = await supabase
    .from("movement_categories")
    .select("id, name, created_at")
    .order("name");

  if (error) throw new Error(error.message);

  // Count via admin per vedere tutti i movimenti globali
  const admin = createAdminClient();
  const counts = await Promise.all(
    (categories ?? []).map(async (cat) => {
      const { count } = await admin
        .from("movements")
        .select("id", { count: "exact", head: true })
        .eq("category_id", cat.id);
      return { id: cat.id, count: count ?? 0 };
    }),
  );
  // merge...
}
```

- [ ] **Step 3: `app/actions/categories.ts`**

```typescript
"use server";

import { requireAdmin } from "@/lib/auth/member";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type ActionResult = { ok: true } | { ok: false; error: string };

function revalidateCategoryPaths() {
  revalidatePath("/settings/categories");
  revalidatePath("/cashflow");
}

function parseName(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 100) return null;
  return trimmed;
}

export async function createCategory(name: string): Promise<ActionResult> {
  await requireAdmin();
  const parsed = parseName(name);
  if (!parsed) return { ok: false, error: "Nome non valido." };

  const admin = createAdminClient();
  const { error } = await admin.from("movement_categories").insert({ name: parsed });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Esiste già una categoria con questo nome." };
    return { ok: false, error: error.message };
  }
  revalidateCategoryPaths();
  return { ok: true };
}

export async function updateCategory(id: string, name: string): Promise<ActionResult> {
  await requireAdmin();
  // ... update by id
}

export async function deleteCategory(
  id: string,
  reassignToId: string | null,
): Promise<ActionResult> {
  await requireAdmin();
  const admin = createAdminClient();

  const { count } = await admin
    .from("movements")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);

  const usageCount = count ?? 0;

  if (usageCount > 0) {
    if (!reassignToId || reassignToId === id) {
      return { ok: false, error: "Seleziona una categoria di destinazione diversa." };
    }
    const { error: reassignError } = await admin
      .from("movements")
      .update({ category_id: reassignToId })
      .eq("category_id", id);
    if (reassignError) return { ok: false, error: reassignError.message };
  }

  const { error: deleteError } = await admin
    .from("movement_categories")
    .delete()
    .eq("id", id);

  if (deleteError) return { ok: false, error: deleteError.message };

  revalidateCategoryPaths();
  return { ok: true };
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/categories app/actions/categories.ts
git commit -m "feat(categories): add queries and admin server actions"
```

---

### Task 6: UI `CategoriesManager`

**Files:**
- Create: `components/settings/categories-manager.tsx`
- Create: `app/(protected)/settings/categories/page.tsx`

- [ ] **Step 1: Page**

```tsx
import { CategoriesManager } from "@/components/settings/categories-manager";
import { listCategoriesWithCounts } from "@/lib/categories/queries";
import { getCurrentMember } from "@/lib/auth/member";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CategoriesSettingsPage() {
  const member = await getCurrentMember();
  const canEdit = member?.role === "admin" && !member.disabled_at;
  const categories = await listCategoriesWithCounts();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Categorie</CardTitle>
        <CardDescription>
          {canEdit
            ? "Gestisci le categorie usate nei movimenti."
            : "Elenco categorie disponibili per i movimenti."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CategoriesManager categories={categories} canEdit={canEdit} />
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: `CategoriesManager`**

Pattern `MembersManager`:

- Tabella: Nome, N. movimenti
- Se `canEdit`: Aggiungi, Modifica (dialog nome), Elimina
- **Delete dialog:**
  - Se `movement_count === 0`: conferma semplice
  - Se `> 0`: Select altre categorie + messaggio conteggio; se `categories.filter(c => c.id !== deleting).length === 0` → disabilita elimina, toast errore «Crea un'altra categoria…»
  - Chiama `deleteCategory(id, reassignToId)`

- [ ] **Step 3: Commit**

```bash
git add components/settings/categories-manager.tsx app/(protected)/settings/categories/page.tsx
git commit -m "feat(settings): add categories manager UI"
```

---

### Task 7: Integrazione Cashflow

**Files:**
- Modify: `lib/cashflow/types.ts`, `lib/cashflow/queries.ts`
- Modify: `app/actions/movements.ts`
- Modify: `components/cashflow/movements-manager.tsx`
- Modify: `app/(protected)/cashflow/page.tsx`

- [ ] **Step 1: Estendere `Movement` type**

```typescript
category_id: string | null;
category_name: string | null;
```

- [ ] **Step 2: Query con join**

```typescript
.select("id, type, amount, occurred_on, description, created_at, category_id, movement_categories(name)")
```

Mapping: `category_name: row.movement_categories?.name ?? null`.

- [ ] **Step 3: Actions — `parseCategoryId`**

```typescript
function parseCategoryId(raw: string | null | undefined): string | null {
  if (!raw || raw === "none") return null;
  return raw; // validate exists in create/update
}
```

Aggiungere a `createMovement` / `updateMovement` payload `categoryId`.

- [ ] **Step 4: `MovementsManager`**

- Prop `categories: { id: string; name: string }[]`
- Select nel form con `SelectItem value="none"` → Nessuna
- Colonna tabella Categoria

- [ ] **Step 5: `cashflow/page.tsx`**

Caricare categorie con `listCategories` (senza count) e passare a manager.

- [ ] **Step 6: Commit**

```bash
git add lib/cashflow app/actions/movements.ts components/cashflow app/(protected)/cashflow/page.tsx
git commit -m "feat(cashflow): optional category on movements with list column"
```

---

### Task 8: Documentazione e verifica

**Files:**
- Modify: `docs/MANUAL_TEST.md`, `README.md`, `docs/SUPABASE_SETUP.md`

- [ ] **Step 1: Aggiornare checklist** (sezione da spec)

- [ ] **Step 2: Sostituire riferimenti `/dashboard`** con `/cashflow` in README e SUPABASE_SETUP

- [ ] **Step 3: Build**

```bash
npm run build && npm run lint
```

Expected: success, route `/settings/categories` presente, `/dashboard` assente.

- [ ] **Step 4: Commit**

```bash
git add docs README.md
git commit -m "docs: update manual tests and redirects for settings and categories"
```

---

## Spec coverage (self-review)

| Requisito spec | Task |
|----------------|------|
| Rimuovi Dashboard | 2 |
| Home → cashflow | 2 |
| Nav Cashflow + Impostazioni | 3 |
| Settings sidebar | 4 |
| Utenti sotto settings | 4 |
| Categorie globali DB | 1 |
| CRUD admin / read user | 5, 6 |
| Delete con riassegnazione | 5, 6 |
| Categoria opzionale movimenti | 7 |
| Legacy /users redirect | 2, 4 |

Nessun TBD. Progetto senza test automatizzati: verifica `npm run build` + MANUAL_TEST.
