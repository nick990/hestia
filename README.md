# Hestia

Web app con accesso riservato via **Google OAuth** (produzione) o **auth mock** (locale/preview) e **Supabase**. Solo gli utenti censiti in `members` possono accedere. **Cashflow** (`/cashflow`) è la home: ogni utente registra entrate e uscite personali con categorie globali opzionali. **Notes** (`/notes`) tiene appunti personali e di famiglia. **Impostazioni** (`/settings`) espone le categorie (tutti; CRUD solo admin) e la gestione utenti (solo admin).

## Stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS v4, shadcn/ui
- Supabase Auth + Postgres (`@supabase/ssr`)

## Database

Due progetti Supabase:

| Progetto | Uso |
| -------- | --- |
| **hestia-staging** | `npm run dev` locale + preview Vercel |
| **hestia** | produzione Vercel |

## Avvio rapido

1. Copia e configura le variabili d'ambiente:

   ```bash
   cp .env.local.example .env.local
   ```

   Incolla le chiavi staging da [Dashboard → API Keys](https://supabase.com/dashboard/project/vjpimclbzdcnqcwlfghg/settings/api-keys) in `.env.local`.

2. (Prima volta o reset utenti mock) Esegui il seed:

   ```bash
   npm run seed:dev
   ```

3. Avvia il dev server:

   ```bash
   npm install
   npm run dev
   ```

Apri [http://localhost:3000](http://localhost:3000): `/login` mostra la lista utenti mock (no Google).

Setup completo: [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md).

## Script

| Comando | Descrizione |
| ------- | ----------- |
| `npm run dev` | Server di sviluppo (DB staging) |
| `npm run seed:dev` | Ricrea utenti mock su staging |
| `npm run build` | Build di produzione |
| `npm run lint` | ESLint |
| `npm test` | Vitest |

`npm run db:reset` resta disponibile solo se usi Supabase Docker locale (`supabase start`); con il setup standard non serve.

## Test manuali

Checklist in [docs/MANUAL_TEST.md](docs/MANUAL_TEST.md).

## Manuale d’uso

Guida utente: [docs/manuale/index.md](docs/manuale/index.md).
