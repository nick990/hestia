# Design: picker categorie nel form movimento

**Data:** 2026-08-27  
**Aggiornato:** 2026-08-31  
**Stato:** allineato al codice  
**Progetto:** Hestia (Next.js 16, Supabase, shadcn/ui)  
**Dipendenze:** form movimento (`components/cashflow/movement-form-dialog.tsx`); categorie piatte con gerarchia nel nome (`lib/categories/`); overlay history (`hooks/use-overlay-history.ts`); Sankey già interpreta i punti (`lib/cashflow/sankey.ts`)  
**Addendum mobile:** `2026-08-31-category-picker-mobile-select-design.md` (tap sul padre vs pallino)

## Obiettivo

Nella creazione e modifica di un movimento, scegliere una categoria con **ricerca** e **primi livelli collassati**. Il campo non è più una Select piatta di tutti i nomi (`casa.mutuo`, `lavoro.monade.stipendio`).

Il modello dati non cambia: `movement_categories.name` resta un percorso col punto; il form salva ancora `category_id` o nulla.

## Requisiti funzionali

| ID | Requisito |
|----|-----------|
| R1 | Il trigger nel form resta un campo «Categoria». Mostra il **nome intero** della scelta (`casa.bollette.gas`) oppure **Nessuna** |
| R2 | Apertura: su viewport stretta (< `md`) uno **Sheet** dal basso; da `md` in su un **Popover** agganciato al campo |
| R3 | In cima al pannello: campo cerca. Su viewport stretta **niente autofocus**. Da `md` in su il focus va sulla cerca all’apertura |
| R4 | A riposo (cerca vuota): **Nessuna** in cima, poi solo i **primi livelli**, ordine alfabetico italiano |
| R5 | Desktop: tap sul nome della radice (se esiste) la assegna; tap sulla freccia apre o chiude. Telefono: vedi spec mobile — tap sul nome apre/chiude, il pallino a destra del nome assegna |
| R6 | Se la categoria su quel path non esiste, il nome del gruppo **non** è selezionabile (niente pallino). Serve solo ad aprire. In anagrafica i prefissi mancanti (`lavoro`, `lavoro.monade`) si materializzano in creazione/rinomina e con la migration `category_prefixes` |
| R7 | Gerarchia a **due livelli di gruppi**: L1 (`casa`, `lavoro`) → L2 (`bollette`, `monade`); i 3+ segmenti (`gas`, `stipendio`) stanno sotto L2. Etichetta **relativa** al padre. Tap su una foglia sceglie e chiude |
| R8 | Ricerca: match **case-insensitive sul percorso intero** (`gas` trova `casa.bollette.gas`) |
| R9 | In ricerca: restano solo i gruppi con almeno un match, **già aperti** e filtrati (discendenti e, se matcha, la radice). I gruppi senza match spariscono |
| R10 | **Nessuna** resta visibile con cerca vuota, o se la query matcha «nessuna». Altrimenti è nascosta |
| R11 | Zero match: rigo «Nessuna categoria trovata». Chiudere il picker lascia la scelta precedente |
| R12 | Indietro del browser sullo Sheet chiude **solo** il picker (stack overlay esistente). Tap fuori / Esc chiudono Sheet e Popover |
| R13 | Lista categorie vuota: solo **Nessuna** |
| R14 | `category_id` salvato ma categoria sparita: il trigger mostra **Nessuna**; il salvataggio segue il form attuale |
| R15 | Documentazione utente (`docs/manuale/cashflow.md`) e `docs/MANUAL_TEST.md` allineate al gesto desktop e telefono |
| R16 | Lista: altezza riga uniforme (`min-h-11` sul telefono, `min-h-8` sul desktop); `divide-y` tra le voci; zebra tra **fratelli** dello stesso livello, non tra padre e figli. Gruppo aperto: figli in blocco rientrato con `border-l-2 border-primary/25` e `bg-muted/25` |

## Fuori scope

- Anagrafica categorie (crea/rinomina/elimina) — vive in Impostazioni; usa lo stesso albero (`buildSettingsCategoryRows`)
- Sankey, filtri tabella, altre superfici che mostrano il nome categoria
- Cambiare schema o le action dei movimenti
- Albero ricorsivo oltre due livelli di gruppi (i 3+ segmenti restano foglie sotto L2)
- Libreria Combobox / Command
- Tastiera tipo listbox (frecce, typeahead nativo): tap/click bastano; Esc chiude

## Decisioni (brainstorming)

| Tema | Decisione |
|------|-----------|
| Radice (desktop) | **B** — gruppo e scelta: tap nome vs tap freccia |
| Radice (telefono) | Tap nome apre; pallino a destra del nome assegna (spec 2026-08-31) |
| Match ricerca | **A** — sul percorso intero |
| Risultati ricerca | **B** — primi livelli restano, aperti e filtrati |
| Etichetta sotto un gruppo | Relativa al padre (`gas` sotto `casa.bollette`); il trigger chiuso resta il nome intero |
| Contenitore | Campo come oggi; Sheet mobile, Popover desktop |
| Gerarchia visiva | Binario + blocco (linea verticale, sfondo muted); niente zebra padre/figli |

## Gerarchia

