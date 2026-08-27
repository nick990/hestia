# Design: sezione Notes (personali e di famiglia)

**Data:** 2026-08-27  
**Stato:** approvato in brainstorming  
**Progetto:** Hestia (Next.js 16, Supabase, shadcn/ui)  
**Dipendenze:** famiglie e RLS movimenti (`2026-06-05-families-design.md` e seguenti); nav (`2026-06-05-nav-settings-categories-design.md`)

## Obiettivo

Aggiungere la sezione **Notes** accanto a Cashflow: note con titolo e corpo, testo o checklist, personali o condivise con l’intera **Famiglia** (mai con un singolo utente). Edit ispirato a Google Keep nella forma povera (niente colori, pin, etichette, immagini, formattazione ricca). Ogni utente vede e modifica le proprie note e quelle della sua famiglia. Lista divisa in Personali e Famiglia, collassabile per sezione e per nota, con stato ricordato **per utente sul server**. Default: tutto **aperto**.

## Requisiti funzionali

| ID | Requisito |
|----|-----------|
| R1 | Nav: voce **Notes** tra Cashflow e Impostazioni; route `/notes` |
| R2 | Nota: titolo + corpo; tipo `text` o `checklist` |
| R3 | Creare, modificare, eliminare una nota |
| R4 | Condividere una nota personale con la famiglia; togliere la condivisione (torna personale del creatore) |
| R5 | Condivisione solo con la Famiglia, non con un singolo utente |
| R6 | Visibilità: proprie personali + tutte le note `family` della propria famiglia |
| R7 | Contenuto (titolo, corpo, tipo, spunte) ed elimina: personali → solo il creatore; famiglia → **qualsiasi membro** (come i movimenti di famiglia) |
| R8 | Cambio `scope` (condividi / togli): **solo il creatore**. Senza famiglia: azione Condividi assente |
| R9 | Lista in due sezioni: **Personali**, poi **Famiglia**. Senza famiglia: solo Personali |
| R10 | Sezioni collassabili (intestazione: chevron, icona visibilità, nome, conteggio). Note collassabili: chiuse = titolo + etichetta Personale/Famiglia in alto a destra |
| R11 | Default sezioni e note **aperte**. Persistenza per utente sul server (stesso stato telefono/desktop) |
| R12 | Nuova nota: default **personale**; con famiglia si può creare già **family**. Testo o checklist |
| R13 | Edit **inline** quando la nota è aperta; autosave con debounce; dialog solo per conferma elimina |
| R14 | Conversione tipo in qualsiasi momento: testo → checklist (una voce per riga); checklist → testo (voci come righe) |
| R15 | Ordine in ciascuna sezione: `created_at` desc (più recenti in cima); modificare una nota **non** la sposta |
| R16 | Titolo vuoto ammesso; in UI si mostra «Senza titolo» |
| R17 | Home mobile invariata (Cashflow/riepilogo); Notes non entra in home in v1 |
| R18 | Ogni nota mostra testo piccolo **Personale** o **Famiglia** in alto a destra del titolo (card e dialog) |

## Fuori scope (v1)

- Colori, pin, etichette, immagini, allegati
- Grassetto, elenchi puntati, markdown
- Ordine manuale / drag
- Condivisione con un singolo utente
- Ricerca, archivio, reminder
- Notes nella home mobile
- Conteggio «checklist incomplete» a livello query
- Realtime (refresh al reload / navigazione è sufficiente)
- Documentazione `MANUAL.md`: da aggiornare in implementazione, non in questo file

## Decisioni (brainstorming)

| Tema | Decisione |
|------|-----------|
| Permessi contenuto/elimina famiglia | Come movimenti famiglia: tutti i membri |
| Condivisione | Toggle; unshare solo creatore; torna personale del creatore |
| Collasso | Sezioni **e** singole note |
| Persistenza UI | Server, per utente |
| Default collasso | Tutto **aperto** |
| Formato Keep | Solo testo semplice + checklist |
| Cambio tipo | Sempre, testo ↔ checklist |
| Ordinamento | Data di creazione, più recenti in cima |
| Superficie edit | Inline sulla nota aperta |
| Architettura dati | Tabella `notes` + `content` JSON + `note_ui_prefs` |

## Modello dati

### `notes`

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | uuid PK | default `gen_random_uuid()` |
| `user_id` | uuid NOT NULL FK → `auth.users` | Creatore; **immutabile** |
| `scope` | text NOT NULL | `personal` \| `family`; default `personal` |
| `family_id` | uuid NULL FK → `families` | Null se personale |
| `title` | text NOT NULL | Default `''` |
| `kind` | text NOT NULL | `text` \| `checklist`; default `text` |
| `content` | jsonb NOT NULL | Vedi sotto |
| `created_at` | timestamptz | default now() |
| `updated_at` | timestamptz | default now(); trigger su update |

