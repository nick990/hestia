# Design: famiglie e movimenti personali/condivisi

**Data:** 2026-06-05  
**Stato:** approvato in brainstorming  
**Progetto:** Hestia (Next.js 16, Supabase, shadcn/ui)  
**Estende:** `2026-06-04-cashflow-design.md`

## Obiettivo

Consentire a più utenti di appartenere a una **famiglia** e condividere i movimenti cashflow, mantenendo movimenti **solo personali** (privati). Scenario principale: **coppia/coinquilini** — la maggior parte dei movimenti è condivisa; alcuni restano privati.

Il registro usa **importi reali**. Nessuna ripartizione per numero di membri (÷ N) né quote personali stimate: fuori scope per questa app.

## Requisiti funzionali

| ID | Requisito |
|----|-----------|
| R1 | Un utente appartiene ad **al massimo una** famiglia |
| R2 | Una famiglia ha **uno o più** utenti |
| R3 | Ogni movimento ha `scope`: `personal` (privato) o `family` (condiviso) |
| R4 | Movimento `personal`: visibile e modificabile **solo** dall'autore |
| R5 | Movimento `family`: visibile a tutti i membri; **modificabile/eliminabile da qualsiasi membro** |
| R6 | Default nuovo movimento (se utente in famiglia): **condiviso** (toggle attivo) |
| R7 | Vista cashflow default: **Tutti** (`view=all`) |
| R8 | Admin crea famiglia e assegna membri da Impostazioni |
| R9 | Utente senza famiglia: solo movimenti personali; nessun toggle condiviso |
| R10 | Totali periodo (e totali filtrati tabella) calcolati sulla **vista selezionata** |
| R11 | Migrazione: movimenti esistenti → `scope=personal`, comportamento invariato |

## Fuori scope (v1 e oltre per questa app)

- Ripartizione movimenti famiglia ÷ N o «quota personale»
- Split expense / chi deve a chi (modello Splitwise)
- Inviti self-service / link invito
- Più famiglie per utente
- Categorie per famiglia (restano globali admin)
- Ruoli dentro famiglia (admin famiglia vs membro)

## Decisioni (brainstorming)

| Domanda | Decisione |
|---------|-----------|
| Scenario | **A** — coppia/coinquilini, prevalentemente condiviso |
| Pattern dati | Scope sul movimento (`personal` \| `family`) |
| Default nuovo movimento | Condiviso con famiglia |
| Formazione famiglia | **A** — admin crea e assegna da Impostazioni |
| Modifica movimenti condivisi | **B** — qualsiasi membro della famiglia |
| Vista cashflow default | **B** — Tutti |
| Ripartizione ÷ N | **No** — non ha senso in questa app |
| Vista «Solo miei» | **Solo** movimenti `scope=personal` dell'utente corrente |

## Modello dati

### Tabelle nuove

**`families`**

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | `uuid` PK | |
| `name` | `text` NOT NULL | es. «Rossi» |
| `created_at` | `timestamptz` | |

**`family_members`**

| Colonna | Tipo | Note |
|---------|------|------|
| `family_id` | `uuid` FK → `families` | |
| `user_id` | `uuid` FK → `auth.users` | **UNIQUE** — un utente, una famiglia |
| `joined_at` | `timestamptz` | |

### Modifica `movements`

| Colonna | Tipo | Note |
|---------|------|------|
| `scope` | `text` NOT NULL | CHECK (`personal`, `family`); default `family` se in famiglia al insert, altrimenti `personal` |
| `family_id` | `uuid` NULL FK → `families` | Obbligatorio se `scope=family`; NULL se `personal` |

- `user_id` = **autore** (chi ha inserito il movimento)
- Indice consigliato: `(family_id, occurred_on DESC)` WHERE `scope = 'family'`

### Migrazione dati esistenti

```sql
-- Tutti i movimenti attuali restano privati
UPDATE movements SET scope = 'personal', family_id = NULL;
```

Comportamento identico a oggi finché l'admin non forma una famiglia e gli utenti non iniziano a creare movimenti condivisi.

### Categorie

`movement_categories` restano **globali** (admin). Nessun `family_id` in v1.

## RLS e sicurezza

Helper consigliato:

```sql
create function public.current_user_family_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select family_id from public.family_members where user_id = auth.uid() limit 1;
$$;
```

| Operazione | `scope = personal` | `scope = family` |
|------------|-------------------|------------------|
| SELECT | `user_id = auth.uid()` | `family_id = current_user_family_id()` |
| INSERT | `user_id = auth.uid()`, `family_id` NULL | `user_id = auth.uid()`, `family_id = current_user_family_id()` |
| UPDATE | Solo autore | Qualsiasi membro della stessa famiglia |
| DELETE | Solo autore | Qualsiasi membro della stessa famiglia |

Vincoli insert (check o trigger):

- `scope = personal` → `family_id IS NULL`
- `scope = family` → `family_id IS NOT NULL` e coincide con famiglia dell'utente
- Utente senza famiglia → solo insert `personal`

**`families` / `family_members`:** SELECT per membri della propria famiglia; INSERT/UPDATE/DELETE solo admin (service role o policy admin — allineato a gestione `members`).

## Viste cashflow

Segmented control o tab sopra la griglia. Query param: `view=all|family|mine` (default `all`).

