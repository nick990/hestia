# Checklist test manuali — MVP login e ruoli

Prerequisiti: `.env.local` configurato (incluso `SUPABASE_SERVICE_ROLE_KEY`), migrazioni applicate, almeno un admin in `members`, Google OAuth attivo, hook `hook_restrict_signup_by_member_email` attivo.

## Members (utenti autorizzati)

- [ ] Inserisci la tua email Google in `members` con ruolo `admin` (SQL o Impostazioni → Utenti).
- [ ] Verifica che dopo il login `auth_user_id` sia valorizzato e esista una riga in `profiles`.

## Login autorizzato

1. Apri `/login` in incognito.
2. Clic **Accedi con Google** con un account **presente** in `members`.
3. Atteso: redirect a `/cashflow`.
4. Apri `/` → redirect a `/cashflow`.
5. Clic **Esci** → redirect a `/login`; `/cashflow` reindirizza di nuovo a `/login`.

## Login non autorizzato

1. Usa un account Google **non** in `members` (incognito).
2. Atteso: messaggio di errore da Supabase/Google o redirect a login con errore; l'utente **non** deve comparire in Authentication → Users.

## Middleware

- [ ] Visita `/cashflow` senza sessione → redirect `/login?next=/cashflow`.
- [ ] Dopo login, visita `/login` → redirect `/cashflow`.
- [ ] Visita `/dashboard` → redirect `/cashflow`.

## Nav e Impostazioni

- [ ] Nav: **Cashflow** e **Impostazioni** (nessuna Dashboard).
- [ ] User: Impostazioni → sidebar solo **Categorie**; `/settings/users` → redirect `/settings/categories`.
- [ ] Admin: sidebar **Categorie** + **Utenti**; `/users` → redirect `/settings/users`.

## Ruoli admin / user

- [ ] Admin aggiunge email + ruolo da Impostazioni → Utenti → compare in lista come "In attesa".
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

## Cashflow (movimenti personali)

- [ ] Link **Cashflow** visibile in nav per user e admin.
- [ ] Apri `/cashflow` senza query → griglia mese corrente (`from`/`to`), riepilogo anno corrente.
- [ ] Riepilogo annuale: ‹ › anno cambia solo i mesi del riepilogo; griglia invariata.
- [ ] Click su un mese nel riepilogo → `from`/`to` impostati a quel mese intero; griglia aggiornata.
- [ ] Date picker Da/A con range parziale → movimenti e totali periodo corretti; nessun mese evidenziato nel riepilogo.
- [ ] ‹ › accanto ai date picker → salta al mese intero precedente/successivo.
- [ ] **Aggiungi movimento** entrata/uscita → totali periodo e riepilogo anno coerenti dopo refresh.
- [ ] **Modifica** / **Elimina** movimento → totali aggiornati.
- [ ] Secondo utente non vede movimenti del primo (RLS).
- [ ] Empty state periodo vuoto → CTA «Aggiungi movimento».
- [ ] Mobile: riepilogo mesi scroll orizzontale.
- [ ] Movimento con/senza categoria → colonna Categoria corretta.
- [ ] Tabella: ordine default per data discendente (più recenti in cima).
- [ ] Tabella: click header Data / Categoria / Descrizione / Importo → ordinamento asc/desc.
- [ ] Filtro categoria: checkbox multipla → sole righe selezionate; icona filtro attiva.
- [ ] Filtro descrizione: cerca «bol» nel popover → spunta voci → righe corrispondenti.
- [ ] Filtro: cerca «casa» con voci già selezionate + Seleziona tutto → tutte le selezioni restano visibili in tabella.
- [ ] Con filtro attivo → totali periodo invariati; nei box compare «Filtrato: €…» (text-xs); tabella non si sposta.
- [ ] Filtro che esclude tutto → «Nessun movimento corrisponde ai filtri» + «Cancella filtri».
- [ ] Cambio periodo (‹ › o click mese) → filtri e ordinamento resettati.

## Categorie (Impostazioni)

- [ ] Admin crea/modifica categoria.
- [ ] User vede lista categorie senza pulsanti modifica.
- [ ] Elimina categoria senza movimenti → OK.
- [ ] Elimina categoria con movimenti → select destinazione obbligatoria → movimenti riassegnati.

## Callback

- [ ] URL callback configurato: `http://localhost:3000/auth/callback` in Supabase Redirect URLs.
