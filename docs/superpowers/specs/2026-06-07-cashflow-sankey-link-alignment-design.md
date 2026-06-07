# Cashflow — Allineamento link Sankey post-ordinamento

**Data:** 2026-06-07  
**Stato:** Approvato

## Contesto

Dopo l'introduzione dell'ordinamento nodi raggruppato per padre (`applyGroupedNodeOrder`), alcuni link cross-colonna (es. monade → Disponibilità, uscite dal centro) mostrano **artefatti visivi ai bordi**: fasce che non terminano flush sul rettangolo del nodo, con "ali" triangolari agli angoli.

### Causa root

`d3-sankey` posiziona i nodi con **iterazioni di relaxation** che allineano verticalmente nodi collegati, così che `link.y0 ≈ link.y1` e i path orizzontali (`sankeyLinkHorizontal` + `strokeWidth = link.width`) risultino orizzontali ai bordi del nodo.

Il nostro post-layout:
1. Riassegna `y0`/`y1` **per colonna** partendo da `marginTop` (colonne indipendenti).
2. Lascia **Disponibilità** (livello 0) alla Y del primo pass d3.
3. Chiama solo `layoutGenerator.update()` → ricalcola `link.y0`/`link.y1` via `computeLinkBreadths`, **senza** relaxation.

Risultato: `link.y0` e `link.y1` divergono su link cross-colonna; la curva Bézier inclina e lo stroke spesso produce artefatti ai bordi.

## Obiettivo

Ripristinare l'invariante d3-sankey sui link visibili cross-colonna: **`link.y0 ≈ link.y1`**, mantenendo l'ordinamento nodi raggruppato per padre.

## Requisiti

| ID | Requisito |
|----|-----------|
| L1 | Dopo il layout completo, ogni link visibile cross-colonna ha `\|link.y0 - link.y1\| < 1` px |
| L2 | Ordine verticale nodi per colonna **invariato** (nessun re-sort dei nodi) |
| L3 | Altezze nodi (`y1 - y0`) invariate durante l'allineamento |
| L4 | Nodi ausiliari restano allineati al padre dopo relaxation |
| L5 | Nodo centro può spostarsi verticalmente per allineare link (non è vincolato dal grouped order) |
| L6 | Rendering SVG invariato (`sankeyLinkHorizontal` + stroke) |

## Approccio scelto

**A — Pass di relaxation link post-ordinamento** (port/adattamento della logica interna d3-sankey).

### Approcci scartati

| Opzione | Motivo esclusione |
|---------|-------------------|
| Posizionamento colonne relativo al padre | Non garantisce da solo `y0 ≈ y1`; complesso per Disponibilità multi-link |
| Path a nastro custom (fill) | Maschera il disallineamento; più codice SVG; fuori standard d3 |

## Architettura

### File coinvolti

| File | Modifica |
|------|----------|
| `lib/cashflow/sankey-layout.ts` | Nuova funzione `alignSankeyLinks()` + helper (`targetTop`, `sourceTop`, relaxation, collision resolve) |
| `lib/cashflow/sankey-layout.test.ts` | Test unitari allineamento link e ordine preservato |
| `components/cashflow/cashflow-sankey-chart.tsx` | Invoca `alignSankeyLinks` nel pipeline layout |

Nessuna modifica a `buildSankeyGraph`, `augmentSankeyGraphForLayout`, dialog, zoom viewport.

### Flusso layout aggiornato

```
buildSankeyGraph → augmentSankeyGraphForLayout
  → d3Sankey() primo pass
  → applyColumnLayout (X)
  → applyGroupedNodeOrder (Y raggruppato)
  → reorderLayoutLinks
  → layoutGenerator.update()
  → resolveSameLevelOverlaps
  → alignSankeyLinks (relaxation)          ← nuovo
  → reorderLayoutLinks
  → layoutGenerator.update()
  → sync auxiliary node Y to parent        ← già in applyGroupedNodeOrder; rieseguito
  → (viewHeight da max y1)
```

