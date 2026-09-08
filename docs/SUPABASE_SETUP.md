# Setup Supabase per Hestia

## 1. Progetto Supabase

Progetto cloud **hestia** (ref: `ifxgeqsdrowcbbtmjowx`, regione `eu-central-1`).

- URL: `https://ifxgeqsdrowcbbtmjowx.supabase.co`
- Le variabili sono in `.env.local` (generato in setup; non committare).

Per collegare la CLI locale: `supabase link --project-ref ifxgeqsdrowcbbtmjowx`

## 2. Modello dati utenti

| Tabella | Ruolo |
| ------- | ----- |
| `auth.users` | Autenticazione (Supabase Auth, Google OAuth) |
| `public.members` | Utenti autorizzati **prima** del primo login (email censita) |
| `public.profiles` | Dati app 1:1 con `auth.users` (creata al signup via trigger) |

Applica le migrazioni sul progetto remoto:

```bash
supabase link --project-ref ifxgeqsdrowcbbtmjowx
supabase db push
```

Oppure in locale:

```bash
supabase start
npm run db:reset
```

Il comando `db:reset` applica migrazioni, seed SQL e crea gli utenti mock (`admin@hestia.dev`, `partner@hestia.dev`) con famiglia di test.

Aggiungi un utente autorizzato:

```sql
-- Utente normale
insert into public.members (email, role)
values ('collaboratore@dominio.it', 'user')
on conflict (email) do nothing;

-- Primo amministratore
insert into public.members (email, role)
values ('tuo.nome@dominio.it', 'admin')
on conflict (email) do nothing;
```

Dopo il primo login Google, `members.auth_user_id` viene collegato automaticamente e viene creata la riga in `profiles`.

## 2b. Ruoli e gestione utenti

| Ruolo | Permessi |
| ----- | -------- |
| `admin` | Accesso a Impostazioni → Utenti: aggiunta, disabilitazione, cambio ruolo |
| `user` | Accesso all'app, nessuna gestione utenti |

Variabile server-side richiesta per le Server Actions admin:

```bash
SUPABASE_SERVICE_ROLE_KEY=...   # Dashboard → Project Settings → API → service_role
```

Aggiungila in `.env.local` (non committare). Vedi [`.env.local.example`](../.env.local.example).

Gli admin possono gestire gli utenti da **Impostazioni → Utenti** (`/settings/users`) dopo il login.

## 3. Auth Hook `before-user-created`

In [Authentication → Hooks](https://supabase.com/dashboard/project/ifxgeqsdrowcbbtmjowx/auth/hooks), abilita **Before user created** e punta alla funzione Postgres:

`public.hook_restrict_signup_by_member_email`

> **Importante:** se l’hook punta ancora a `hook_restrict_signup_by_allowed_email` (rimossa), aggiorna alla funzione sopra.

In sviluppo locale è configurato in [`supabase/config.toml`](../supabase/config.toml).

## 4. Google OAuth

### Google Cloud Console

1. **APIs & Services → Credentials → Create OAuth client ID** (Web application).
2. **Authorized redirect URIs** (obbligatorio):

   ```
   https://ifxgeqsdrowcbbtmjowx.supabase.co/auth/v1/callback
   ```

### Supabase Dashboard

1. **Authentication → Providers → Google**: abilita e incolla Client ID e Client Secret.
2. **Authentication → URL Configuration**:
   - **Site URL**: `http://localhost:3000` (dev)
   - **Redirect URLs** (aggiungi):
     - `http://localhost:3000/auth/callback`
     - `https://YOUR_PRODUCTION_DOMAIN/auth/callback` (quando deployi)

## 5. Verifica manuale

| Scenario | Risultato atteso |
| -------- | ---------------- |
| Email in `members` + login Google | Redirect a `/cashflow`, sessione attiva, riga in `profiles` |
| Email **non** in `members` + primo accesso | Errore 403, utente non creato |
| `/cashflow` senza sessione | Redirect a `/login` |
| Logout | Redirect a `/login`, cookie sessione rimossi |
| Admin visita `/settings/users` | Lista utenti, form aggiunta, azioni ruolo/disabilita |
| User visita `/settings/users` | Redirect a `/settings/categories` |
| Utente disabilitato con sessione attiva | Logout automatico, redirect `/account-disabled` |

## 6. Deploy (Vercel)

Imposta variabili **per target** (production / preview / development). Vedi sezione 7 per la matrice completa.

Produzione: `HESTIA_AUTH_MODE=oauth`, chiavi del progetto Supabase prod, Google OAuth attivo.

Preview: `HESTIA_AUTH_MODE=mock`, chiavi del progetto **staging**, `MOCK_AUTH_PASSWORD` come secret.

## 7. Ambienti (locale / preview / produzione)

| Ambiente | DB Supabase | Auth |
| -------- | ----------- | ---- |
| Locale | `supabase start` (`127.0.0.1:54321`) | Mock — lista utenti da `members` |
| Preview Vercel | Progetto **hestia-staging** (dedicato) | Mock |
| Produzione | Progetto **hestia** (`ifxgeqsdrowcbbtmjowx`) | Google OAuth |

### Variabili per target Vercel

| Variabile | Production | Preview | Development |
| --------- | ---------- | ------- | ----------- |
| `HESTIA_AUTH_MODE` | `oauth` | `mock` | `mock` |
| `MOCK_AUTH_PASSWORD` | — | secret | `dev123456` |
| `NEXT_PUBLIC_SUPABASE_URL` | prod | staging | `http://127.0.0.1:54321` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | prod | staging | da `supabase status` |
| `SUPABASE_SERVICE_ROLE_KEY` | prod | staging | da `supabase status` |

`HESTIA_AUTH_MODE` e `MOCK_AUTH_PASSWORD` sono solo server-side (mai `NEXT_PUBLIC_`).

### Setup staging (una tantum)

1. Crea progetto Supabase `hestia-staging` (regione `eu-central-1`).
2. `supabase link --project-ref <staging-ref> && supabase db push`
3. Configura hook `before-user-created` → `public.hook_restrict_signup_by_member_email` (opzionale).
4. Disabilita Google OAuth nel dashboard staging.
5. Imposta variabili preview su Vercel con le chiavi staging.
6. Esegui seed: `MOCK_AUTH_PASSWORD=... node --env-file=.env.local scripts/seed-mock-users.mjs` (con env puntato a staging).

Opzionale: abilita **Deployment Protection** sulle preview Vercel.
