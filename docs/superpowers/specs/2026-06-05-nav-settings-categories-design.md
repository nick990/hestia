# Design: riorganizzazione nav, Settings e categorie movimenti

**Data:** 2026-06-05  
**Stato:** approvato in brainstorming  
**Progetto:** Hestia (Next.js 16, Supabase, shadcn/ui)  
**Dipendenze:** sezione Cashflow esistente ([2026-06-04-cashflow-design.md](./2026-06-04-cashflow-design.md))

## Obiettivo

1. Eliminare la Dashboard e usare **Cashflow** come destinazione predefinita post-login.  
2. Introdurre **Impostazioni** con sotto-sezioni **Categorie** e **Utenti**.  
3. Aggiungere **categorie globali** dei movimenti, gestibili dagli admin, visibili da tutti.

## Decisioni di prodotto

| Tema | Decisione |
|------|-----------|
| Home / post-login | Redirect a `/cashflow` |
| Dashboard | Rimossa (route e riferimenti) |
| Nav principale | **Cashflow**, **Impostazioni** (logo → `/cashflow`) |
| Utenti | Spostati in `/settings/users`, solo admin |
| Categorie | Globali, elenco unico per entrate e uscite |
| Categoria su movimento | **Opzionale** |
| Settings visibilità | Tutti gli utenti autenticati |
| Categorie in Settings | Tutti **vedono**; solo admin **CRUD** |
| Elimina categoria in uso | Dialog: scegli categoria destinazione → riassegna movimenti → elimina |

## Navigazione e redirect

### Nav (`AppNav`)

| Elemento | Destinazione | Visibilità |
|----------|--------------|------------|
| Logo Hestia | `/cashflow` | Tutti |
| Cashflow | `/cashflow` | Tutti |
| Impostazioni | `/settings` | Tutti |

Rimuovere: link Dashboard, link top-level Utenti.

### Redirect da aggiornare

| Percorso / contesto | Nuovo target |
|---------------------|--------------|
| `app/page.tsx` (user autenticato) | `/cashflow` |
| `middleware`: `/`, `/login` (con sessione) | `/cashflow` |
| `auth/callback` default `next` | `/cashflow` |
| `lib/auth/member.ts` redirect non-admin | `/cashflow` |
| `middleware`: non-admin su `/users` o `/settings/users` | `/cashflow` o `/settings/categories` |
| `/users` (legacy) | redirect a `/settings/users` |

### Rimozione Dashboard

- Eliminare `app/(protected)/dashboard/page.tsx`
- Rimuovere ogni riferimento a `/dashboard` in codice, README, `MANUAL_TEST.md`, `SUPABASE_SETUP.md`

## Settings — information architecture

**Approccio:** layout a due colonne (sidebar + contenuto).

### Route

| Route | Contenuto | Accesso |
|-------|-----------|---------|
| `/settings` | Redirect | Tutti → vedi sotto |
| `/settings/categories` | Gestione/visualizzazione categorie | Tutti (CRUD solo admin) |
| `/settings/users` | `MembersManager` (come `/users` oggi) | Solo admin |

**Redirect `/settings`:**

- **Admin:** `/settings/categories` (default; ordine sidebar: Categorie, Utenti)
- **User:** `/settings/categories`

**Non-admin su `/settings/users`:** redirect a `/settings/categories`.

### Layout

- `app/(protected)/settings/layout.tsx` — shell con titolo «Impostazioni» + sidebar
- `components/settings/settings-nav.tsx` — voci **Categorie** (sempre), **Utenti** (solo se `role === 'admin'` e non disabilitato)
- Pagine figlie senza `Card` wrapper duplicato ove possibile; riusare pattern `Card` di `/users`

## Modello dati

### Tabella `public.movement_categories`

| Colonna | Tipo | Vincoli |
|---------|------|---------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `name` | `text` | NOT NULL, unique case-insensitive (`lower(trim(name))`) |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |

### Modifica `public.movements`

| Colonna | Tipo | Vincoli |
|---------|------|---------|
| `category_id` | `uuid` | NULLABLE, FK → `movement_categories(id)` **ON DELETE RESTRICT** |

La riassegnazione prima dell’eliminazione avviene in Server Action, non tramite CASCADE.

### RLS `movement_categories`

| Operazione | Chi |
|------------|-----|
| `SELECT` | `authenticated` |
| `INSERT` / `UPDATE` / `DELETE` | Solo admin attivo |

Implementazione consigliata: policy `SELECT` aperta; mutazioni tramite **Server Actions** con `requireAdmin()` (allineato a `members`), oppure policy RLS che verifica `members.role = 'admin'` per `auth.uid()`.

`movements`: nessun cambio RLS (restano personali per `user_id`); `category_id` è riferimento a catalogo globale leggibile da tutti.

## Settings › Categorie (UI)

### Lista