`alignSankeyLinks` va **dopo** `resolveSameLevelOverlaps` (che risolve overlap intra-colonna dal grouped placement) e **prima** del `update()` finale, così i link breadth riflettono le Y allineate.

## Algoritmo `alignSankeyLinks`

```typescript
alignSankeyLinks(layout, { nodePadding, iterations = 6 })
```

### Input

- Layout d3 con nodi (x0, y0, y1, sourceLinks, targetLinks) e link (width, value).
- `nodePadding`: stesso valore di `NODE_PADDING` del chart (12).

### Passi

1. **Raggruppa nodi per colonna** — bucket per `x0` (o `level`), ordine sinistra → destra. Escludi ausiliari dal raggruppamento (non si muovono).

2. **Per ogni iterazione** `i = 0 … iterations-1`:
   - `alpha = 0.99^i`, `beta = max(1 - alpha, (i+1)/iterations)`
   - **relaxLeftToRight**: per ogni colonna tranne la prima, per ogni nodo target calcola Y ideale come media pesata di `targetTop(source, target)` sui `targetLinks`; sposta `y0`/`y1` del nodo di `(idealY - y0) * alpha`; chiama `reorderNodeLinks(target)`.
   - **resolveCollisions(column, beta)** per colonna (push overlap, come d3-sankey).
   - **relaxRightToLeft**: simmetrico con `sourceTop(source, target)` sui `sourceLinks`.
   - **resolveCollisions** di nuovo.
   - **Non** eseguire `column.sort(ascendingBreadth)` — preserva ordine grouped.

3. **`targetTop` / `sourceTop`**: port diretto da d3-sankey (`node_modules/d3-sankey/src/sankey.js`), usando `nodePadding` al posto di `py`.

4. **Sync ausiliari**: per ogni nodo `__direct__` / `__terminal__`, copia `y0`/`y1` dal padre.

### Vincoli relaxation

- Spostamento **solo lungo Y**; `x0`/`x1` e altezze nodi fissi.
- `reorderNodeLinks` interno alla relaxation riordina `sourceLinks`/`targetLinks` per breadth (come d3); il `reorderLayoutLinks` esplicito post-pass usa l'ordine per `y0` del nodo collegato (coerente con spec node-order).

## Comportamenti edge

| Scenario | Comportamento |
|----------|---------------|
| Link stessa colonna (padre→figlio adiacente) | Allineati dalla relaxation; già quasi allineati post grouped order |
| Disponibilità con molti link | Si sposta verticalmente per centrare flussi in/out |
| Colonna alta con overlap residuo | `resolveCollisions` spinge nodi; ordine relativo preservato |
| Nodo ausiliario | Non partecipa alla relaxation; Y copiata dal padre a fine pass |
| Grafo senza link cross-colonna | No-op sicuro |

## Test

### Unitari (`sankey-layout.test.ts`)

1. **Cross-column alignment**: layout sintetico con due colonne e link disallineato (`y0` ≠ `y1` prima); dopo `alignSankeyLinks`, `\|y0 - y1\| < 1` per ogni link visibile.
2. **Ordine preservato**: indici ordinati per `y0` nella colonna identici pre/post alignment.
3. **Altezze invariate**: `y1 - y0` per ogni nodo identico pre/post.
4. **Ausiliari**: nodo `__direct__` ha stessi `y0`/`y1` del padre dopo sync.
5. **Integrazione**: fixture stile monade (figli → padre → centro) con grouped order + alignment.

### Manuale

- Dati maggio 2026: verificare monade → Disponibilità e uscite dal centro senza ali ai bordi.
- Confronto visivo prima/dopo su altri mesi con gerarchie multi-padre.

## Fuori scope

- Cambio rendering (fill vs stroke).
- Nuova minimizzazione crossing oltre alla relaxation d3.
- Modifiche all'ordinamento grouped per padre (spec node-order resta valida).
