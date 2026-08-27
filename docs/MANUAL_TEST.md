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

- [ ] Nav: **Cashflow**, **Notes** e **Impostazioni** (nessuna Dashboard).
- [ ] User: Impostazioni → sidebar **Account** + **Categorie**; `/settings/users` → redirect `/settings/categories`.
- [ ] Admin: sidebar **Account** + **Categorie** + **Utenti** + **Famiglie**; `/users` → redirect `/settings/users`.

## Account

- [ ] Impostazioni → Account: email in sola lettura.
- [ ] Modifica nome → Salva → toast di conferma; nome aggiornato in colonna «Assegnatario» del cashflow (se in famiglia).

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

## Cashflow (movimenti)

- [ ] Link **Cashflow** visibile in nav per user e admin.
- [ ] Apri `/cashflow` senza query → griglia mese corrente (`from`/`to`), riepilogo anno corrente.
- [ ] Riepilogo annuale: ‹ › anno cambia solo i mesi del riepilogo; griglia invariata.
- [ ] Click su un mese nel riepilogo → `from`/`to` impostati a quel mese intero; griglia aggiornata.
- [ ] Date picker Da/A con range parziale → movimenti e totali periodo corretti; nessun mese evidenziato nel riepilogo.
- [ ] ‹ › accanto ai date picker → salta al mese intero precedente/successivo.
- [ ] **Aggiungi movimento** entrata/uscita → totali periodo e riepilogo anno coerenti dopo refresh.
- [ ] **Modifica** / **Elimina** movimento → totali aggiornati.
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
- [ ] Cambio periodo (‹ › o click mese) → filtri colonna e ordinamento resettati; filtri assegnatario invariati (localStorage).

## Famiglie e assegnatario movimenti

- [ ] Admin: Impostazioni → Famiglie → crea famiglia e assegna 2 utenti registrati.
- [ ] Tabella: colonna **Assegnatario** valorizzata (Famiglia o nome da Account).
- [ ] Utente A: **uscita** default «Di famiglia» ON → assegnatario Famiglia; visibile a B con filtri default.
- [ ] Utente A: **uscita** «Di famiglia» OFF → selettore assegnatario (default self); importo reale (no quota ÷ N).
- [ ] Utente A: **entrata** default personale self; toggle «Di famiglia» OFF.
- [ ] Utente A: **entrata** «Di famiglia» ON → assegnatario Famiglia; visibile a B.
- [ ] Movimento personale non privato assegnato a B → visibile a tutta la famiglia se filtro include B.
- [ ] Movimento personale **privato** (checkbox «Privato», solo se assegnatario = self) → visibile solo ad A; B non lo vede.
- [ ] Filtri **Entrate** / **Uscite** sempre visibili su due righe, sotto il periodo e sopra i totali: chip Famiglia + membri; default tutti ON.
- [ ] Deseleziona tutte le checkbox Entrate → nessuna entrata in tabella/totali/Sankey.
- [ ] Filtro membro = self attivo → sotto-checkbox **Mostra privati** (default ON); OFF → privati nascosti.
- [ ] B modifica importo/descrizione movimento di famiglia di A → OK.
- [ ] B elimina movimento di famiglia di A → OK.
- [ ] B apre modifica movimento privato di A → non visibile in lista (RLS).
- [ ] A modifica il proprio movimento di famiglia → può attivare «Privato» solo se assegnatario = self; movimento sparisce a B.
- [ ] Totali periodo e riepilogo annuale cambiano con i filtri assegnatario.
- [ ] Utente senza famiglia: nessun toggle «Di famiglia»; solo personale self; righe filtri assegnatario nascoste.
- [ ] Admin rimuove membro: ex-membro non vede più movimenti di famiglia; movimenti family restano per la famiglia.
- [ ] Ricarica pagina → filtri assegnatario ripristinati da localStorage; periodo da URL.

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

### Viewport zoom e pan

- [ ] Apertura modale → grafico intero visibile (fit automatico)
- [ ] Drag → pan fluido; cursore grab/grabbing
- [ ] Rotella mouse → zoom sul puntatore; la modale non scrolla
- [ ] Pinch su mobile/tablet
- [ ] Pulsante **+** → zoom avanti; disabilitato al massimo
- [ ] Pulsante **−** → zoom indietro; disabilitato al minimo
- [ ] Pulsante **Adatta** → reset al fit iniziale
- [ ] Cambio filtro con modale aperta → fit ricalcolato sul nuovo grafico