- Tabella: **Nome**, opzionale **N. movimenti** (conteggio)
- **Admin:** pulsante «Aggiungi categoria», modifica nome (dialog), elimina
- **User:** stessa tabella **senza** azioni di modifica/eliminazione/aggiunta

### Creazione / modifica (admin)

- Dialog: campo **Nome** (obbligatorio, max length ragionevole es. 100)
- Validazione duplicati (nome già esistente, case-insensitive)

### Eliminazione (admin)

**Caso A — nessun movimento con `category_id` = questa categoria:**

- Dialog conferma breve → `DELETE`

**Caso B — uno o più movimenti associati:**

1. Dialog titolo tipo «Elimina categoria»
2. Testo: quanti movimenti sono coinvolti (tutti gli utenti, catalogo globale)
3. **Select obbligatoria:** «Sposta i movimenti in» — elenco altre categorie (escludere quella da eliminare)
4. Se esiste **una sola** altra categoria, pre-selezionarla; se **nessun**altra categoria esiste, bloccare eliminazione con messaggio («Crea un’altra categoria prima di eliminare questa»)
5. Server Action atomica (transazione o sequenza con rollback):
   - `UPDATE movements SET category_id = $dest WHERE category_id = $source`
   - `DELETE FROM movement_categories WHERE id = $source`
6. Toast successo + `revalidatePath` su settings e cashflow

## Cashflow — integrazione categorie

### Form movimento (dialog)

- **Select** «Categoria» opzionale
- Opzione esplicita **Nessuna** / valore vuoto → `category_id` null
- Elenco ordinato per nome (solo categorie globali)

### Tabella movimenti

- Nuova colonna **Categoria** (nome categoria o «—»)
- Mantenere colonna Importo con segno/colore (entrata/uscita)

### Server / actions

- Estendere `createMovement` / `updateMovement` con `categoryId` opzionale (validare che l’id esista se fornito)
- `listMovementsForMonth`: join o query categorie per mostrare il nome

## Server Actions (nuove / spostate)

| Action | File suggerito | Note |
|--------|----------------|------|
| `listCategories` | `app/actions/categories.ts` | Tutti autenticati |
| `createCategory` | idem | `requireAdmin` |
| `updateCategory` | idem | `requireAdmin` |
| `deleteCategory` | idem | `requireAdmin` + riassegnazione |
| `countMovementsByCategory` | idem o query inline | Per UI eliminazione |

`app/actions/members.ts`: `revalidatePath("/settings/users")` (e legacy `/users` se redirect non revalida).

## Componenti (file map)

| File | Responsabilità |
|------|----------------|
| `components/settings/settings-nav.tsx` | Sidebar Settings |
| `components/settings/categories-manager.tsx` | UI categorie (props `canEdit: boolean`) |
| `app/(protected)/settings/layout.tsx` | Layout Settings |
| `app/(protected)/settings/page.tsx` | Redirect |
| `app/(protected)/settings/categories/page.tsx` | Pagina categorie |
| `app/(protected)/settings/users/page.tsx` | Pagina utenti (sposta da `/users`) |
| `app/(protected)/users/page.tsx` | Redirect a `/settings/users` |
| `supabase/migrations/..._movement_categories.sql` | Schema |

## Errori e messaggi (italiano)

- Nome categoria vuoto / duplicato
- Eliminazione senza categoria destinazione disponibile
- Categoria inesistente al salvataggio movimento
- Sessione scaduta (come oggi)

## Fuori scope

- Icone/colori categorie
- Ordinamento manuale categorie
- Filtro lista movimenti per categoria
- Profilo utente in Settings
- Categorie separate per entrata/uscita
- Categorie personali per utente

## Test manuali (da aggiungere a `docs/MANUAL_TEST.md`)

### Nav e redirect

- [ ] Login → `/cashflow` (non `/dashboard`)
- [ ] `/` con sessione → `/cashflow`
- [ ] `/dashboard` → 404 o redirect a `/cashflow`
- [ ] `/users` → `/settings/users` (admin)

### Settings

- [ ] User: nav Impostazioni → `/settings/categories`, sidebar senza Utenti
- [ ] User: visita `/settings/users` → redirect categories
- [ ] Admin: sidebar Categorie + Utenti; CRUD utenti invariato

### Categorie

- [ ] Admin crea/modifica categoria
- [ ] User vede lista, senza pulsanti modifica
- [ ] Movimento senza categoria salvato OK
- [ ] Movimento con categoria → nome in tabella cashflow
- [ ] Elimina categoria senza movimenti → OK
- [ ] Elimina categoria con movimenti → obbligo select destinazione → movimenti riassegnati

## Riferimenti codebase

- Nav: `components/layout/app-nav.tsx`
- Utenti: `app/(protected)/users/page.tsx`, `components/users/members-manager.tsx`
- Cashflow: `components/cashflow/movements-manager.tsx`, `app/actions/movements.ts`
- Auth admin: `lib/auth/member.ts` (`requireAdmin`)
