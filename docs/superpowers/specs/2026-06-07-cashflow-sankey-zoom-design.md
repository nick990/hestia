# Cashflow — Sankey viewport zoomabile e navigabile

**Data:** 2026-06-07  
**Stato:** Approvato

## Contesto

Il grafico Sankey cashflow è mostrato in una modale fullscreen. Oggi l'SVG usa `viewBox` + `preserveAspectRatio="xMidYMid meet"` e il wrapper ha `overflow-x-auto` per scroll orizzontale su mobile. Con gerarchie profonde o molte categorie, il grafico supera il viewport e l'esplorazione è limitata allo scroll nativo.

L'utente vuole un'**area canvas navigabile e zoomabile** (pan + zoom) con controlli UI espliciti.

Decisioni prese in brainstorming:

- **Vista iniziale:** fit automatico — intero grafico visibile e centrato all'apertura.
- **Controlli:** gesti (drag, rotella, pinch) **+** pulsanti UI **+**, **−**, **Adatta**.
- **Approccio tecnico:** `d3-zoom` su `<g>` interno SVG (best practice d3, coerente con `d3-sankey`).

## Obiettivi

1. Esplorare grafici Sankey grandi senza uscire dalla modale.
2. Mostrare il quadro d'insieme al primo render (fit).
3. Permettere zoom su dettagli (rami, etichette link) mantenendo hover/tooltip sui nodi.
4. Offrire reset rapido al fit via pulsante **Adatta**.

## Requisiti

| ID | Requisito |
|----|-----------|
| Z1 | All'apertura modale (e al cambio dati filtrati): fit automatico con padding ~24px |
| Z2 | Pan via drag mouse / touch |
| Z3 | Zoom via rotella mouse / pinch touch, centrato sul puntatore |
| Z4 | Pulsanti **+**, **−**, **Adatta** sempre visibili (toolbar alto-destra del viewport) |
| Z5 | **+** / **−**: zoom animato ~±30% rispetto al livello corrente |
| Z6 | **Adatta**: reset al fit iniziale (animato) |
| Z7 | Limiti zoom: min ~0.3×, max ~4× |
| Z8 | Rotella sul viewport: non scrolla la modale (`preventDefault`) |
| Z9 | Hover nodi e tooltip invariati dopo pan/zoom |
| Z10 | Cursore `grab` / `grabbing` sul viewport durante pan |
| Z11 | Pulsanti con `aria-label` accessibili |
| Z12 | Ricalcolo fit quando cambia il grafo (filtri con modale aperta) |

## UX

### Interazioni

| Azione | Comportamento |
|--------|---------------|
| Apertura modale | Fit: tutto il grafico visibile, centrato |
| Drag | Pan |
| Rotella / pinch | Zoom verso puntatore |
| **+** | Zoom in ×1.3 (transizione ~200ms) |
| **−** | Zoom out ×0.77 (transizione ~200ms) |
| **Adatta** | Torna al fit iniziale (transizione ~300ms) |
| Cambio filtri | Reset fit sul nuovo layout |

### Toolbar

- Posizione: angolo **alto-destra** del viewport chart, sopra l'SVG (`position: absolute`).
- Stile: icon buttons shadcn (`Button variant="outline" size="icon"`), gruppo compatto.
- Icone: `ZoomIn`, `ZoomOut`, `Maximize2` (o equivalente lucide per Adatta).

## Approccio scelto

**d3-zoom su `<g>` interno** (approccio A del brainstorming).

### Struttura SVG

```html
<div class="sankey-viewport">  <!-- ResizeObserver, d3-zoom target -->
  <div class="toolbar">+ − Adatta</div>
  <svg width="100%" height="100%">
    <g class="zoom-layer" transform="translate(x,y) scale(k)">
      <!-- link, nodi, etichette -->
    </g>
  </svg>
</div>
```

- Il **viewport** ha dimensioni fisse (container modale).
- L'SVG ha `viewBox="0 0 {contentW} {contentH}"` corrispondente al layout Sankey.
- `d3-zoom` aggiorna `transform` del `<g class="zoom-layer">`.

### Calcolo fit

Pure function in `lib/cashflow/sankey-zoom.ts`:

```ts
export function computeFitTransform(
  viewportWidth: number,
  viewportHeight: number,
  contentWidth: number,
  contentHeight: number,
  padding?: number,
): { k: number; x: number; y: number }
```

Algoritmo:

