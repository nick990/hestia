# Design: categoria in evidenza (tab home + budget)

**Data:** 2026-09-01  
**Stato:** approvato in brainstorming  
**Progetto:** Hestia (Next.js 16, Supabase, shadcn/ui)  
**Dipendenze:** `2026-09-01-home-dashboard-nav-design.md`, `2026-08-27-mobile-home-tabs-design.md`, categorie (`movement_categories`), famiglie (`families`, `family_members`)

## Obiettivo

Ogni **famiglia** può mettere in evidenza una categoria (con sotto-categorie) e un budget netto opzionale. In **home**, una terza tab «In evidenza» (`/?tab=evidenza`) mostra storico, totali e aggiunta movimenti nel ramo. **Nessuna** voce nel menu alto; **nessuna** route `/evidenza`.

## Requisiti funzionali

| ID | Requisito |
|----|-----------|
| R1 | Tab home **In evidenza** sempre visibile (icona ombrellone, lucide `Umbrella`) |
| R2 | URL tab: **`/?tab=evidenza`**; conserva `from`/`to` come Notes per il ritorno a Cashflow |
| R3 | **Non** esiste `/evidenza` né voce nel menu alto (`navItems`) |
| R4 | Categoria in evidenza: **per famiglia**; qualunque **membro** può impostarla o cambiarla (ultima scrittura vince) |
| R5 | Match **prefisso**: categoria `vacanze` include `vacanze`, `vacanze.hotel`, `vacanze.volo.estate`, … |
| R6 | **Totale** mostrato = **netto** storico del ramo (entrate − uscite), senza filtro temporale |
| R7 | **Budget** opzionale, confrontato sullo **stesso netto** |
| R8 | Lista movimenti: **`HomeMovements`**, tutti i movimenti del ramo visibili via RLS, ordine data discendente |
| R9 | **FAB +** e dialog come Cashflow; categoria **bloccata nel ramo** (solo radice e sotto-categorie) |
| R10 | Impostazioni in **Impostazioni → Categorie**: select categoria + budget opzionale |
| R11 | Senza famiglia: empty state «La categoria in evidenza è condivisa in famiglia» |
| R12 | Famiglia senza categoria scelta: empty state «Scegli una categoria in evidenza» + link Impostazioni |
| R13 | Etichetta tab fissa **«In evidenza»**; **nome categoria** nel contenuto pagina |
| R14 | Prefetch dati evidenza sulla page `/` quando serve (come Notes/Cashflow) |
| R15 | Documentazione e `MANUAL_TEST.md` in implementazione |

## Fuori scope

- Route `/evidenza` o redirect da essa
- Voce menu alto
- Più categorie in evidenza
- Budget con periodo o reset automatico
- Storico audit modifiche settings
- Filtri assegnatario dedicati (oltre RLS esistente)
- Admin-only per le impostazioni evidenza

## Decisioni (brainstorming)

| Tema | Decisione |
|------|-----------|
| Match | Prefisso + tutti i livelli figli |
| Totale / budget | Netto (entrate − uscite) |
| Scope settings | Per famiglia |
| Chi modifica | Tutti i membri famiglia |
| Tab se vuota | Sempre visibile + empty state |
| URL | Solo `/?tab=evidenza` (approccio A) |
| Pagina standalone | No (a differenza di `/notes`) |
| Nuovo movimento | Categoria bloccata nel ramo |
| Persistenza | Tabella `family_featured_settings` |
| Icona tab | `Umbrella` |

## Routing

| URL | Vista |
|-----|--------|
| `/` | Tab Cashflow (default) |
| `/?tab=notes` | Tab Notes |
| `/?tab=evidenza` | Tab In evidenza |
| `/?tab=evidenza&from=…&to=…` | Tab In evidenza; `from`/`to` conservati |
| `/notes`, `/cashflow` | Invariati (menu alto) |
| `/evidenza` | **Non implementato** (404) |

### Tab parsing

Estendere `lib/home/tab.ts`:

- `HomeTab = "cashflow" | "notes" | "evidenza"`
- `parseHomeTab`: `evidenza` → evidenza; sconosciuto → cashflow
- `buildHomeHref`: imposta `tab=evidenza` quando richiesto

## Modello dati

### Tabella `family_featured_settings`

```sql
create table public.family_featured_settings (
  family_id uuid primary key references public.families (id) on delete cascade,
  category_name text,  -- null = non configurato
  budget numeric,      -- null = nessun budget; obiettivo netto EUR
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
```

- `category_name` nullable: famiglia senza scelta → empty state
- Validazione app: se non null, deve esistere una categoria con quel nome (o materializzare coerenza con `movement_categories`)
- RLS: SELECT/INSERT/UPDATE per utenti con `family_members.family_id = family_featured_settings.family_id`

