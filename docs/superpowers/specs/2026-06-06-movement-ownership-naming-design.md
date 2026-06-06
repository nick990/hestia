# Cashflow — allineamento nomenclatura proprietà movimenti

**Data:** 2026-06-06  
**Stato:** Approvato  
**Estende:** `2026-06-05-families-design.md`, `2026-06-05-family-share-quota-design.md`

## Contesto

Il modello `personal` / `family` è corretto funzionalmente ma usa terminologia incoerente tra UI, codice e database («personale», «Solo miei», `mine`, `sharedWithFamily`). L'app è pensata per la gestione familiare: i movimenti sono **condivisi di default**, con opzione **privato**.

Decisioni prese in brainstorming:

- **Approccio 1 (big-bang):** rename completo in un unico passaggio; nessun alias legacy (`view=mine` non più accettato).
- Allineamento **UI + codice applicativo + database** (`personal` → `private`).
- Segment control: ordine **Tutti · Privati · Famiglia** (prima: Tutti · Famiglia · Solo miei).
- Toggle dialog: **«Privato»** invertito (default OFF = condiviso; ON = privato).
- Comportamento funzionale invariato (permessi, RLS, filtri vista, quota famiglia).

## Obiettivi

1. Terminologia coerente «privato / famiglia / tutti» ovunque (UI, TS, URL, Postgres).
2. Segment control riordinato: **Tutti · Privati · Famiglia**.
3. Badge tabella «Privato» al posto di «Personale».
4. Checkbox dialog «Privato» (default unchecked) al posto di «Condiviso con la famiglia».
5. Migration DB: `scope = 'private'` al posto di `'personal'`.
6. Nessuna retrocompatibilità URL per `view=mine` (fallback a `all`).

## Mappa nomenclatura

| Concetto | Prima | Dopo |
|----------|-------|------|
| Scope DB | `personal` | `private` |
| Scope TS | `"personal"` | `"private"` |
| Vista URL | `view=mine` | `view=private` |
| Vista TS | `"mine"` | `"private"` |
| Label vista | Solo miei | Privati |
| Ordine segment | Tutti · Famiglia · Solo miei | Tutti · Privati · Famiglia |
| Badge tabella | Personale | Privato |
| Toggle dialog | «Condiviso con la famiglia» (ON = condiviso) | «Privato» (OFF = condiviso, default OFF) |
| Payload action | `sharedWithFamily: boolean` | `isPrivate: boolean` |
| Prop badge | `showPersonalBadge` | `showPrivateBadge` |

## Requisiti

| ID | Requisito |
|----|-----------|
| R1 | `MovementScope = "private" \| "family"` |
| R2 | `CashflowView = "all" \| "private" \| "family"` |
| R3 | URL `view=private`; valore `mine` non riconosciuto → default `all` |
| R4 | Segment control: ordine Tutti, Privati, Famiglia |
| R5 | Vista `private`: solo `scope=private` e `user_id = auth.uid()` (come ex `mine`) |
| R6 | Vista `all`: privati propri + tutti i `family` della famiglia |
| R7 | Vista `family`: solo `scope=family` |
| R8 | Badge «Privato» in vista `all` su righe `scope=private` |
| R9 | Dialog (se `hasFamily`): checkbox «Privato», default unchecked; checked → `scope=private` |
| R10 | In modifica: checkbox checked se movimento `scope=private` |
| R11 | Toggle quota famiglia: visibile in `all` e `family`; nascosto in `private` |
| R12 | Quota: `scope=private` e `view=private` → importo pieno, toggle ignorato |
| R13 | Permessi RLS invariati (privato = solo autore; family = tutti i membri) |
| R14 | Utente senza famiglia: nessun segment control; solo movimenti privati |

## Database

Nuova migration (non modificare migration già applicate):

```sql
-- Rinomina scope personal → private

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
```

Aggiornare policy RLS `movements_select`, `movements_insert`, `movements_update`, `movements_delete` sostituendo `'personal'` con `'private'`.

Se esiste migration `20250605162000_movements_update_family_check.sql`, la nuova migration deve riflettere i check aggiornati con `private`.

## Codice applicativo

### Tipi e parsing

- `lib/cashflow/types.ts` — `MovementScope`
- `lib/cashflow/view.ts` — `CashflowView`, `parseCashflowViewParam`, `buildCashflowViewSearchParams`
- `lib/cashflow/share.ts` — `view !== "private"` al posto di `mine`; scope `private`

### Query e actions

- `lib/cashflow/queries.ts` — filtro `view === "private"` → `.eq("scope", "private")`
- `app/actions/movements.ts` — `resolveMovementScope(isPrivate)`: `true` → private; `false` → family; payload `isPrivate`

### UI

- `components/cashflow/view-filter.tsx` — ordine e label segment
- `components/cashflow/movements-manager.tsx` — state `isPrivate`, checkbox «Privato»
- `components/cashflow/movements-table.tsx` — `showPrivateBadge`
- `components/cashflow/movements-table-columns.tsx` — badge «Privato», check `scope === "private"`

### Test

- `lib/cashflow/view.test.ts` — `private` invece di `mine`; `mine` → default `all`
- `lib/cashflow/share.test.ts` — scope e view aggiornati
- `docs/MANUAL_TEST.md` — checklist allineata

## Comportamenti edge

| Scenario | Comportamento |
|----------|---------------|
| URL `?view=mine` | Ignorato → vista `all` |
| Bookmark vecchi | L'utente deve usare `view=private` |
| Movimenti pre-migration | Migration UPDATE li converte a `private` |
| Utente senza famiglia | Solo privati; nessun toggle nel dialog |

## Fuori scope

- Cambio permessi su movimenti family
- Cambio semantica viste (Privati ≠ «tutti i miei movimenti inclusi family»)
- Aggiornamento retroattivo delle spec storiche in `docs/superpowers/specs/`

## Test manuali

1. Segment control mostra **Tutti · Privati · Famiglia** in quell'ordine.
2. Vista Privati: solo movimenti privati propri; nessun family.
3. Vista Tutti: privati propri con badge «Privato» + tutti i family.
4. Dialog nuovo movimento: «Privato» unchecked → family; checked → private.
5. Modifica movimento private: checkbox checked.
6. Quota famiglia: attiva in Tutti/Famiglia; assente in Privati.
7. URL `?view=mine` → vista Tutti (default).
8. URL `?view=private` → vista Privati.

## Riferimenti

- Spec famiglie: `2026-06-05-families-design.md`
- Spec quota: `2026-06-05-family-share-quota-design.md`
- Migration famiglie: `supabase/migrations/20250605150000_families.sql`
