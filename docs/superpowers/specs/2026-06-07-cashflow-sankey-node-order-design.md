# Cashflow — Ordinamento nodi Sankey raggruppato per padre

**Data:** 2026-06-07  
**Stato:** In revisione

## Contesto

Il grafico Sankey cashflow (modal, dati filtrati) usa `d3-sankey` per il layout verticale. Oggi i nodi in ogni colonna sono ordinati globalmente dall'algoritmo d3 (con ottimizzazione anti-crossing), quindi **i figli di padri diversi possono mescolarsi** nella stessa colonna.

Esempio indesiderato (uscite):

```
Colonna 1    Colonna 2
  cat1         cat2
  catA         catB    ← catB finisce tra i figli di cat1
               cat3
```

Comportamento atteso:

```
Colonna 1    Colonna 2
  cat1         cat2
               cat3
  catA         catB
```

## Obiettivo

Ordinare i nodi **verticalmente per importo decrescente** (`value`, lo stesso mostrato sul nodo), **raggruppati per padre** a ogni livello orizzontale. I figli di un padre restano contigui e posizionati nel blocco del padre; non devono comparire tra i figli di un altro padre.

## Requisiti

| ID | Requisito |
|----|-----------|
| O1 | Ordinamento per `value` decrescente (importo visualizzato sul nodo) |
| O2 | A ogni colonna, le radici (primo livello dal centro) sono ordinate per `value` tra loro |
| O3 | I figli di un padre sono ordinati per `value` decrescente **dentro il gruppo** |
| O4 | Il blocco figli è posizionato in corrispondenza del padre (non mescolato con altri gruppi) |
| O5 | Stesse regole su entrate e uscite (simmetria) |
| O6 | Nodi speciali («Senza categoria», «Avanzo») partecipano all'ordinamento come radici del rispettivo lato, per `value` |
| O7 | Nodo centro escluso dall'ordinamento verticale |
| O8 | Nodi ausiliari (`__direct__`, `__terminal__`) restano nascosti; posizione coerente col padre |
| O9 | Altezza nodi proporzionale a `value` (invariato, standard Sankey) |
| O10 | Link ricalcolati dopo riposizionamento via `layoutGenerator.update()` |

## Regole di ordinamento

Per ogni **colonna** (stesso `level` / stessa distanza orizzontale dal centro):

1. **Radici della colonna** — nodi collegati direttamente al centro o il cui padre è nella colonna precedente e non ha altri figli in quella colonna che richiedono raggruppamento separato:
   - Ordinate per `value` decrescente.
   - Includono categorie di primo livello, «Senza categoria», «Avanzo» (lato uscite).

2. **Figli** — per ogni radice/padre che ha figli nella colonna successiva:
   - Figli ordinati per `value` decrescente.
   - Blocco figli posizionato subito dopo il padre (o allineato verticalmente al padre), senza interleaving con figli di altri padri.

3. **Ordine dei gruppi** — determinato dall'ordine del padre al livello precedente (che a sua volta segue O2).

### Esempio

Uscite: `cat1` (200) → `cat2` (120), `cat3` (80); `catA` (150) → `catB` (150).

```
Colonna 1          Colonna 2
┌──────┐
│ cat1 │ ──────── ┌──────┐
│ 200  │          │ cat2 │ 120
└──────┘          ├──────┤
                  │ cat3 │  80
                  └──────┘
┌──────┐
│ catA │ ──────── ┌──────┐
│ 150  │          │ catB │ 150
└──────┘          └──────┘
```

`cat1` sopra `catA` (200 > 150). `cat2` sopra `cat3` (120 > 80). `catB` resta nel gruppo di `catA`.

## Approccio scelto

**Post-layout: ricalcolo Y raggruppato per padre** (approccio A del brainstorming).

Dopo il primo passaggio `d3-sankey` (che calcola altezze nodi ∝ `value`):

