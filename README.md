# Hestia

Web app con accesso riservato via **Google OAuth** (produzione) o **auth mock** (locale/preview) e **Supabase**. Solo gli utenti censiti in `members` possono accedere. **Cashflow** (`/cashflow`) è la home: ogni utente registra entrate e uscite personali con categorie globali opzionali. **Notes** (`/notes`) tiene appunti personali e di famiglia. **Impostazioni** (`/settings`) espone le categorie (tutti; CRUD solo admin) e la gestione utenti (solo admin).

## Stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS v4, shadcn/ui
- Supabase Auth + Postgres (`@supabase/ssr`)

## Avvio rapido

1. Copia le variabili d'ambiente:

   ```bash
   cp .env.local.example .env.local
   ```

2. Avvia Supabase locale e reset DB con utenti mock:

   ```bash
   supabase start
   # Aggiorna .env.local con URL e keys da `supabase status`
   npm run db:reset
   ```

3. Avvia il dev server:

   ```bash
   npm install
   npm run dev
   ```

Apri [http://localhost:3000](http://localhost:3000): in mock mode `/login` mostra la lista utenti (no Google).

Per produzione e staging vedi [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md).

## Script

| Comando | Descrizione |
| ------- | ----------- |
| `npm run dev` | Server di sviluppo |
| `npm run db:reset` | Reset DB locale + seed utenti mock |
| `npm run build` | Build di produzione |
| `npm run lint` | ESLint |
| `npm test` | Vitest |

## Test manuali

Checklist in [docs/MANUAL_TEST.md](docs/MANUAL_TEST.md).

## Manuale d’uso

Guida utente: [docs/manuale/index.md](docs/manuale/index.md).