### Match categoria

Funzione pura `matchesCategoryPrefix(movementCategoryName, prefix)`:

- `true` se `name === prefix` o `name.startsWith(prefix + ".")`
- Test unitari obbligatori

## Query movimenti

`listMovementsForCategoryPrefix(prefix: string): Promise<Movement[]>`

- Nessun filtro `occurred_on`
- Join `movement_categories`; filtro prefix in SQL o post-filter su name
- Ordine: `occurred_on desc`, `created_at desc`
- RLS movimenti invariata

Netto:

```typescript
sum(income amounts) - sum(expense amounts)
```

Budget UI (se `budget` non null):

- Mostra budget e scostamento `netto - budget` con copy chiaro in italiano (sopra/sotto obiettivo)

## Impostazioni UI

Blocco **Categoria in evidenza** in `components/settings/categories-manager.tsx` o componente dedicato incluso nella pagina Categorie:

- Visibile solo se utente in famiglia
- Select categoria (lista/tree esistente)
- Input budget opzionale (decimal, EUR)
- Salva → server action upsert per `family_id` corrente
- Tutti i membri famiglia (non gated su `canEdit` admin categorie)

Utente senza famiglia: testo esplicativo, nessun form.

## Home tab UI

### `HomeTabs`

Terza voce:

- id: `evidenza`
- label: `In evidenza`
- icon: `UmbrellaIcon`
- colore: tono caldo distinto (es. umber/sabbia — non verde/rosso finanziario); definire token CSS coerente con Notes tab

### `FeaturedCategoryView` (client o server+client)

**Configurato:**

1. Titolo: `category_name` (o label relativa se preferito)
2. Card netto + budget (se presente)
3. `HomeMovements` con movimenti del ramo
4. FAB + → `MovementFormDialog` con `lockedCategoryPrefix={category_name}`

**Empty states** come R11/R12.

### Form movimento

Estendere `CategoryPicker` / `MovementFormDialog`:

- Prop `lockedCategoryPrefix?: string`
- Picker mostra solo nodi selezionabili nel ramo; radice selezionabile
- Default categoria: radice in evidenza (o ultima usata nel ramo — default radice)

## Componenti e file

| File | Ruolo |
|------|--------|
| Migration SQL | `family_featured_settings` + RLS |
| `lib/categories/prefix-match.ts` | Match prefisso |
| `lib/categories/prefix-match.test.ts` | Test |
| `lib/featured/queries.ts` | Read settings per famiglia |
| `lib/featured/types.ts` | Tipi settings |
| `lib/cashflow/queries.ts` | `listMovementsForCategoryPrefix` |
| `app/actions/featured-category.ts` | Upsert settings |
| `lib/home/tab.ts` + test | Tab `evidenza` |
| `components/home/home-tabs.tsx` | Terza tab |
| `components/home/home-shell.tsx` | Gestione tab evidenza |
| `app/(protected)/page.tsx` | Fetch settings + movimenti; render vista |
| `components/featured/featured-category-view.tsx` | UI tab |
| `components/settings/featured-category-settings.tsx` | Impostazioni |
| `components/cashflow/category-picker.tsx` | `lockedCategoryPrefix` |
| `components/cashflow/movement-form-dialog.tsx` | Pass-through prop |

## Errori e edge case

- Categoria in evidenza rinominata in settings categorie → aggiornare `category_name` in cascade o invalidare (v1: **bloccare rinomina** radice se è in evidenza, o aggiornare in action rename — preferire **update cascade** in `renameCategoryPrefix` se il prefisso coincidere)
- Categoria eliminata → settings a null + empty state
- Famiglia sciolta → row cascade delete

## Test

### Unit

- `matchesCategoryPrefix`: esatti, figli, non-fratelli
- `parseHomeTab` / `buildHomeHref` con `evidenza`

### Manuale (`MANUAL_TEST.md`)

- Tab sempre visibile; `/?tab=evidenza` seleziona In evidenza
- `/evidenza` → 404
- Membro famiglia imposta `vacanze` + budget; partner vede stesso totale
- Movimento `vacanze.hotel` incluso; `casa.mutuo` escluso
- Aggiungi movimento: solo ramo `vacanze`
- Empty state senza configurazione
- `from`/`to` conservati cambiando tab

## Manuale utente

In `docs/manuale/index.md` (o sezione cashflow):

- Tab **In evidenza** in home: traccia una categoria (es. vacanze) con budget opzionale
- Si configura in **Impostazioni → Categorie**
- Non compare nel menu in alto

## Relazione con Notes

| | Notes | In evidenza |
|---|--------|-------------|
| Tab URL | `/?tab=notes` | `/?tab=evidenza` |
| Pagina menu | `/notes` | **Nessuna** |
| Menu alto | Sì | **No** |
