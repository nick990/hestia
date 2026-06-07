# Cashflow — Fix allineamento link Sankey + controlli spacing

**Data:** 2026-06-07  
**Stato:** Approvato

## Contesto

Nonostante `alignSankeyLinks` e `snapMisalignedLinks`, il link **centro → Avanzo** (e casi simili con dati 2026 completi) mostra ancora una “pancia” grigia: path Bézier inclinato perché `link.y0 ≠ link.y1`.

### Cause identificate

1. **Pipeline post-snap** — dopo `snapMisalignedLinks` (che pinna nodi a link singolo), il chart riesegue `reorderLayoutLinks` + `layoutGenerator.update()`, ricalcolando lo stack `sourceLinks` sul centro e potenzialmente riaprendo il disallineamento.
2. **Posizionamento colonna vs fascia centro** — `applyGroupedNodeOrder` impila Avanzo in fondo alla colonna uscite (`marginTop + Σ altezze + padding`), indipendente dalla posizione della fascia sul nodo centro.
3. **Spacing verticale** — `NODE_PADDING = 12` influisce su gap intra-colonna e su `targetTop`/`sourceTop`, ma **non risolve da solo** il disallineamento delle fasce; serve fix strutturale + controllo utente per leggibilità.

### Spacing orizzontale

Le colonne sono distribuite uniformemente in `[CHART_X0, CHART_X1]` via `applyColumnLayout` (`step = span / (cols - 1)`). Lo zoom scala visivamente ma non rilayouta. Un controllo orizzontale moltiplica lo `step` e allarga `contentWidth` quando necessario — utile per gerarchie profonde, **non** per la pancia Avanzo (problema verticale).

## Obiettivo

1. Garantire link cross-colonna orizzontali ai bordi del nodo (`|link.y0 - link.y1| < 1px`), incluso centro → Avanzo.
2. Esporre controlli **spacing verticale** e **spacing orizzontale** in toolbar (approccio A: pulsanti −/+/valore), con relayout al cambio.

## Requisiti

| ID | Requisito |
|----|-----------|
| F1 | `\|link.y0 - link.y1\| < 1px` su ogni link visibile cross-colonna dopo layout completo |
| F2 | Caso Avanzo (surplus, link singolo, valore grande) verificato con fixture tipo 2026 |
| F3 | Pipeline layout: pin / snap **non annullato** dal pass finale |
| F4 | Spacing verticale regolabile 6–24px, default 12, step 2 |
| F5 | Spacing orizzontale regolabile 0.75–1.5×, default 1.0, step 0.05 |
| F6 | Controlli in toolbar accanto a zoom (+/−/valore per V e H) |
| F7 | Cambio spacing → relayout + fit automatico (come cambio filtro) |
| F8 | Stato spacing solo per sessione modale (no persistenza v1) |
| F9 | Ordinamento nodi raggruppato per padre invariato |
| F10 | Zoom/pan esistenti invariati |

## Approccio scelto

**A — Fix pipeline + toolbar compatta con −/valore/+** per V e H.

### Fix allineamento (priorità 1)

1. **Ultimo pass assoluto:** `pinSingleLinkNodes` + `applyLinkBreadths` **dopo** l’ultimo `update()`, oppure rimuovere `reorderLayoutLinks` + `update()` ridondante post-snap se non necessario.
2. **Posizionamento Avanzo/surplus:** in `applyGroupedNodeOrder` (o helper dedicato post-layout), opzionale posizionare surplus da fascia centro se link già calcolabile; fallback al pin finale.
3. **Test:** pipeline integrata chart (ordine chiamate reale) + fixture molte uscite + Avanzo.

### Controlli spacing (priorità 2)

| Parametro | Stato React | Effetto layout |
|-----------|-------------|----------------|
| `nodePaddingY` | default 12 | `d3Sankey.nodePadding`, `applyGroupedNodeOrder`, `resolveSameLevelOverlaps`, `alignSankeyLinks`, `snapMisalignedLinks` |
| `columnGapScale` | default 1.0 | `applyColumnLayout`: `step *= scale`; `contentWidth = max(SVG_VIEW_WIDTH, xUltimaColonna + margine)` |