**Vincoli**

```
scope IN ('personal', 'family')
kind IN ('text', 'checklist')
(scope = 'personal' AND family_id IS NULL)
OR (scope = 'family' AND family_id IS NOT NULL)
kind = 'text' → content ha chiave `body` (string)
kind = 'checklist' → content ha chiave `items` (array)
```

Consistenza `kind`/`content` enforced in check JSON **o** in application + test; preferire un CHECK su `kind` e validazione in server action, per non irrigidire il JSON in SQL.

**Indici:** `(user_id, created_at desc)` dove `scope = 'personal'`; `(family_id, created_at desc)` dove `scope = 'family'`.

### Forma di `content`

Testo:

```json
{ "body": "latte\npane" }
```

Checklist:

```json
{
  "items": [
    { "id": "uuid", "text": "latte", "checked": false }
  ]
}
```

`id` voce: uuid generato in applicazione alla creazione della riga. Voci con `text` vuoto: non persistite (o rimosse all’autosave), tranne eventualmente una riga placeholder solo in UI.

### Conversione tipo

- **Testo → checklist:** split `body` su newline; ogni riga (anche vuota nel mezzo) diventa `{ id, text, checked: false }`; righe finali vuote scartate.
- **Checklist → testo:** `items.map(text).join('\n')`; lo stato `checked` si perde (accettato in v1; non c’è avviso obbligatorio).

### `note_ui_prefs`

Una riga per utente.

| Colonna | Tipo | Note |
|---------|------|------|
| `user_id` | uuid PK FK → `auth.users` | |
| `personal_section_collapsed` | boolean NOT NULL | default `false` |
| `family_section_collapsed` | boolean NOT NULL | default `false` |
| `collapsed_note_ids` | uuid[] NOT NULL | default `{}` — id delle note **chiuse** |
| `updated_at` | timestamptz | |

Assenza di riga = tutto aperto. Id in `collapsed_note_ids` che non esistono più (nota eliminata o non più visibile) si ignorano in lettura; prune opzionale in scrittura.

Collassare una nota: aggiungi id. Espandere: togli id. Sezioni: set del boolean.

## Permessi (RLS)

Allineati a `current_user_family_id()` già usato per famiglie.

**`notes` SELECT**

- `scope = 'personal' AND user_id = auth.uid()`, oppure
- `scope = 'family' AND family_id = current_user_family_id()`

**`notes` INSERT**

- `user_id = auth.uid()`
- personale: `family_id` null
- famiglia: `family_id = current_user_family_id()` (in v1 la UI non crea direttamente in famiglia; l’insert famiglia avviene via update di scope)

**`notes` UPDATE**

- Policy `using` / `with check`: stesso predicato del SELECT (chi vede può aggiornare titolo, kind, content).
- Cambio `scope` / `family_id`: RLS non vede la riga OLD, quindi un **trigger BEFORE UPDATE** rifiuta il cambio se `auth.uid() <> user_id`, o se si passa a `family` senza `family_id = current_user_family_id()`. Passaggio a personale: `family_id` null. `user_id` immutabile nello stesso trigger.
- Le action `shareNote` / `unshareNote` ripetono gli stessi controlli.

**`notes` DELETE**

- stesso predicato del SELECT (famiglia: qualsiasi membro; personale: solo creatore)

**`note_ui_prefs`**

- CRUD solo `user_id = auth.uid()`

Membro che lascia la famiglia: non vede più le note `family` di quella famiglia; le sue personali restano sue. Note famiglia non si riassegnano (come i movimenti).

## Navigazione e route

| Elemento | Destinazione |
|----------|----------------|
| Notes | `/notes` |
| Logo / home | invariati (Cashflow / home mobile) |

`navItems`: Cashflow, **Notes**, Impostazioni. Active: pathname `/notes` o prefisso `/notes/`.

Nessuna sotto-route in v1 (niente `/notes/[id]`): tutto sulla lista.

## UI

### Pagina

- Titolo pagina «Notes».
- Composer **Scrivi una nota…** centrato in cima. Al click si espande inline con titolo, corpo, scelta testo/checklist, Personale/Famiglia se c’è una famiglia, e azione Chiudi.
- Sezione **Personali** (sempre).
- Sezione **Famiglia** solo se `current_user_family_id()` è valorizzato.

Layout: Personali sopra Famiglia. Dentro ogni sezione, bacheca masonry a una colonna su mobile, due su tablet e tre su desktop. Le card hanno altezza determinata dal contenuto e rispettano l’ordine di creazione. Tono PRODUCT: casa, non banca; italiano.

### Sezione

Intestazione bottone: chevron, «Personali» / «Famiglia», conteggio note. Click toggle collasso sezione. Chiusa: nessun elenco note. Aperta: lista.

