# Checklist test manuali — MVP login

Prerequisiti: `.env.local` configurato, migrazioni applicate, almeno un’email in `members`, Google OAuth attivo, hook `hook_restrict_signup_by_member_email` attivo.

## Members (utenti autorizzati)

- [ ] Inserisci la tua email Google in `members` (SQL o Table Editor).
- [ ] Verifica che dopo il login `auth_user_id` sia valorizzato e esista una riga in `profiles`.

## Login autorizzato

1. Apri `/login` in incognito.
2. Clic **Accedi con Google** con un account **presente** in `members`.
3. Atteso: redirect a `/dashboard`, email visibile nella card.
4. Apri `/` → redirect a `/dashboard`.
5. Clic **Esci** → redirect a `/login`, `/dashboard` reindirizza di nuovo a `/login`.

## Login non autorizzato

1. Usa un account Google **non** in `members` (incognito).
2. Atteso: messaggio di errore da Supabase/Google o redirect a login con errore; l’utente **non** deve comparire in Authentication → Users.

## Middleware

- [ ] Visita `/dashboard` senza sessione → redirect `/login?next=/dashboard`.
- [ ] Dopo login, visita `/login` → redirect `/dashboard`.

## Callback

- [ ] URL callback configurato: `http://localhost:3000/auth/callback` in Supabase Redirect URLs.