**Toolbar** (in `SankeyZoomViewport` o wrapper chart):

```
[Zoom −][Zoom +][Adatta]  |  [V −] V:12 [V +]  |  [H −] H:100% [H +]
```

- Label accessibili (`aria-label` per spacing verticale/orizzontale).
- Disabilitare −/+/ ai limiti del range.

**Relayout:** `useMemo` layout dipende da `[graph, nodePaddingY, columnGapScale]`; `contentKey` zoom include spacing per trigger fit.

### Approcci scartati

| Opzione | Motivo |
|---------|--------|
| Slider unico “Compatto ↔ Ampio” | Non distingue bisogno verticale vs orizzontale |
| Solo spacing senza fix pipeline | Non risolve pancia Avanzo |
| Persistenza localStorage | Fuori scope v1 |

## Architettura

### File coinvolti

| File | Modifica |
|------|----------|
| `lib/cashflow/sankey-layout.ts` | Esportare `pinSingleLinkNodes` o `finalizeLinkAlignment()`; opz. posizionamento surplus |
| `lib/cashflow/sankey-layout.test.ts` | Test pipeline completa + spacing parametrizzato |
| `components/cashflow/cashflow-sankey-chart.tsx` | Parametri spacing, pipeline fix, passa props toolbar |
| `components/cashflow/sankey-zoom-viewport.tsx` | Slot toolbar spacing o componente figlio |
| `components/cashflow/sankey-layout-controls.tsx` | **Nuovo** — pulsanti V/H (opzionale se toolbar resta in viewport) |
| `docs/MANUAL_TEST.md` | Checklist Avanzo + controlli spacing |

### Flusso layout aggiornato

```
d3Sankey(nodePaddingY)
→ applyColumnLayout(columnGapScale, contentWidth dinamico)
→ applyGroupedNodeOrder(nodePaddingY)
→ reorderLayoutLinks → update()
→ resolveSameLevelOverlaps(nodePaddingY)
→ alignSankeyLinks(nodePaddingY)
→ reorderLayoutLinks → update()
→ snapMisalignedLinks(nodePaddingY)
→ finalizeLinkAlignment()   ← pin + applyLinkBreadths, NO reorder dopo
→ chartY1 da max node y1
```

Se `reorderLayoutLinks` resta necessario prima del render, **`finalizeLinkAlignment` deve essere l’ultima mutazione** prima del draw.

### `contentWidth` dinamico

```typescript
const baseSpan = CHART_X1 - CHART_X0;
const scaledSpan = baseSpan * columnGapScale;
const contentWidth = Math.max(SVG_VIEW_WIDTH, CHART_X0 + scaledSpan + 32);
```

`applyColumnLayout` usa `scaledSpan` al posto di `span` per calcolare `step`.

## Comportamenti edge

| Scenario | Comportamento |
|----------|---------------|
| columnGapScale > 1, poche colonne | Grafico più largo; fit zoom adatta |
| nodePaddingY minimo (6) | Colonna compatta; link restano allineati post-fix |
| nodePaddingY massimo (24) | Colonna più alta; `viewHeight` cresce |
| Solo entrate / solo uscite | Controlli spacing funzionano simmetricamente |
| Cambio spacing + pan attivo | Fit automatico resetta vista (coerente con cambio filtro) |

## Test

### Unitari

1. Pipeline post-snap: centro → Avanzo allineato dopo `finalizeLinkAlignment`.
2. `nodePaddingY = 18` propagato a grouped order e align.
3. `columnGapScale = 1.25` aumenta distanza X tra colonne adiacenti.

### Manuale

- [ ] Dati 2026: link Avanzo senza pancia
- [ ] V − / V +: colonna più compatta/ampia, link ancora flush
- [ ] H − / H +: colonne più vicine/lontane, etichette più leggibili
- [ ] Fit dopo cambio spacing
- [ ] Zoom/pan dopo spacing OK

## Fuori scope

- Persistenza spacing in localStorage
- Larghezza nodi (`NODE_WIDTH`) regolabile
- Fill path al posto di stroke per i link