1. Nuova funzione `applyGroupedNodeOrder(layout, graph)`.
2. Per ogni colonna: costruisce mappa padre → figli dai link; identifica radici; ordina e assegna `y0`/`y1`.
3. `layoutGenerator.update()` ricalcola i path dei link.
4. `resolveSameLevelOverlaps` e `applyColumnLayout` restano invariati nel flusso.

### Approcci scartati

| Opzione | Motivo esclusione |
|---------|-------------------|
| `nodeSort` custom in d3-sankey | Passate iterative d3 possono riordinare; non garantisce raggruppamento per padre |
| Layout verticale completamente manuale | Duplica logica altezze d3; più codice da mantenere |

## Architettura

### File coinvolti

| File | Modifica |
|------|----------|
| `lib/cashflow/sankey-layout.ts` | **Nuovo** — pure functions: `applyGroupedNodeOrder`, helper ordinamento per colonna |
| `lib/cashflow/sankey-layout.test.ts` | **Nuovo** — test unitari ordinamento |
| `components/cashflow/cashflow-sankey-chart.tsx` | Invoca `applyGroupedNodeOrder` dopo layout d3 iniziale, prima di `update()` |

Nessuna modifica a `buildSankeyGraph`, al dialog, o al modello grafo.

### Algoritmo `applyGroupedNodeOrder`

```
Input:  layout d3 (nodi con altezze già calcolate), grafo con link
Output: nodi con y0/y1 ricalcolati per colonna

Colonne processate dal centro verso l'esterno:
  uscite: level -1, -2, …
  entrate: level 1, 2, …

Per ogni colonna (level L):

  Colonna radici (L = ±1, padre = centro o assente):
    1. Raccogli nodi visibili del level L
    2. Ordina per value DESC (tie-break: id)
    3. Assegna y0/y1 top-down con NODE_PADDING

  Colonna figli (|L| > 1):
    1. Raccogli nodi visibili del level L
    2. Raggruppa per padre (nodo in colonna L-1 collegato dal link)
    3. Ordina gruppi per y0 del padre (posizione già fissata)
    4. Dentro ogni gruppo: ordina per value DESC (tie-break: id)
    5. Concatena gruppi top-down; assegna y0/y1 con NODE_PADDING
```

L'altezza di ogni nodo (`y1 - y0`) resta quella calcolata dal primo pass d3-sankey (proporzionale a `value`).

### Flusso layout aggiornato

```
buildSankeyGraph → augmentSankeyGraphForLayout
  → d3Sankey() primo pass
  → applyColumnLayout (X invariato)
  → applyGroupedNodeOrder (Y raggruppato)   ← nuovo
  → layoutGenerator.update()
  → resolveSameLevelOverlaps
  → layoutGenerator.update()
```

## Comportamenti edge

| Scenario | Comportamento |
|----------|---------------|
| Padre senza figli | Solo il nodo padre, ordinato per `value` con le altre radici |
| Padre con un solo figlio | Gruppo di un elemento, nessun interleaving |
| Stesso `value` | Ordine stabile (tie-break per `id` o ordine inserimento) |
| «Senza categoria» | Radice del lato; ordinata per `value` con le altre radici |
| «Avanzo» | Radice lato uscite (level -1); ordinata per `value` |
| Profondità > 2 | Stesse regole ricorsive per ogni colonna |
| Nodo ausiliario | Segue posizione del padre; non visibile |

## Test

### Unitari (`sankey-layout.test.ts`)

1. Due padri con figli → gruppi separati, nessun interleaving.
2. Figli ordinati per `value` decrescente dentro il gruppo.
3. Radici ordinate per `value` decrescente.
4. «Senza categoria» mescolata correttamente tra radici per `value`.
5. Tie-break deterministico a parità di `value`.
6. Entrate: simmetria rispetto alle uscite.

### Manuale

- Aprire Sankey con categorie gerarchiche multi-padre; verificare raggruppamento visivo.
- Confrontare ordine verticale con importi mostrati sui nodi.

## Fuori scope

- Minimizzazione crossing link (sacrificata a favore del raggruppamento per padre).
- Modifiche al modello grafo o alla modale oltre al layout chart.
- Export o interattività aggiuntiva.
