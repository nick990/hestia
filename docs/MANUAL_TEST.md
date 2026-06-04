# Checklist test manuali — MVP login

Prerequisiti: `.env.local` configurato, migrazioni applicate, almeno un’email in `allowed_emails`, Google OAuth attivo.

## Allowlist

- [ ] Inserisci la tua email Google in `allowed_emails` (SQL o Table Editor).
- [ ] Rimuovi o ignora il placeholder `your.email@example.com` se non lo usi.

## Login autorizzato

1. Apri `/login` in incognito.
2. Clic **Accedi con Google** con un account **presente** in `allowed_emails`.
3. Atteso: redirect a `/dashboard`, email visibile nella card.
4. Apri `/` → redirect a `/dashboard`.
5. Clic **Esci** → redirect a `/login`, `/dashboard` reindirizza di nuovo a `/login`.

## Login non autorizzato

1. Usa un account Google **non** in `allowed_emails` (incognito).
2. Atteso: messaggio di errore da Supabase/Google o redirect a login con errore; l’utente **non** deve comparire in Authentication → Users.

## Middleware

- [ ] Visita `/dashboard` senza sessione → redirect `/login?next=/dashboard`.
- [ ] Dopo login, visita `/login` → redirect `/dashboard`.

## Callback

- [ ] URL callback configurato: `http://localhost:3000/auth/callback` in Supabase Redirect URLs.
