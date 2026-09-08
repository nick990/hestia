# Setup Supabase per Hestia

## 1. Progetti Supabase (due DB)

| Progetto | Ref | Uso |
| -------- | --- | --- |
| **hestia** | `ifxgeqsdrowcbbtmjowx` | **Produzione** — Google OAuth, dati reali |
| **hestia-staging** | `vjpimclbzdcnqcwlfghg` | **Dev locale + preview Vercel** — auth mock |

- Prod: `https://ifxgeqsdrowcbbtmjowx.supabase.co`
- Staging: `https://vjpimclbzdcnqcwlfghg.supabase.co`

Variabili dev in `.env.local` (vedi [`.env.local.example`](../.env.local.example)). Non committare.

Chiavi API: [Dashboard → Settings → API Keys](https://supabase.com/docs/guides/getting-started/api-keys) (non confondere con Integrations → Data API).

### Dev locale

`.env.local` punta a **staging**. Stesso DB delle preview Vercel.

```bash
cp .env.local.example .env.local
# incolla publishable/anon + secret/service_role da staging → API Keys
npm run seed:dev   # prima volta o reset utenti mock
npm run dev
```

### Migrazioni schema

Applica sul progetto giusto con la CLI:

```bash
# Produzione
supabase link --project-ref ifxgeqsdrowcbbtmjowx
supabase db push

# Staging
supabase link --project-ref vjpimclbzdcnqcwlfghg
supabase db push
```

## 2. Modello dati utenti

| Tabella | Ruolo |
| ------- | ----- |
| `auth.users` | Autenticazione (Supabase Auth) |
| `public.members` | Utenti autorizzati **prima** del primo login (email censita) |
| `public.profiles` | Dati app 1:1 con `auth.users` (creata al signup via trigger) |

Su **staging**, utenti mock seed: `admin@hestia.dev`, `partner@hestia.dev` (famiglia dev).

Su **produzione**, aggiungi utenti reali:

```sql
insert into public.members (email, role)
values ('tuo.nome@dominio.it', 'admin')
on conflict (email) do nothing;
```

Dopo il primo login Google, `members.auth_user_id` viene collegato e viene creata la riga in `profiles`.

## 2b. Ruoli e gestione utenti

| Ruolo | Permessi |
| ----- | -------- |
| `admin` | Accesso a Impostazioni → Utenti: aggiunta, disabilitazione, cambio ruolo |
| `user` | Accesso all'app, nessuna gestione utenti |

`SUPABASE_SERVICE_ROLE_KEY` è richiesta server-side per le Server Actions admin.

## 3. Auth Hook `before-user-created`

Su **produzione**: [Authentication → Hooks](https://supabase.com/dashboard/project/ifxgeqsdrowcbbtmjowx/auth/hooks) → **Before user created** → `public.hook_restrict_signup_by_member_email`.

Su **staging** (opzionale): stessa funzione su [hooks staging](https://supabase.com/dashboard/project/vjpimclbzdcnqcwlfghg/auth/hooks).

## 4. Google OAuth (solo produzione)

### Google Cloud Console

1. **APIs & Services → Credentials → Create OAuth client ID** (Web application).
2. **Authorized redirect URIs**:

   ```
   https://ifxgeqsdrowcbbtmjowx.supabase.co/auth/v1/callback
   ```

### Supabase Dashboard (progetto hestia)

1. **Authentication → Providers → Google**: abilita e incolla Client ID e Secret.
2. **Authentication → URL Configuration**:
   - **Site URL**: dominio di produzione
   - **Redirect URLs**: `https://YOUR_PRODUCTION_DOMAIN/auth/callback`

Su **staging**: Google OAuth **disabilitato** (auth mock).

## 5. Verifica manuale (produzione)

| Scenario | Risultato atteso |
| -------- | ---------------- |
| Email in `members` + login Google | Redirect a `/`, sessione attiva |
| Email **non** in `members` | Errore 403, utente non creato |
| `/cashflow` senza sessione | Redirect a `/login` |
| Admin visita `/settings/users` | Lista utenti, form aggiunta |

Checklist mock auth (locale/preview): [MANUAL_TEST.md](MANUAL_TEST.md).

## 6. Deploy (Vercel)

Variabili **per target** — vedi sezione 7.

- **Production**: `HESTIA_AUTH_MODE=oauth`, chiavi **hestia** (prod).
- **Preview**: `HESTIA_AUTH_MODE=mock`, chiavi **hestia-staging**, `MOCK_AUTH_PASSWORD`.

## 7. Matrice ambienti

| Ambiente | DB | Auth | File / target |
| -------- | --- | ---- | ------------- |
| Dev locale | hestia-staging | Mock | `.env.local` |
| Preview Vercel | hestia-staging | Mock | Vercel → Preview |
| Produzione | hestia | Google OAuth | Vercel → Production |

### Variabili Vercel

| Variabile | Production | Preview |
| --------- | ---------- | ------- |
| `HESTIA_AUTH_MODE` | `oauth` | `mock` |
| `MOCK_AUTH_PASSWORD` | — | `dev123456` (o secret) |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ifxgeqsdrowcbbtmjowx.supabase.co` | `https://vjpimclbzdcnqcwlfghg.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chiavi prod | chiavi staging |
| `SUPABASE_SERVICE_ROLE_KEY` | chiavi prod | chiavi staging |

`HESTIA_AUTH_MODE` e `MOCK_AUTH_PASSWORD` sono solo server-side (mai `NEXT_PUBLIC_`).

Opzionale: **Deployment Protection** sulle preview Vercel.

### Sync variabili Vercel da file locali

Dopo `npx vercel login` e `npx vercel link` nella root del repo:

```bash
npm run vercel:env
```

Legge `.env.local` → target **Preview**, `.env.production.local` → target **Production**. Poi redeploy.
