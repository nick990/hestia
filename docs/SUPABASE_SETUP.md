# Setup Supabase per Hestia

## 1. Progetto Supabase

Progetto cloud **hestia** (ref: `ifxgeqsdrowcbbtmjowx`, regione `eu-central-1`).

- URL: `https://ifxgeqsdrowcbbtmjowx.supabase.co`
- Le variabili sono in `.env.local` (generato in setup; non committare).

Per collegare la CLI locale: `supabase link --project-ref ifxgeqsdrowcbbtmjowx`

## 2. Migrazioni e allowlist

Applica le migrazioni sul progetto remoto:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Oppure in locale:

```bash
supabase start
supabase db reset
```

Aggiungi le email autorizzate (sostituisci con indirizzi reali):

```sql
insert into public.allowed_emails (email)
values ('tuo.nome@dominio.it')
on conflict do nothing;
```

La migrazione include un placeholder `your.email@example.com` — rimuovilo o sostituiscilo in produzione.

## 3. Auth Hook `before-user-created`

In **Authentication → Hooks** (Dashboard), abilita **Before user created** e punta alla funzione Postgres:

`public.hook_restrict_signup_by_allowed_email`

In sviluppo locale è già configurato in `supabase/config.toml`.

## 4. Google OAuth

### Google Cloud Console

1. **APIs & Services → Credentials → Create OAuth client ID** (Web application).
2. **Authorized redirect URIs** (obbligatorio):

   ```
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
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
| Email in `allowed_emails` + login Google | Redirect a `/dashboard`, sessione attiva |
| Email **non** in lista + primo accesso | Errore 403, utente non creato |
| `/dashboard` senza sessione | Redirect a `/login` |
| Logout | Redirect a `/login`, cookie sessione rimossi |

## 6. Deploy (Vercel)

Imposta le stesse variabili `NEXT_PUBLIC_*` su Vercel e aggiorna Site URL / Redirect URLs su Supabase con il dominio di produzione.
