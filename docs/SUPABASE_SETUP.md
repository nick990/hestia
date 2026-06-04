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
supabase db reset
```

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
| `admin` | Accesso a `/users`: aggiunta, disabilitazione, cambio ruolo |
| `user` | Accesso all'app, nessuna gestione utenti |

Variabile server-side richiesta per le Server Actions admin:

```bash
SUPABASE_SERVICE_ROLE_KEY=...   # Dashboard → Project Settings → API → service_role
```

Aggiungila in `.env.local` (non committare). Vedi [`.env.local.example`](../.env.local.example).

Gli admin possono gestire gli utenti anche dall'interfaccia `/users` dopo il login.

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
| Email in `members` + login Google | Redirect a `/dashboard`, sessione attiva, riga in `profiles` |
| Email **non** in `members` + primo accesso | Errore 403, utente non creato |
| `/dashboard` senza sessione | Redirect a `/login` |
| Logout | Redirect a `/login`, cookie sessione rimossi |
| Admin visita `/users` | Lista utenti, form aggiunta, azioni ruolo/disabilita |
| User visita `/users` | Redirect a `/dashboard` |
| Utente disabilitato con sessione attiva | Logout automatico, redirect `/account-disabled` |

## 6. Deploy (Vercel)

Imposta le stesse variabili `NEXT_PUBLIC_*` su Vercel e aggiorna Site URL / Redirect URLs su Supabase con il dominio di produzione.