### Allineamento link Sankey

- [ ] Aprire Sankey con dati maggio 2026 (o mese con monade + uscite multiple)
- [ ] Flusso monade → Disponibilità: nessuna «ala» triangolare ai bordi del nodo
- [ ] Flussi uscite da Disponibilità (mutuo, luce, gas, …): bordi flush sui nodi
- [ ] Zoom +/− e Adatta: link restano allineati dopo fit
- [ ] Ordinamento nodi per padre invariato rispetto a prima del fix

### Controlli spacing layout

- [ ] Toolbar **V** a 12 (minimo): grafico compatto, nessuna sovrapposizione nodi
- [ ] **V +1 px** alla volta: altezza grafico cresce; gap visivo uniforme su income L1/L2 e expense L−1/L−2
- [ ] **V** alto (es. 48+): nessun cap superiore; scroll verticale ok
- [ ] Pulsante **V −** disabilitato a 12; **V +** sempre attivo
- [ ] Nessuna sovrapposizione nodi/etichette nella stessa colonna a qualsiasi V
- [ ] Toolbar **H** a 12 (minimo): layout base; **H +1 px** allarga colonne senza cap; **H −** disabilitato a 12
- [ ] Dopo cambio V/H, link restano flush sui nodi (incluso Avanzo)

## Categorie (Impostazioni)

- [ ] Admin crea/modifica categoria.
- [ ] User vede lista categorie senza pulsanti modifica.
- [ ] Elimina categoria senza movimenti → OK.
- [ ] Elimina categoria con movimenti → select destinazione obbligatoria → movimenti riassegnati.

## Notes

- [ ] Nav: **Notes** tra Cashflow e Impostazioni (desktop e menu mobile).
- [ ] `/notes` senza famiglia: solo Personali; niente Condividi.
- [ ] **Scrivi una nota…** → composer espanso; **Chiudi** salva la nota (personale di default).
- [ ] Composer: passa da testo a checklist; con famiglia scegli Personale o Famiglia; Esc chiude e salva solo se contiene testo.
- [ ] Desktop: card in griglia masonry; mobile: una sola colonna; contenuti lunghi troncati in anteprima.
- [ ] Ogni card e il dialog mostrano **Personale** o **Famiglia** in piccolo in alto a destra del titolo; dopo Condividi / Togli condivisione l’etichetta cambia.
- [ ] Click su titolo o corpo apre la nota: dialog alto su desktop (Chiudi o Esc); schermo intero su mobile (freccia indietro, niente Chiudi).
- [ ] Modifica titolo/corpo, reload mantiene.
- [ ] Checklist: voci, spunte, X per eliminare la riga (hover/focus desktop, sempre visibile su touch), completate barrate e in fondo, conversione da/verso testo.
- [ ] Azioni card visibili al hover/focus e sempre raggiungibili su touch.
- [ ] Collassa nota e sezione → reload mantiene (stesso utente, altro browser se possibile).
- [ ] Condividi: Annulla non cambia scope; conferma sposta in Famiglia per il partner; il partner modifica e elimina.
- [ ] Partner non vede Togli condivisione su nota altrui; creatore toglie con conferma → torna solo al creatore.
- [ ] Elimina: Annulla non cancella; conferma sì.

## Home mobile (tab)

- [ ] Telefono: `/` mostra riga tab Cashflow (terracotta) e Notes (umber) sotto l’header; Cashflow è selezionato.
- [ ] Tap su un tab: il tab diventa subito selezionato, icona a spinner, vista in attesa; a caricamento finito compare il contenuto.
- [ ] Tab Notes → bacheca note, senza h1 «Notes»; Indietro torna a Cashflow; refresh su `/?tab=notes` resta su Notes.
- [ ] Su Notes, `from`/`to` restano in URL; tornare a Cashflow mostra lo stesso mese.
- [ ] Cambio mese sul tab Cashflow non perde la lista; FAB + solo su Cashflow.
- [ ] Menu → Notes apre `/notes` **senza** riga tab; menu → Cashflow apre `/cashflow` completa.
- [ ] Desktop: `/` reindirizza a `/cashflow`; nessuna riga tab.

## Callback

- [ ] URL callback configurato: `http://localhost:3000/auth/callback` in Supabase Redirect URLs.
