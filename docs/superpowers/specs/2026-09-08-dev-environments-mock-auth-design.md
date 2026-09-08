# Design: ambienti dev/preview separati e auth mock

**Data:** 2026-09-08  
**Stato:** approvato in brainstorming  
**Progetto:** Hestia (Next.js 16, Supabase, Vercel)

## Obiettivo

Isolare **locale** e **preview Vercel** dal database di produzione e sostituire Google OAuth con un login mock semplice: lista dinamica di tutti gli utenti `members` attivi, tap per entrare o switchare, senza digitare password.

Produzione resta invariata: stesso progetto Supabase attuale, solo Google OAuth.

## Requisiti funzionali

| ID | Requisito |
|----|-----------|
| R1 | Locale usa Supabase Docker (`supabase start`), mai il DB produzione |
| R2 | Preview Vercel usa un progetto Supabase **staging** dedicato, mai produzione |
| R3 | Produzione usa il progetto Supabase attuale (`ifxgeqsdrowcbbtmjowx`) con Google OAuth |
| R4 | In mock mode, `/login` mostra lista utenti da `members` (non disabilitati), ordinati per email |
| R5 | Tap su utente → login immediato, senza form password |
| R6 | Switcher utente visibile in app (solo mock mode): stessa lista, switch senza logout manuale |
| R7 | Lista utenti **dinamica** da DB — nessun bottone hardcoded su nomi/ruoli del seed |
| R8 | Utente aggiunto da Impostazioni → Utenti compare in lista mock al primo accesso (provision lazy) |
| R9 | Mock auth disabilitato se `HESTIA_AUTH_MODE !== 'mock'` o manca `MOCK_AUTH_PASSWORD` |
| R10 | Server actions mock rispondono 403 in produzione — nessun side effect |
| R11 | Seed condiviso: admin + partner in famiglia dev, password mock server-side |
| R12 | Categorie movimento restano dalle migrazioni esistenti, non duplicate in seed |

## Fuori scope

- Supabase Branching (DB ephemeral per PR)
- Google OAuth su staging
- Magic link / OTP in dev
- Bypass auth in middleware (sessioni finte)
- Password diverse per utente mock (tutti condividono `MOCK_AUTH_PASSWORD` server-side)
- Deployment Protection Vercel (consigliato ma setup manuale opzionale)
- Dati di esempio cashflow/movimenti nel seed (solo utenti + famiglia)

## Decisioni (brainstorming)

| Tema | Decisione |
|------|-----------|
| Preview DB | Progetto Supabase staging dedicato (opzione B) |
| Auth mock | `signInWithPassword` server-side con password condivisa in env |
| Utenti seed | Coppia minima: admin + partner, stessa famiglia |
| UI login | Lista dinamica cliccabile, no Google in mock mode |
| Switch utente | Login + switcher in app (barra dev discreta) |
| Lista utenti | Query `members` attivi via service role, non hardcoded |
| Provision lazy | `admin.createUser` se `auth_user_id` mancante |

## Architettura ambienti

| Ambiente | DB Supabase | `HESTIA_AUTH_MODE` | Auth UI |
|----------|-------------|--------------------|---------|
| Locale | `supabase start` (`127.0.0.1:54321`) | `mock` | Lista utenti + switcher |
| Preview Vercel | Progetto staging | `mock` | Lista utenti + switcher |
| Produzione | Progetto attuale | `oauth` | Google OAuth |

### Variabili d'ambiente (Vercel best practice: target separati)

| Variabile | Production | Preview | Development (`.env.local`) |
|-----------|------------|---------|----------------------------|
| `HESTIA_AUTH_MODE` | `oauth` | `mock` | `mock` |
| `MOCK_AUTH_PASSWORD` | — | secret | `dev123456` |
| `NEXT_PUBLIC_SUPABASE_URL` | prod | staging | `http://127.0.0.1:54321` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | prod | staging | da `supabase status` |
| `SUPABASE_SERVICE_ROLE_KEY` | prod | staging | da `supabase status` |

`HESTIA_AUTH_MODE` e `MOCK_AUTH_PASSWORD` sono **solo server-side** (mai `NEXT_PUBLIC_`).

## Auth mock

### Guardrail

```ts
// lib/auth/env.ts
function isMockAuthEnabled(): boolean {
  return (
    process.env.HESTIA_AUTH_MODE === "mock" &&
    Boolean(process.env.MOCK_AUTH_PASSWORD)
  );
}
```

Ogni server action mock verifica `isMockAuthEnabled()` all'ingresso.

### `listMockAuthCandidates()`

- Disponibile solo se mock mode attivo
- Query admin su `members`: `disabled_at IS NULL`, order by email
- Restituisce: `id`, `email`, `full_name`, `role`, `has_auth_user` (`auth_user_id != null`)

### `signInAsMember(memberId)`

1. Verifica `isMockAuthEnabled()` — altrimenti 403
2. Carica member; errore se inesistente o disabilitato
3. Se `auth_user_id` mancante → `admin.createUser({ email, password: MOCK_AUTH_PASSWORD, email_confirm: true })` (trigger `handle_new_user` collega member e crea profile)
4. Se utente esiste → `admin.updateUserById` per allineare password al valore mock (login consistente)
5. `signOut()` + `signInWithPassword(email, MOCK_AUTH_PASSWORD)`
6. Redirect a `/` o parametro `next`

