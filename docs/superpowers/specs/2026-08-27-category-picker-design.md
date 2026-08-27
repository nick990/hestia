# Design: picker categorie nel form movimento

**Data:** 2026-08-27  
**Stato:** approvato in brainstorming  
**Progetto:** Hestia (Next.js 16, Supabase, shadcn/ui)  
**Dipendenze:** form movimento (`components/cashflow/movement-form-dialog.tsx`); categorie piatte con gerarchia nel nome (`lib/categories/`); overlay history (`hooks/use-overlay-history.ts`); Sankey già interpreta i punti (`lib/cashflow/sankey.ts`)

## Obiettivo

Nella creazione e modifica di un movimento, scegliere una categoria con **ricerca** e **primi livelli collassati**. Oggi è una Select piatta di tutti i nomi (`casa.mutuo`, `monade.stipendio.extra`).

Il modello dati non cambia: `movement_categories.name` resta un percorso col punto; il form salva ancora `category_id` o nulla.

## Requisiti funzionali

| ID | Requisito |
|----|-----------|
| R1 | Il trigger nel form resta un campo «Categoria». Mostra il **nome intero** della scelta (`casa.bollette.gas`) oppure **Nessuna** |
| R2 | Apertura: su viewport stretta (< `md`) uno **Sheet** dal basso; da `md` in su un **Popover** agganciato al campo |
| R3 | In cima al pannello: campo cerca. Su viewport stretta **niente autofocus**. Da `md` in su il focus va sulla cerca all’apertura |
| R4 | A riposo (cerca vuota): **Nessuna** in cima, poi solo i **primi livelli**, ordine alfabetico italiano |
| R5 | Ogni primo livello è **gruppo e, se esiste la categoria-radice, anche scelta**: tap sul nome assegna quella categoria; tap sulla freccia apre o chiude |
| R6 | Se la categoria-radice non esiste (`casa.mutuo` sì, `casa` no), il nome del gruppo **non** è selezionabile: serve solo ad aprire |
| R7 | Gruppo aperto: **tutti i discendenti in lista piatta** (anche a 3+ livelli), etichetta **relativa** al gruppo (`bollette.gas`), ordine alfabetico italiano. Tap su una riga sceglie e chiude il picker |
| R8 | Ricerca: match **case-insensitive sul percorso intero** (`gas` trova `casa.bollette.gas`) |
| R9 | In ricerca: restano solo i gruppi con almeno un match, **già aperti** e filtrati (discendenti e, se matcha, la radice). I gruppi senza match spariscono |
| R10 | **Nessuna** resta visibile con cerca vuota, o se la query matcha «nessuna». Altrimenti è nascosta |
| R11 | Zero match: rigo «Nessuna categoria trovata». Chiudere il picker lascia la scelta precedente |
| R12 | Indietro del browser sullo Sheet chiude **solo** il picker (stack overlay esistente). Tap fuori / Esc chiudono Sheet e Popover |
| R13 | Lista categorie vuota: solo **Nessuna** |
| R14 | `category_id` salvato ma categoria sparita: il trigger mostra **Nessuna**; il salvataggio segue il form attuale |
| R15 | Documentazione utente (`docs/manuale/cashflow.md`) e `docs/MANUAL_TEST.md` aggiornate in implementazione |

## Fuori scope

- Anagrafica categorie (crea/rinomina/elimina)
- Sankey, filtri tabella, altre superfici che mostrano il nome categoria
- Cambiare schema o le action dei movimenti
- Albero ricorsivo oltre il primo livello (niente accordion annidati)
- Libreria Combobox / Command
- Tastiera tipo listbox (frecce, typeahead nativo): tap/click bastano; Esc chiude

## Decisioni (brainstorming)

| Tema | Decisione |
|------|-----------|
| Radice | **B** — gruppo e scelta: tap nome vs tap freccia |
| Match ricerca | **A** — sul percorso intero |
| Risultati ricerca | **B** — primi livelli restano, aperti e filtrati |
| Etichetta sotto un gruppo | Relativa (`bollette.gas`); il trigger chiuso resta il nome intero |
| Contenitore | Campo come oggi; Sheet mobile, Popover desktop (non seconda modale piena, non Select) |

## Gerarchia

Le categorie restano una lista piatta `{ id, name }`. Il primo segmento di `name.split(".")` è il gruppo.

Esempio:

