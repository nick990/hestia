# Cashflow — Spacing verticale Sankey additivo (V)

**Data:** 2026-06-07  
**Stato:** Approvato  
**Precedente:** `2026-06-07-cashflow-sankey-column-gap-design.md` (gap minimo post-align; sostituito da questo documento per la semantica di V)

## Problema

1. Lo spacing verticale **non è uniforme** tra livelli/colonne: `alignSankeyLinks` sposta i nodi in modo diverso per colonna, mentre `enforceMinColumnGap` impone solo un pavimento (`max(gapLayout, V)`), non un extra costante.
2. Il controllo **V** ha step 2 px e cap 24 px — l’utente vuole incrementi di **1 px** e **nessun limite superiore**.
3. V deve essere uno **spacing minimo additivo**: lo spazio necessario al layout link va mantenuto e **si aggiunge** V tra nodi adiacenti, uguale su ogni livello/colonna.

## Obiettivo

Per ogni colonna (stesso `x0`), tra ogni coppia di nodi adiacenti ordinati per `y0`:

```
gapEffettivo = gapLayout + userV
```

- `gapLayout`: distanza prodotta da align/finalize (link allineati, nessuna sovrapposizione).
- `userV`: extra garantito dall’utente, **identico** tra tutte le coppie adiacenti di tutte le colonne.

## Controllo UI (V)

| Parametro | Valore |
|-----------|--------|
| Default | 12 px |
| Minimo | **12 px** (floor; pulsante − disabilitato a 12) |
| Massimo | Nessun cap |
| Step | ±1 px |

`linkPadding` resta fisso (`SANKEY_LINK_PADDING = 12`), non esposto in UI.

## Architettura

### Nuova funzione: `expandColumnGaps`

Input: layout con nodi posizionati dopo `finalizeLinkAlignment`, `userV ≥ 12`.

Per ogni colonna (raggruppamento per `x0`, nodi visibili non ausiliari, ordinati per `y0`):

1. Partire dal primo nodo (y invariato).
2. Per ogni nodo successivo: spostare verso il basso di `max(0, prev.y1 + userV - node.y0)` (shift cumulativo).
3. Aggiornare `y0`/`y1` del nodo e propagare lo shift ai link collegati (`applyLinkBreadths` o equivalente già usato in pipeline).

Effetto: ogni colonna guadagna `(n − 1) × userV` px in altezza; `viewHeight = max(y1)` cresce di conseguenza.

### Pipeline layout (ordine finale)

```
d3 first pass (linkPadding fisso)
→ applyColumnLayout(columnGapScale)
→ applyGroupedNodeOrder(gap 0)      ← niente V qui; solo ordine e stack compatto
→ reorder + update
→ alignSankeyLinks(linkPadding)
→ reorder + update
→ snapMisalignedLinks(linkPadding)
→ reorder + update
→ finalizeLinkAlignment()
→ expandColumnGaps(userV)             ← ultimo pass spacing; Avanzo escluso dallo shift
→ enforceMinColumnGap(0)
→ viewHeight = max(y1)

Non eseguire snap/finalize dopo expand: annullerebbero lo spacing utente.
```

`enforceMinColumnGap(0)` resta come rete di sicurezza; con expand additivo non deve alterare gap già ≥ userV.

### Modifiche config

- `SANKEY_COLUMN_GAP_Y_MIN = 12`
- Rimuovere `SANKEY_COLUMN_GAP_Y_MAX`
- `SANKEY_COLUMN_GAP_Y_STEP = 1`
- `clampColumnGapY`: solo `Math.max(MIN, value)` (nessun cap superiore)

### Modifiche UI

- `sankey-layout-controls.tsx`: `canDecreaseV` quando `columnGapY <= 12`; `canIncreaseV` sempre true; step 1.

## Requisiti

| ID | Requisito |
|----|-----------|
| A1 | V incrementa/decrementa di 1 px; minimo 12 px; nessun cap superiore |
| A2 | Dopo layout link, ogni coppia adiacente in colonna ha esattamente `gapLayout + userV` px (± tolleranza float) |
| A3 | Stesso `userV` applicato a **tutte** le colonne/livelli (income L1, L2, expense L−1, L−2, centro se multi-nodo) |
| A4 | V↑ → `viewHeight`↑; altezze barre (∝ valore) invariate |
| A5 | Nessuna sovrapposizione nodi dopo pipeline completa |
| A6 | `linkPadding` fisso, non in UI; controllo H invariato |

## Test

| Test | Verifica |
|------|----------|
| `expandColumnGaps` unitario | Fixture 3 nodi in colonna: gap tra adiacenti = gapLayout + userV |
| Floor V | `clampColumnGapY(6)` → 12; UI − disabilitato a 12 |
| Integrazione | Pipeline con fixture centro + molte uscite: nessun overlap; gap uniforme cross-colonna |
| Altezza | `viewHeight(V=24) > viewHeight(V=12)` a parità di dati |

## Fuori scope

- Persistenza V/H in localStorage
- Collision avoidance etichette testo
- Ridurre V sotto 12 px

## Note implementative

- `applyGroupedNodeOrder` oggi riceve `nodePadding: columnGapY`; va cambiato a **0** (o costante interna minima solo anti-touch) per non contare V due volte.
- Dopo `expandColumnGaps`, rieseguire sync link breadths come in `finalizeLinkAlignment` se i nodi si spostano.
- La spec precedente (gap minimo con `enforceMinColumnGap(columnGapY)`) è **sostituita** da questo modello additivo per V.
