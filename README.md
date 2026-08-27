# Hestia

Web app con accesso riservato via **Google OAuth** e **Supabase**. Solo gli utenti censiti in `members` possono registrarsi. **Cashflow** (`/cashflow`) è la home: ogni utente registra entrate e uscite personali con categorie globali opzionali. **Notes** (`/notes`) tiene appunti personali e di famiglia. **Impostazioni** (`/settings`) espone le categorie (tutti; CRUD solo admin) e la gestione utenti (solo admin).

## Stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS v4, shadcn/ui
- Supabase Auth + Postgres (`@supabase/ssr`)

## Avvio rapido

1. Copia le variabili d'ambiente:

   ```bash
   cp .env.local.example .env.local
   ```

2. Configura Supabase e Google OAuth — vedi [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md).

3. Avvia il dev server:

   ```bash
   npm install
   npm run dev
   ```

Apri [http://localhost:3000](http://localhost:3000): verrai reindirizzato a `/login` o `/cashflow` in base alla sessione.

## Script

| Comando | Descrizione |
| ------- | ----------- |
| `npm run dev` | Server di sviluppo |
| `npm run build` | Build di produzione |
| `npm run lint` | ESLint |

## Test manuali

Checklist in [docs/MANUAL_TEST.md](docs/MANUAL_TEST.md).

## Manuale d’uso

Guida utente (movimenti, Notes e prossime sezioni): [docs/MANUAL.md](docs/MANUAL.md).