La password non transita mai al client.

### UI

**`/login` (mock mode)**

- Sostituisce `GoogleSignInButton` con `MockUserPicker`
- Copy: «Scegli un utente per entrare (ambiente di sviluppo).»
- Lista vuota → messaggio «Nessun utente disponibile. Esegui il seed.»

**Switcher in app (`MockUserSwitcher`)**

- Montato in `app/(protected)/layout.tsx`, solo se mock mode
- Barra fissa in basso (sopra tab bar mobile), stile dev tool discreto
- Mostra utente corrente + elenco tutti i members attivi
- Tap → `signInAsMember` + refresh

**Logout**

- Comportamento esistente; in mock mode redirect a `/login` con picker (no Google)

## Seed e dati iniziali

### Migrazioni (già presenti)

Le categorie movimento sono in `20250605140000_seed_movement_categories.sql` — non duplicate.

### `supabase/seed.sql`

```sql
insert into public.members (email, role, full_name) values
  ('admin@hestia.dev', 'admin', 'Admin Dev'),
  ('partner@hestia.dev', 'user', 'Partner Dev')
on conflict (email) do nothing;

insert into public.families (id, name)
values ('00000000-0000-4000-8000-000000000001', 'Famiglia Dev')
on conflict do nothing;
```

`family_members` non va in seed.sql (FK su `auth.users`).

### `scripts/seed-mock-users.mjs`

Script idempotente, eseguito dopo `supabase db reset` e una tantum su staging:

1. Legge `MOCK_AUTH_PASSWORD` da env (default locale: `dev123456`)
2. Per ogni member con `auth_user_id IS NULL` → `admin.createUser`
3. Inserisce `family_members` per admin e partner nella famiglia seed (skip se già presenti)

### Script npm

```json
"db:reset": "supabase db reset && node scripts/seed-mock-users.mjs"
```

## Setup operativo (manuale)

### Supabase staging (una tantum)

1. Crea progetto `hestia-staging` (regione `eu-central-1`)
2. `supabase link --project-ref <staging-ref> && supabase db push`
3. Configura auth hook `before-user-created` → `public.hook_restrict_signup_by_member_email` (opzionale; mock auth usa admin API)
4. Disabilita Google OAuth nel dashboard staging
5. `MOCK_AUTH_PASSWORD=... node scripts/seed-mock-users.mjs`

### Vercel

Imposta variabili con target `production` / `preview` / `development` separati (vedi tabella sopra).

Opzionale: abilita **Deployment Protection** sulle preview.

### Locale

```bash
cp .env.local.example .env.local   # con HESTIA_AUTH_MODE=mock
supabase start
npm run db:reset
npm run dev
```

## File toccati

| File | Ruolo |
|------|-------|
| `lib/auth/env.ts` | `isMockAuthEnabled()` |
| `lib/auth/mock-auth.ts` | logica list + provision condivisa |
| `app/actions/mock-auth.ts` | `listMockAuthCandidates`, `signInAsMember` |
| `components/auth/mock-user-picker.tsx` | lista cliccabile su login |
| `components/auth/mock-user-switcher.tsx` | barra switch in app |
| `app/login/page.tsx` | render condizionale mock vs Google |
| `app/(protected)/layout.tsx` | monta switcher se mock |
| `scripts/seed-mock-users.mjs` | seed auth users + family_members |
| `supabase/seed.sql` | members + family |
| `.env.local.example` | nuove variabili |
| `package.json` | script `db:reset` |
| `docs/SUPABASE_SETUP.md` | sezione ambienti |
| `README.md` | flusso dev senza Google |
| `docs/MANUAL_TEST.md` | checklist mock auth |

## Error handling

| Caso | Comportamento |
|------|---------------|
| `HESTIA_AUTH_MODE=mock` senza `MOCK_AUTH_PASSWORD` | Mock disabilitato; fallback OAuth su login |
| Member disabilitato | Action rifiuta con errore |
| `signInWithPassword` fallisce | Redirect `/login?error=mock_auth_failed` |
| Action mock in produzione | 403, nessun side effect |
| Staging senza seed | Lista vuota + messaggio guida |

## Test

**Vitest**

- `isMockAuthEnabled()` con combinazioni env

**Manuale** (`docs/MANUAL_TEST.md`)

| Scenario | Risultato atteso |
|----------|------------------|
| `npm run db:reset` + dev | 2 utenti in login mock, famiglia attiva |
| Login admin → movimento family | Visibile dopo switch a partner |
| Switch utente in app | Sessione cambia senza logout |
| Admin aggiunge member → tap in picker | Utente creato e loggato |
| Preview deploy | Login mock, DB staging (non prod) |
| Produzione | Solo Google, switcher assente, mock 403 |

## Sicurezza

- Mock auth attivo solo con doppia condizione env (mode + password)
- Password mock mai esposta al client
- Staging DB isolato da produzione
- Preview URL potenzialmente pubblici: considerare Vercel Deployment Protection
- Service role key mai in `NEXT_PUBLIC_*`