| Vista | Label UI | Righe incluse | Totali |
|-------|----------|---------------|--------|
| `all` | **Tutti** | Personali **miei** + tutti i movimenti `family` della famiglia | Somma importi reali |
| `family` | **Famiglia** | Solo `scope = family` della famiglia | Somma importi reali |
| `mine` | **Solo miei** | Solo `scope = personal` **e** `user_id = auth.uid()` | Somma importi reali |

Note:

- In **Tutti** non compaiono i personali degli altri membri (sono privati).
- In **Solo miei** non compaiono movimenti famiglia, **nemmeno** quelli inseriti da me.
- Nessuna divisione per numero di membri in nessuna vista.

Reset `view` al cambio periodo `from`/`to`: opzionale — default resta `all`; non persistere in URL obbligatorio oltre al param (coerente con sort/filtri colonna in stato locale).

## UI Cashflow

### Dialog movimento

- Toggle **«Condiviso con la famiglia»**
  - Visibile solo se l'utente è in una famiglia
  - Default **ON**
  - OFF → `scope=personal`
- In modifica: stesso toggle; passaggio personal ↔ family consentito se utente in famiglia

### Tabella

- Colonna opzionale **«Inserito da»** in viste `all` e `family` (nome da `profiles.full_name` o email)
- Badge o icona discreta su riga `personal` in vista `all` (opzionale v1)

### Totali periodo

I box Entrate/Uscite/Netto (`PeriodSummaryCards`) usano aggregati sulla vista corrente, non più solo `getRangeSummary` server su tutti i movimenti dell'utente — le query server devono filtrare per vista (o aggregare client-side sul subset già caricato; preferire **query server** per correttezza RLS e volume).

## Admin — Impostazioni

Nuova sezione **Famiglie** (`/settings/families`), solo admin:

- Elenco famiglie
- Crea famiglia (nome)
- Assegna/rimuovi membri (da utenti con `auth_user_id` valorizzato in `members`)
- Vincolo UI: un utente non può essere in due famiglie

**Rimozione membro dalla famiglia:**

- Non elimina movimenti `family` già registrati (restano visibili alla famiglia)
- L'utente rimosso non vede più movimenti famiglia; crea solo `personal` finché non rientra in una famiglia

## Architettura applicativa

### Query (`lib/cashflow/queries.ts`)

Sostituire/estendere `listMovementsForRange(from, to, view)` con filtri RLS-aware:

| `view` | Filtro SQL (oltre a `from`/`to`) |
|--------|--------------------------------|
| `all` | `(scope = 'family' AND family_id = current) OR (scope = 'personal' AND user_id = auth.uid())` |
| `family` | `scope = 'family' AND family_id = current` |
| `mine` | `scope = 'personal' AND user_id = auth.uid()` |

`getRangeSummary(from, to, view)` — stessa logica di filtro.

### Server Actions (`app/actions/movements.ts`)

- Payload: `sharedWithFamily: boolean` (o `scope` esplicito)
- Validazione: `sharedWithFamily=true` solo se utente in famiglia; imposta `family_id`

### File previsti

| File | Responsabilità |
|------|----------------|
| `supabase/migrations/..._families.sql` | Tabelle, colonne, RLS, helper |
| `lib/families/` | Tipi, query famiglia utente corrente |
| `app/actions/families.ts` | CRUD admin famiglie/membri |
| `app/(protected)/settings/families/` | UI admin |
| `components/cashflow/view-filter.tsx` | Tab Tutti / Famiglia / Solo miei |
| `components/cashflow/movements-manager.tsx` | Integrazione vista + toggle dialog |
| `lib/cashflow/queries.ts` | Filtri per vista |

## Comportamenti edge

| Scenario | Comportamento |
|----------|---------------|
| Utente senza famiglia | Solo personali; vista unica o tab disabilitati |
| Un solo membro in famiglia | Movimenti family consentiti (coppia in attesa del secondo) |
| Membro rimosso | Perde accesso family; movimenti family creati prima restano in famiglia |
| Ultimo admin rimosso da famiglia | Famiglia può restare vuota o con membri; gestione admin separata da `members` admin app |
| Movimento family, famiglia sciolta (v2) | Fuori scope v1 — non implementare delete famiglia con movimenti in v1 |

## Errori e sicurezza

- Tentativo insert `family` senza famiglia → errore server
- Tentativo read personali altrui → RLS nega
- Admin famiglie: stesso pattern service role / guard admin di `app/actions/members.ts`

## Test manuali

1. Admin crea famiglia, assegna 2 utenti
2. Utente A: movimento condiviso default → visibile a B in **Tutti** e **Famiglia**
3. Utente A: movimento personale → visibile ad A in **Tutti** e **Solo miei**; **non** visibile a B
4. B modifica/elimina movimento family di A → OK
5. **Solo miei** di A: solo personali; nessun movimento family
6. Totali in **Tutti** = somma reali (personali A + tutti family); **non** divisi per 2
7. Utente senza famiglia: comportamento identico a cashflow pre-famiglie
8. Movimenti pre-migrazione: tutti personali, invisibili agli altri

## Riferimenti

- Modello attuale movimenti: `supabase/migrations/20250604180000_movements.sql`
- Utenti admin: `app/actions/members.ts`, `docs/SUPABASE_SETUP.md`
- Spec cashflow: `2026-06-04-cashflow-design.md`