1. `scale = min((viewportW - 2×pad) / contentW, (viewportH - 2×pad) / contentH)`
2. Se `scale > 1` (contenuto più piccolo del viewport) → `scale = 1` (nessun upscale al fit)
3. `scale = max(scale, minScale)` — non scendere sotto 0.3×
4. Centra: `x = (viewportW - contentW × scale) / 2`, `y = (viewportH - contentH × scale) / 2`

### Attach d3-zoom (React)

In `sankey-zoom-viewport.tsx`:

```ts
const zoom = d3Zoom<SVGSVGElement, unknown>()
  .scaleExtent([0.3, 4])
  .on("zoom", (event) => {
    zoomLayer.attr("transform", event.transform);
  });

selection.call(zoom);
selection.call(zoom.transform, fitTransform); // init
```

- `useEffect` attach/detach su mount/unmount e resize.
- `ResizeObserver` sul container → ricalcola fit se dimensioni cambiano (solo se in stato "fit", altrimenti mantieni zoom utente — per semplicità v1: ricalcola fit solo al cambio grafo, non al resize finestra).

### Wheel e modale

- Applicare zoom behavior sul `<svg>` o container con `.wheelDelta` filter.
- `event.preventDefault()` nella callback wheel per evitare scroll del `DialogContent`.

### Approcci scartati

| Opzione | Motivo esclusione |
|---------|-------------------|
| `svg-pan-zoom` | Dipendenza extra; API imperativa; meno coerente col stack d3 |
| `react-zoom-pan-pinch` | CSS transform su wrapper HTML; coordinate hover SVG meno affidabili |
| Scroll nativo (`overflow-auto`) | Già presente; non offre zoom; UX insufficiente per grafici grandi |

## Architettura

### File

| File | Modifica |
|------|----------|
| `lib/cashflow/sankey-zoom.ts` | **Nuovo** — `computeFitTransform`, helper `transformToString` |
| `lib/cashflow/sankey-zoom.test.ts` | **Nuovo** — test unitari fit |
| `components/cashflow/sankey-zoom-viewport.tsx` | **Nuovo** — viewport, d3-zoom, toolbar |
| `components/cashflow/cashflow-sankey-chart.tsx` | Refactor: SVG content in `<g>`, rimuove `overflow-x-auto`, accetta `contentWidth`/`contentHeight` |
| `components/cashflow/cashflow-sankey-dialog.tsx` | Wrapper chart: `min-h-0 flex-1` senza `overflow-auto` |
| `package.json` | `d3-zoom`, `@types/d3-zoom` |

### Flusso

```
Dialog → SankeyZoomViewport → CashflowSankeyChart (SVG + g.zoom-layer)
                ↓
         d3-zoom attach + fit init
                ↓
         toolbar +/−/Adatta → zoom.scaleBy / zoom.transform
```

## Comportamenti edge

| Scenario | Comportamento |
|----------|---------------|
| Grafico piccolo (entra nel viewport) | Fit a k ≤ 1, centrato con padding |
| Grafico molto alto | Fit con k < 1; utente zooma per dettaglio |
| Zero link / empty state | Nessun viewport zoom; messaggio esistente |
| Modale chiusa e riaperta | Fit fresh all'apertura |
| Zoom massimo raggiunto | Pulsante **+** disabilitato o no-op |
| Zoom minimo raggiunto | Pulsante **−** disabilitato o no-op |
| Mobile touch | Pinch nativo d3-zoom; toolbar tap-friendly (min 44px touch target) |

## Accessibilità

- Toolbar: `role="toolbar"`, `aria-label="Controlli zoom grafico"`.
- Pulsanti: `aria-label="Zoom avanti"`, `"Zoom indietro"`, `"Adatta al viewport"`.
- Pan: non dipende da hover-only; touch supportato.

## Test

### Unitari (`sankey-zoom.test.ts`)

1. Fit landscape: viewport più largo che alto.
2. Fit portrait: viewport più alto che largo.
3. Contenuto più piccolo del viewport → k ≤ 1, centrato.
4. Padding applicato correttamente.

### Manuale (`MANUAL_TEST.md`)

- [ ] Apertura modale → grafico intero visibile (fit).
- [ ] Drag → pan fluido.
- [ ] Rotella → zoom sul puntatore; modale non scrolla.
- [ ] Pinch su mobile.
- [ ] Pulsanti +/−/Adatta.
- [ ] Hover nodo dopo zoom → tooltip corretto.
- [ ] Cambio filtro con modale aperta → fit aggiornato.

## Fuori scope

- Mini-map / overview navigator.
- Doppio click zoom.
- Export PNG/PDF.
- Zoom riutilizzabile su altri chart oltre Sankey (v1 solo cashflow Sankey).