| `name` | Gruppo | Selezionabile come radice | Etichetta sotto il gruppo |
|--------|--------|---------------------------|---------------------------|
| `casa` | casa | sì | — (è la riga gruppo) |
| `casa.mutuo` | casa | — | `mutuo` |
| `casa.bollette.gas` | casa | — | `bollette.gas` |
| `monade.stipendio.extra` | monade | no, se manca `monade` | `stipendio.extra` |

Un gruppo virtuale (solo figli, nessuna riga `name === primo segmento`) compare comunque in lista primi livelli, senza tap-nome.

Le etichette usano i segmenti **come in anagrafica** (niente Title Case). `casa` si legge `casa`, non Casa.

Ordinamento: `localeCompare("it", { sensitivity: "base" })` sul primo segmento per i gruppi, sulle etichette relative per i discendenti.

## Interazione

```
Trigger:  [ casa.bollette.gas          ▾ ]

Pannello (cerca vuota, Casa aperto):
┌─────────────────────────────────────┐
│ [ cerca categoria                 ] │
│ Nessuna                             │
│ casa                            ▾   │  tap nome → sceglie `casa`
│   bollette.gas                      │
│   mutuo                             │
│ monade                          ▸   │
└─────────────────────────────────────┘
```

- Freccia e nome sono bersagli distinti. Sulla freccia, area utile almeno 44px sul telefono.
- All’apertura, se c’è già una categoria, il suo gruppo è **aperto** e la riga corrente è evidenziata.
- Durante la ricerca i gruppi visibili sono forzati aperti **solo in visualizzazione**. Svuotare la cerca ripristina gli aperti di prima (incluso l’auto-open della selezione corrente).
- Scegliere una riga (Nessuna, radice, discendente) scrive `categoryId` nel form e chiude il picker.

## Architettura

Niente cambia in database né in `createMovement` / `updateMovement`.

| Pezzo | Ruolo |
|-------|--------|
| `lib/categories/tree.ts` (o equivalente) | Funzioni pure: gruppi, flatten discendenti, etichetta relativa, filtro ricerca, sort `it`, radice selezionabile sì/no |
| `lib/categories/tree.test.ts` | Copre R4–R11 a livello dati, senza DOM |
| `components/cashflow/category-picker.tsx` | Trigger + Sheet / Popover + cerca + lista |
| `components/cashflow/movement-form-dialog.tsx` | Sostituisce la Select categoria; tiene `categoryId` come oggi |
| `hooks/use-overlay-history.ts` | Usato dallo Sheet del picker, non dal Popover |

Breakpoint Sheet vs Popover e autofocus: stesso taglio `md` (CSS / `matchMedia`), non lo user-agent della home.

Niente Combobox nuova: `Input` + lista. Sheet e Popover sono già in `components/ui/`.

Il form continua a ricevere `MovementCategoryOption[]` da `listCategoryOptions()`.

## Errori e bordi

- Cerca senza risultati: copy «Nessuna categoria trovata»; nessuna selezione implicita.
- Chiudi senza scegliere: valore precedente.
- Categoria orfana: trigger **Nessuna**; se l’utente non tocca il picker, il submit si comporta come oggi (id assente o invariato secondo il form).
- Overlay: aprire il picker dallo Sheet non deve far chiudere il dialog movimento con un solo Indietro.

## Test

Automatici sulle funzioni pure:

- Gruppi dal primo segmento; gruppo virtuale non selezionabile; radice esistente selezionabile.
- Flatten: sotto `casa` compaiono `casa.mutuo` e `casa.bollette.gas`, non un secondo accordion.
- Etichetta relativa: `casa.bollette.gas` → `bollette.gas`.
- Sort italiano (es. accenti, case).
- Filtro: `gas` include `casa.bollette.gas`; gruppo senza match assente; radice che matcha resta.
- Query che matcha «nessuna» vs query che la nasconde.

Manuali in `docs/MANUAL_TEST.md`: crea e modifica movimento; cerca; apri/chiudi gruppo; scegli radice vs figlio; telefono (Sheet, niente tastiera all’apertura, Indietro) e desktop (Popover, focus cerca).

## Manuale utente

In `docs/manuale/cashflow.md`, nella scelta categoria: si può cercare; le categorie partono dai primi livelli; aprendo un gruppo si vedono tutte quelle sotto; si può assegnare anche il primo livello, se esiste.