Le categorie restano una lista piatta `{ id, name }`. I segmenti di `name.split(".")` formano l’albero: primo = L1, secondo = L2, il resto = foglie sotto L2.

Esempio:

| `name` | L1 | L2 | Foglia sotto L2 | Selezionabile come |
|--------|----|----|-----------------|-------------------|
| `casa` | casa | — | — | riga L1 |
| `casa.mutuo` | casa | mutuo | — | riga L2 (niente figli) |
| `casa.bollette` | casa | bollette | — | riga L2 (se materializzata) |
| `casa.bollette.gas` | casa | bollette | `gas` | foglia |
| `lavoro.monade.stipendio` | lavoro | monade | `stipendio` | foglia |

Un gruppo virtuale (nessuna riga `name` uguale al path) compare comunque, senza pallino e senza tap-nome selezionabile.

`missingCategoryPrefixes` crea i path intermedi assenti quando si crea o rinomina una categoria, così `lavoro` e `lavoro.monade` restano assegnabili se esistono foglie sotto.

Le etichette usano i segmenti **come in anagrafica** (niente Title Case). Ordinamento: `localeCompare("it", { sensitivity: "base" })`.

## Interazione

```
Trigger:  [ casa.bollette.gas          ▾ ]

Desktop (cerca vuota, casa e bollette aperti):
┌─────────────────────────────────────┐
│ [ cerca categoria                 ] │
│ Nessuna                             │
│ casa                            ▾   │  tap nome → sceglie `casa`
│   │ bollette                    ▾   │  tap nome → sceglie `casa.bollette`
│   │   gas                           │
│   │ mutuo                           │
│ lavoro                          ▸   │
└─────────────────────────────────────┘

Telefono: stesso albero; sul padre con figli il tap sul nome apre/chiude,
il pallino a destra del nome assegna. Foglie e Nessuna: tap sulla riga.
```

- Freccia e nome sono bersagli distinti. Sul telefono, pallino e freccia hanno area utile ≥ 44px.
- All’apertura, se c’è già una categoria, i path verso di lei sono **aperti** e la riga corrente è evidenziata.
- Durante la ricerca i gruppi visibili sono forzati aperti **solo in visualizzazione**. Svuotare la cerca ripristina gli aperti di prima (incluso l’auto-open della selezione corrente).
- Scegliere una riga (Nessuna, padre via pallino/nome, foglia) scrive `categoryId` nel form e chiude il picker.

## Architettura

Niente cambia in `createMovement` / `updateMovement`. I prefissi si materializzano in `createCategory` / rinomina e in `supabase/migrations/20260831153715_category_prefixes.sql`.

| Pezzo | Ruolo |
|-------|--------|
| `lib/categories/tree.ts` | Gruppi L1/L2, foglie sotto L2, etichetta relativa, filtro, sort `it`, `buildSettingsCategoryRows` |
| `lib/categories/tree.test.ts` | Copre R4–R11 e i due livelli a livello dati |
| `lib/categories/prefixes.ts` | `missingCategoryPrefixes` |
| `lib/categories/interaction.ts` | `branchInteraction` (tap nome vs pallino) |
| `components/cashflow/category-picker.tsx` | Trigger + Sheet / Popover + cerca + lista |
| `components/cashflow/movement-form-dialog.tsx` | Tiene `categoryId` come oggi |
| `hooks/use-min-md.ts` | Taglio Sheet vs Popover (`md`) |
| `hooks/use-overlay-history.ts` | Usato dallo Sheet del picker, non dal Popover |

Breakpoint Sheet vs Popover e autofocus: stesso taglio `md` (`matchMedia`), non lo user-agent della home.

Niente Combobox nuova: `Input` + lista. Il form continua a ricevere `MovementCategoryOption[]` da `listCategoryOptions()`.

## Errori e bordi

- Cerca senza risultati: copy «Nessuna categoria trovata»; nessuna selezione implicita.
- Chiudi senza scegliere: valore precedente.
- Categoria orfana: trigger **Nessuna**; se l’utente non tocca il picker, il submit si comporta come oggi.
- Overlay: aprire il picker dallo Sheet non deve far chiudere il dialog movimento con un solo Indietro.

## Test

Automatici sulle funzioni pure:

- Gruppi L1/L2; foglie sotto L2 (`casa.bollette.gas` → etichetta `gas`).
- Con prefissi materializzati, `lavoro` e `lavoro.monade` sono selezionabili.
- Gruppo virtuale non selezionabile; radice esistente selezionabile.
- Sort italiano (accenti, case).
- Filtro: `gas` include `casa.bollette.gas`; gruppo senza match assente; radice che matcha resta.
- Query che matcha «nessuna» vs query che la nasconde.
- `branchInteraction`: tabella in spec mobile.

Manuali in `docs/MANUAL_TEST.md`: crea e modifica movimento; cerca; apri L1 e L2; scegli padre vs foglia; telefono (Sheet, pallino, Indietro) e desktop (Popover, tap nome).

## Manuale utente

In `docs/manuale/cashflow.md`: si può cercare; primi livelli collassati; due livelli di gruppi; sul telefono il nome apre e il pallino a destra del nome assegna; sul computer il nome assegna e la freccia apre.
