# Design: assegnatario movimenti e filtri cashflow

**Data:** 2026-08-24  
**Stato:** approvato in brainstorming  
**Progetto:** Hestia (Next.js 16, Supabase, shadcn/ui)  
**Sostituisce / estende:** `2026-06-05-families-design.md`, `2026-06-06-movement-ownership-naming-design.md`, `2026-06-05-family-share-quota-design.md`, `2026-06-06-family-personal-view-design.md`

## Obiettivo

Ristrutturare il modello movimenti separando **chi inserisce** da **a chi/conto di chi** è assegnato il movimento, e sostituire il selettore a tre vie (Tutti / Famiglia / Privati) con **filtri indipendenti per Entrate e Uscite** (Famiglia + un flag per membro).

Scenario: coppia/coinquilini — spese di casa prevalentemente di famiglia; entrate prevalentemente personali; alcuni movimenti personali possono essere **privati** (visibili solo all'assegnatario).

Importi **reali** nel database. Nessuna quota ÷ N (feature rimossa).

## Requisiti funzionali

| ID | Requisito |
|----|-----------|
| R1 | Ogni movimento ha un **inseritore** (`created_by`) distinto dall'**assegnatario** |
| R2 | Assegnatario = **famiglia** oppure **membro** della famiglia |
| R3 | Movimento personale (`assignee_kind=member`) può essere **privato** (`is_private=true`) |
| R4 | Flag privato settabile solo se assegnatario = utente loggato (create e edit) |
| R5 | **Uscite:** default assegnatario famiglia; toggle off → personale con selettore membro (default self) |
| R6 | **Entrate:** default personale self; toggle «Di famiglia» off by default |
| R7 | Personale non privato assegnato ad altro membro: visibile a **tutta la famiglia** quando il filtro include quel membro |
| R8 | Personale privato: visibile **solo all'assegnatario** (RLS + filtro «Mostra privati») |
| R9 | Edit/delete: famiglia + personale non privato → **qualsiasi membro**; privato → **solo assegnatario** |
| R10 | Filtri Entrate/Uscite indipendenti: Famiglia + checkbox per membro; default **tutti selezionati** |
| R11 | Zero checkbox selezionate per un tipo → **nessun movimento** di quel tipo in lista/totali |
| R12 | Filtro membro = self → sotto-checkbox **«Mostra privati»** (default ON) |
| R13 | Lista: colonne **Inserito da** e **Assegnatario** |
| R14 | Utente senza famiglia: solo personale self; toggle famiglia assente; **filtri nascosti** |
| R15 | Periodo in URL; filtri assegnatario in **localStorage** |
| R16 | Totali periodo, riepilogo annuale e Sankey rispettano gli stessi filtri della tabella |
| R17 | Rimozione: param URL `view`, `share`, toggle quota, `CashflowView`, `lib/cashflow/share.ts` |

## Fuori scope

- Split expense / chi deve a chi (Splitwise)
- Quota famiglia ÷ N (rimossa, non sostituita)
- Inviti self-service
- Più famiglie per utente
- Categorie per famiglia
- Ruoli dentro famiglia
- Movimenti ricorrenti, multi-valuta, allegati

## Decisioni (brainstorming)

| Domanda | Decisione |
|---------|-----------|
| Modello dati | **Approccio 1** — `assignee_kind` + `assignee_user_id` + `is_private`; drop `scope`/`family_id` |
| Visibilità personale non privato ad altri | Tutta la famiglia (filtro membro) |
| Entrate di famiglia | Sì, toggle come uscite (default off) |
| Permessi edit/delete | Famiglia + non privato → tutti; privato → solo assegnatario |
| Quota ÷ N | **Rimossa** |
| Senza famiglia | Solo personale self; filtri nascosti |
| Zero filtri per tipo | Nessuna riga di quel tipo |
| Persistenza filtri | Ibrido: periodo URL, filtri localStorage |
| Colonne lista | Inserito da + Assegnatario |

## Modello dati

### Modifica `movements`

| Colonna | Tipo | Note |
|---------|------|------|
| `created_by` | uuid FK → auth.users | Rinomina da `user_id`; chi ha inserito |
| `assignee_kind` | text NOT NULL | CHECK (`family`, `member`) |
| `assignee_user_id` | uuid NULL FK → auth.users | Obbligatorio se `member`; NULL se `family` |
| `is_private` | boolean NOT NULL | default `false` |

**Rimossi:** `scope`, `family_id`

**Vincoli**

```sql
-- Consistenza assegnatario
(assignee_kind = 'family' AND assignee_user_id IS NULL AND is_private = false)
OR (assignee_kind = 'member' AND assignee_user_id IS NOT NULL)

-- is_private implica member
is_private = false OR assignee_kind = 'member'
```

**Indici consigliati**

- `(assignee_kind, occurred_on DESC)` WHERE `assignee_kind = 'family'`
- `(assignee_user_id, occurred_on DESC)` WHERE `assignee_kind = 'member'`
- `(created_by, occurred_on DESC)` (esistente, rinominato)

### Migrazione dati

| Vecchio | Nuovo |
|---------|-------|
| `scope = 'family'` | `assignee_kind = 'family'`, `assignee_user_id = NULL`, `is_private = false` |
| `scope = 'private'` | `assignee_kind = 'member'`, `assignee_user_id = user_id`, `is_private = true` |

`user_id` → `created_by` (stesso valore).

> Nota: i movimenti `private` legacy erano visibili solo all'autore. La migrazione preserva questo con `is_private = true`.

### Validazione assegnatario membro

`assignee_user_id` deve appartenere alla **stessa famiglia** di `created_by` al momento dell'insert/update. Enforcement: Server Action + check/trigger DB opzionale.

## RLS e sicurezza

Helper esistente riutilizzabile: `current_user_family_id()`.

Nuovo helper consigliato:

```sql
create function public.users_share_family(a uuid, b uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.family_members fm1
    join public.family_members fm2 on fm1.family_id = fm2.family_id
    where fm1.user_id = a and fm2.user_id = b
  );
$$;
```

### SELECT

Movimento visibile se:

| Condizione | Visibile |
|------------|----------|
| `assignee_kind = 'family'` AND viewer ∈ famiglia di `current_user_family_id()` | Sì |
| `assignee_kind = 'member'` AND `is_private = false` AND `users_share_family(viewer, assignee_user_id)` | Sì |
| `assignee_kind = 'member'` AND `is_private = true` AND `assignee_user_id = auth.uid()` | Sì |
| Viewer senza famiglia | Solo `member` + `assignee_user_id = auth.uid()` |

### INSERT

- `created_by = auth.uid()`
- Se `family`: viewer in famiglia
- Se `member`: `users_share_family(auth.uid(), assignee_user_id)` (o self se senza famiglia)
- `is_private = true` solo se `assignee_user_id = auth.uid()`

### UPDATE / DELETE

| Tipo | USING (chi può toccare) |
|------|-------------------------|
| `family` | Membro stessa famiglia |
| `member`, `is_private = false` | Membro stessa famiglia di assignee |
| `member`, `is_private = true` | Solo `assignee_user_id = auth.uid()` |

**WITH CHECK** su update: stesse regole insert per `assignee_kind`, `assignee_user_id`, `is_private`; `created_by` immutabile.

### Server Actions — regole applicative

- `isPrivate` ignorato/forzato false se assegnatario ≠ self
- Cambio assegnatario → se nuovo ≠ self, `is_private` → false
- Solo assegnatario (se privato) o qualsiasi membro (se non privato/family) possono salvare — RLS è source of truth; action restituisce errore leggibile se negato

## UI — Form inserimento/modifica

### Uscite (default: famiglia)

1. Toggle **«Di famiglia»** — ON default (se in famiglia)
2. OFF → select **Assegnatario** (lista membri; default utente loggato)
3. Se assegnatario = self → checkbox **«Privato»** (default OFF)
4. Se assegnatario ≠ self → nessun checkbox privato

### Entrate (default: personale self)

1. Toggle **«Di famiglia»** — OFF default
2. OFF → select assegnatario (default self)
3. ON → `assignee_kind = family`
4. Regole privato identiche alle uscite

### Senza famiglia

- Nessun toggle famiglia
- Sempre `member` + self
- Checkbox privato disponibile

### Modifica

- Stessi campi del create
- Checkbox privato disabled se assegnatario ≠ self (con messaggio esplicativo)

### Payload Server Action

```typescript
{
  type: "income" | "expense";
  amount: string;
  occurredOn: string;
  description: string;
  categoryId?: string | null;
  isFamily: boolean;           // true → assignee_kind=family
  assigneeUserId?: string;     // richiesto se !isFamily
  isPrivate?: boolean;         // solo se assigneeUserId === currentUser
}
```

## UI — Filtri visualizzazione

Sostituisce `ViewFilter` (segment Tutti/Privati/Famiglia) e toggle quota.

### Layout

Pannello **Filtri** (popover o sezione collapsible) con due blocchi:

**Entrate**
- ☐ Famiglia
- ☐ [Nome membro 1]
- ☐ [Nome membro 2]
- …
- Se self selezionato: ☐ **Mostra privati** (default ON)

**Uscite**
- Stessa struttura, indipendente da Entrate

### Logica filtro (per movimento)

Un movimento `type = income` compare se **almeno una** condizione è vera tra i filtri Entrate attivi:

| Movimento | Filtro che lo include |
|-----------|----------------------|
| `assignee_kind = family` | Famiglia ON |
| `assignee_kind = member`, assignee = X | Checkbox membro X ON |
| `is_private = true`, assignee = viewer | Membro self ON **e** «Mostra privati» ON |

Stessa logica per `expense` con filtri Uscite.

**OR** tra Famiglia e membri; **AND** tra membro self e «Mostra privati» per i privati.

**Zero selezioni** per Entrate → nessuna entrata in lista/totali/Sankey. Idem Uscite.

### Default

Tutti i checkbox ON (Famiglia + ogni membro); «Mostra privati» ON per self.

### Persistenza — localStorage

Chiave: `hestia:cashflow:filters:v1`

```typescript
type AssigneeFiltersState = {
  income: {
    family: boolean;
    members: Record<string, boolean>; // userId → selected
    showPrivate: boolean;               // rilevante solo per current user
  };
  expense: {
    family: boolean;
    members: Record<string, boolean>;
    showPrivate: boolean;
  };
};
```

- Assente o invalido → default tutti ON
- Nuovo membro in famiglia non presente in `members` → default ON al load
- UUID orfani in `members` → ignorati

### Periodo

Resta in URL: `from`, `to`, `year` (pattern esistente in `lib/cashflow/date-range.ts`).

### Senza famiglia

Pannello filtri **non renderizzato**. Query: tutti i movimenti visibili via RLS (solo propri).

## UI — Lista e aggregati

### Tabella movimenti

Colonne (ordine indicativo):

1. Data
2. Tipo (Entrata/Uscita)
3. Importo
4. Categoria
5. Descrizione
6. **Assegnatario** — «Famiglia» o nome membro
7. **Inserito da** — nome/email da `profiles`
8. Badge **Privato** se `is_private` (discreto)
9. Azioni (modifica/elimina)

### Totali e Sankey

- `PeriodSummaryCards`, totali colonna tabella, `getYearMonthlySummaries`, Sankey: stesso subset della tabella dopo filtri
- Implementazione: funzione condivisa `applyAssigneeFilters(movements, filters, currentUserId)` in `lib/cashflow/assignee-filters.ts`
- Query server: caricare movimenti nel range via RLS; filtro assignee client-side (volume domestico basso) **oppure** filtro server se preferibile — preferire funzione condivisa testata per coerenza

## Architettura applicativa

### File nuovi

| File | Responsabilità |
|------|----------------|
| `supabase/migrations/..._movement_assignee.sql` | Schema, migrazione, RLS |
| `lib/cashflow/assignee-filters.ts` | Tipi filtro, parse/persist localStorage, `applyAssigneeFilters`, `movementMatchesFilter` |
| `components/cashflow/assignee-filter-panel.tsx` | UI filtri Entrate/Uscite |

### File modificati

| File | Modifica |
|------|----------|
| `lib/cashflow/types.ts` | Nuovi campi movimento; rimuovere `MovementScope` |
| `app/actions/movements.ts` | Payload assignee; validazione privato |
| `lib/cashflow/queries.ts` | Rimuovere `applyViewFilter`; map `created_by`, assignee names |
| `components/cashflow/movement-form-dialog.tsx` | Toggle famiglia, select assegnatario, privato |
| `components/cashflow/movements-manager.tsx` | Integrazione filtri |
| `components/cashflow/movements-table-columns.tsx` | Colonne Inserito da / Assegnatario |
| `components/cashflow/date-range-filter.tsx` | Rimuovere prop `view`/`share` |
| `components/home/mobile-home.tsx` | Stessi filtri localStorage |
| `app/(protected)/cashflow/page.tsx` | Rimuovere parse `view`/`share`; passare family members |

### File rimossi / deprecati

| File | Motivo |
|------|--------|
| `lib/cashflow/view.ts` | Sostituito da assignee-filters |
| `lib/cashflow/share.ts` | Quota rimossa |
| `components/cashflow/view-filter.tsx` | Sostituito da assignee-filter-panel |
| `lib/cashflow/movement-visibility.ts` | Rivedere: regole privato/assignee cambiano |
| Test `view.test.ts`, `share.test.ts` | Sostituire con `assignee-filters.test.ts` |

## Comportamenti edge

| Scenario | Comportamento |
|----------|---------------|
| Nic inserisce uscita personale a Sara, non privata | Tutti vedono se filtro Uscite include Sara |
| Nic inserisce uscita privata a sé | Solo Nic; altri non vedono nemmeno con filtri |
| Membro rimosso da famiglia | Non vede più movimenti family; movimenti assegnati a lui restano in famiglia |
| Assegnatario membro uscito dalla famiglia | Movimenti storici: definire — **v1:** movimenti restano; RLS nega SELECT al ex-membro; assignee_user_id non validato retroattivamente |
| Tutti filtri OFF per Uscite | Nessuna uscita in UI; entrate indipendenti |
| localStorage corrotto | Fallback default tutti ON |
| URL `?view=family` legacy | Ignorato (param rimosso) |
| Sankey con filtri parziali | Solo movimenti filtrati |

## Errori e messaggi

| Caso | Messaggio (IT) |
|------|----------------|
| Assegnatario non in famiglia | «Assegnatario non valido.» |
| Privato con assegnatario altri | Ignorato server-side (forza false) |
| Edit privato altrui | RLS / «Non puoi modificare questo movimento.» |
| Senza famiglia + isFamily true | Impossibile da UI; server rifiuta |

## Test manuali

1. Uscita famiglia default → visibile con filtro Famiglia ON; assegnatario «Famiglia»
2. Uscita personale a Sara → visibile a Nic con filtro Sara ON
3. Uscita privata Nic → solo Nic; altri con filtro Nic ON ma «Mostra privati» OFF → nascosta
4. Entrate famiglia toggle ON → filtro Entrate Famiglia
5. Entrate default personale self → filtro membro self
6. Edit movimento family da altro membro → OK
7. Edit movimento privato altrui → negato
8. Deseleziona tutte Uscite → lista solo entrate; totali coerenti
9. localStorage persiste refresh; cambio periodo mantiene filtri
10. Utente senza famiglia → no filtri; solo movimenti propri
11. Colonne Inserito da / Assegnatario corrette
12. Sankey allineato ai filtri
13. Nessun toggle quota in UI

## Riferimenti

- Spec famiglie (pre-assignee): `2026-06-05-families-design.md`
- Spec quota (rimossa): `2026-06-05-family-share-quota-design.md`
- Migration attuale: `supabase/migrations/20250606120000_movement_scope_private.sql`
- PRODUCT.md — principio «Trasparenza condivisa»
