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
- [ ] User: Impostazioni → sidebar **Account** + **Categorie**; `/settings/users` → redirect `/settings/categories`.
- [ ] Admin: sidebar **Account** + **Categorie** + **Utenti** + **Famiglie**; `/users` → redirect `/settings/users`.

## Account

- [ ] Impostazioni → Account: email in sola lettura.
- [ ] Modifica nome → Salva → toast di conferma; nome aggiornato in colonna «Inserito da» del cashflow (se in famiglia).

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

## Cashflow (movimenti privati)

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

## Famiglie e movimenti condivisi

- [ ] Admin: Impostazioni → Famiglie → crea famiglia e assegna 2 utenti registrati.
- [ ] Utente A: movimento default condiviso → visibile a B in Tutti e Famiglia.
- [ ] Utente A: movimento privato (checkbox «Privato» attiva) → visibile ad A in Tutti e Privati; B non lo vede.
- [ ] B modifica importo/descrizione movimento family di A → OK; visibilità invariata.
- [ ] B apre modifica movimento family di A → checkbox «Privato» disabilitato + messaggio aiuto.
- [ ] B elimina movimento family di A → OK.
- [ ] A modifica il proprio movimento family → può attivare «Privato»; movimento sparisce a B.
- [ ] Vista Famiglia / Tutti: colonna «Inserito da» valorizzata anche per movimenti di altri membri (nome da Account).
- [ ] Vista Privati: solo movimenti privati propri; nessun family.
- [ ] Totali periodo cambiano tra Tutti / Privati / Famiglia.
- [ ] Segment control: ordine Tutti · Privati · Famiglia.
- [ ] Switch a 3 vie (segmented) sopra il riepilogo annuale; segmento attivo evidenziato.
- [ ] Riepilogo annuale (totali anno + griglia mesi) cambia con la vista; evidenziazione mese resta legata al range Da/A.
- [ ] Utente senza famiglia: nessun tab vista; solo privati.
- [ ] Admin rimuove membro: ex-membro non vede più family; movimenti family restano per la famiglia.
- [ ] URL `?view=mine` → vista Tutti (default).
- [ ] URL `?view=private` → vista Privati.

## Vista personale (share)

- [ ] Toggle «Vista personale» visibile in Tutti e Famiglia; nascosto in Privati
- [ ] Default off: importi e righe invariati rispetto a prima del toggle
- [ ] Toggle on + uscita famiglia 300 €, N=3 → 100 € in tabella e totali
- [ ] Toggle on + entrata famiglia propria → importo intero (non diviso)
- [ ] Toggle on + entrata famiglia altrui → riga assente; totali senza quella entrata
- [ ] Toggle on + privato → importo intero
- [ ] Testo aiuto: uscite divise, entrate solo tue, privati interi
- [ ] Cambio periodo (‹ › date picker), anno (‹ › riepilogo), click mese: `share=1` preservato in URL
- [ ] Cambio vista Tutti ↔ Famiglia: stato share preservato
- [ ] Vista Privati: nessun effetto share anche con `share=1` in URL
- [ ] Modifica movimento family: form mostra importo pieno del DB
- [ ] Riepilogo annuale coerente con tabella periodo (share on)
- [ ] Admin aggiunge terzo membro: uscite ricalcolate con N=3

## Grafico Sankey

- [ ] Cashflow con movimenti categorizzati → pulsante **Grafico Sankey** abilitato sopra la griglia
- [ ] Periodo senza movimenti filtrati → pulsante disabilitato
- [ ] Apri modal → titolo, intervallo date, chart visibile (min-height ~400px)
- [ ] Entrate gerarchiche (es. `monade.stipendio`, `monade.rimborsi`) → foglie a sinistra, padre `monade`, flusso verso centro
- [ ] Uscite gerarchiche (es. `casa.mutuo`, `casa.corrente comune`) → flusso dal centro verso destra (foglie a destra)
- [ ] Movimento senza categoria entrata e uscita → due nodi «Senza categoria» distinti
- [ ] Periodo con entrate > uscite → nodo **Avanzo** a destra del centro
- [ ] Periodo con uscite > entrate → nessun nodo Disavanzo (solo flussi uscite)
- [ ] Hover nodo → tooltip con path completo e importo €
- [ ] Applica filtro colonna categoria → badge «Filtri colonna attivi»; chart coerente con righe visibili e totali «Filtrato»
- [ ] Cambio filtro con modal aperto → chart aggiornato
- [ ] Mobile: scroll orizzontale chart se necessario

### Ordinamento nodi raggruppato per padre

- [ ] Aprire Sankey con almeno due categorie radice con figli (es. `casa.*` e `auto.*`)
- [ ] Verificare che le radici siano ordinate dall'alto verso il basso per importo decrescente
- [ ] Verificare che i figli di una radice siano contigui e non mescolati con figli di un'altra radice
- [ ] Verificare che i figli dentro ogni gruppo siano ordinati per importo decrescente
- [ ] Ripetere lato entrate (gerarchia con almeno due radici)
- [ ] Con «Senza categoria» presente: verificare che partecipi all'ordinamento per importo tra le radici

## Categorie (Impostazioni)

- [ ] Admin crea/modifica categoria.
- [ ] User vede lista categorie senza pulsanti modifica.
- [ ] Elimina categoria senza movimenti → OK.
- [ ] Elimina categoria con movimenti → select destinazione obbligatoria → movimenti riassegnati.

## Callback

- [ ] URL callback configurato: `http://localhost:3000/auth/callback` in Supabase Redirect URLs.