Empty state nella sezione aperta: «Nessuna nota personale» / «Nessuna nota di famiglia», invito a crearne una. Nuova nota resta personale anche se l’empty state è sotto Famiglia (copy: crea e poi condividi).

### Nota

- Riga titolo: chevron + titolo (o «Senza titolo»). Il chevron controlla il collasso della card; titolo o corpo aprono la nota in un dialog.
- Card in lettura: titolo e anteprima troncata a 8 righe di testo o 6 voci di checklist.
- Dialog di modifica: su desktop overlay alto al centro con azione Chiudi; su mobile schermo intero con freccia indietro in alto a sinistra, senza Chiudi. Esc chiude. Click sull’overlay chiude solo su desktop.
- Checklist: checkbox, testo riga, Invio crea voce sotto, Backspace su voce vuota la rimuove; la X a destra elimina la voce (hover/focus su desktop, sempre visibile su touch); le voci completate sono barrate e raccolte in fondo. Ogni spunta è un autosave. La posizione della nota non cambia.
- Azioni a icona nel footer della nota: tipo testo/checklist, Condividi o Togli condivisione (solo creatore + famiglia esistente per condividere), Elimina. Sono visibili al hover/focus con puntatore e sempre visibili su touch. Condividi e Togli condivisione aprono un dialog di conferma; Annulla non cambia lo scope.
- Condividi su nota famiglia di cui non sei creatore: non mostrare Togli condivisione.

Editor Keep-povero: niente toolbar. Focus visibile, contrasto ok, `prefers-reduced-motion` su chevron.

### Autosave

Debounce ~500ms dopo ultimo input. Indicatore discreto (salvataggio / salvata / errore). Fallimento: testo resta in pagina, messaggio sull’errore, retry al prossimo input o azione esplicita Riprova.

### Elimina

Dialog conferma (shadcn). Successo: nota sparisce dalla lista; togliere id dalle prefs non obbligatorio.

### Conflitti

Last-write-wins. Niente locking. Due membri sulla stessa nota famiglia: l’ultimo save vince.

## Flusso actions (applicazione)

Pattern come Cashflow: Server Actions + query `lib/notes/`, componenti `components/notes/`.

| Action | Comportamento |
|--------|----------------|
| `listNotes` | Personali dell’utente + family della famiglia; join prefs |
| `createNote` | Crea la bozza compilata dal composer; `scope` personale o famiglia se richiesto e consentito; default testo |
| `updateNoteContent` | title, kind, content; bump `updated_at` |
| `shareNote` / `unshareNote` | solo creatore; share richiede famiglia |
| `deleteNote` | come RLS |
| `updateNoteUiPrefs` | upsert riga utente |

Creare nota: il composer mantiene la bozza in locale e inserisce alla chiusura solo se titolo o contenuto non sono vuoti. Una bozza completamente vuota viene chiusa senza creare righe.

## Errori

| Caso | UX |
|------|-----|
| Save fallito | Messaggio sulla nota, contenuto locale conservato |
| Delete fallito | Dialog aperto, errore |
| Share senza famiglia / non creatore | Controllo assente; se race, errore action |
| RLS inattesa | Errore generico, niente leak |

## Test

- Conversione testo ↔ checklist (unit).
- Consistenza scope/family_id e «solo creatore cambia scope» (unit o action).
- RLS: altro membro non vede personali; vede/modifica/elimina famiglia; non unshare altrui; prefs non cross-user.
- Smoke UI: nav, crea, collassa nota e sezione (reload mantiene), share/unshare, elimina con conferma.

## Componenti (indicativi)

| Unità | Responsabilità | Dipendenze |
|-------|----------------|------------|
| `app/(protected)/notes/page.tsx` | Load note + prefs, render pagina | queries, member/family |
| `components/notes/notes-page.tsx` | Sezioni, nuova nota, wiring actions | figli |
| `components/notes/note-composer.tsx` | Creazione inline testo/checklist | actions, editor |
| `components/notes/notes-section.tsx` | Collasso sezione + lista | `note-card` |
| `components/notes/note-card.tsx` | Collasso, titolo, editor, azioni | editor, dialog |
| `components/notes/note-text-editor.tsx` | Textarea body | — |
| `components/notes/note-checklist-editor.tsx` | Voci + spunte | — |
| `lib/notes/queries.ts` | Fetch | supabase server |
| `lib/notes/content.ts` | Conversione kind, normalizzazione JSON | — |
| `app/actions/notes.ts` | Mutations | RLS via user client |

File piccoli, un compito ciascuno. Non mescolare Cashflow.

## Criteri di successo

Un utente crea una lista della spesa personale, la usa collassata per titolo, la condivide con la famiglia; il partner la vede sotto Famiglia, spunta voci, la richiude; al reload entrambi ritrovano il proprio collasso; togliere condivisione la fa sparire dalla sezione Famiglia e restare solo al creatore. Nessun colore Keep, nessuna condivisione 1:1.
