# Checklist test manuali — MVP login e ruoli

Prerequisiti: `.env.local` configurato (incluso `SUPABASE_SERVICE_ROLE_KEY`), migrazioni applicate, almeno un admin in `members`, Google OAuth attivo, hook `hook_restrict_signup_by_member_email` attivo.

## Members (utenti autorizzati)

- [ ] Inserisci la tua email Google in `members` con ruolo `admin` (SQL o `/users`).
- [ ] Verifica che dopo il login `auth_user_id` sia valorizzato e esista una riga in `profiles`.

## Login autorizzato

1. Apri `/login` in incognito.
2. Clic **Accedi con Google** con un account **presente** in `members`.
3. Atteso: redirect a `/dashboard`, email visibile nella card.
4. Apri `/` → redirect a `/dashboard`.
5. Clic **Esci** → redirect a `/login`, `/dashboard` reindirizza di nuovo a `/login`.

## Login non autorizzato

1. Usa un account Google **non** in `members` (incognito).
2. Atteso: messaggio di errore da Supabase/Google o redirect a login con errore; l'utente **non** deve comparire in Authentication → Users.

## Middleware

- [ ] Visita `/dashboard` senza sessione → redirect `/login?next=/dashboard`.
- [ ] Dopo login, visita `/login` → redirect `/dashboard`.

## Ruoli admin / user

- [ ] Admin vede link **Utenti** in nav e accede a `/users`.
- [ ] User (non admin) **non** vede link Utenti; visita `/users` → redirect `/dashboard`.
- [ ] Admin aggiunge email + ruolo da `/users` → compare in lista come "In attesa".
- [ ] Admin promuove/degrada ruolo → badge aggiornato.
- [ ] Admin disabilita utente → stato "Disabilitato"; utente sloggato al prossimo request → `/account-disabled`.
- [ ] Admin riattiva utente disabilitato → può rifare login.
- [ ] Impossibile disabilitare o degradare l'**ultimo admin** rimasto.

## Hard delete (admin)

- [ ] Admin clic **Elimina definitivamente** → compare dialog di conferma con email utente.
- [ ] Annulla nel dialog → nessuna modifica.
- [ ] Elimina utente **in attesa** → sparisce da lista; stessa email ri-aggiungibile.
- [ ] Elimina utente **registrato** → sparisce da `members`, `profiles` e Authentication → Users.
- [ ] Impossibile eliminare l'**ultimo admin** rimasto (anche se disabilitato).
- [ ] Utente eliminato con sessione attiva → al prossimo request logout e redirect `/account-disabled`.

## Callback

- [ ] URL callback configurato: `http://localhost:3000/auth/callback` in Supabase Redirect URLs.
