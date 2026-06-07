# Cashflow — Flussi Sankey modalità Dritto (nastro trapezoidale)

**Data:** 2026-06-07  
**Stato:** Approvato

## Problema

Con toggle **Dritto**, i flussi sembrano partire/arrivare nei punti sbagliati sui nodi (screenshot maggio 2026, V=26, H=50).

## Causa

Implementazione attuale: segmento diagonale `M (x1,y0) L (x0,y1)` con `strokeWidth = link.width`.

Lo stroke cresce **perpendicolarmente** alla diagonale, non in verticale rispetto alla faccia del nodo. Con `y0 ≠ y1` il bordo visivo del flusso non è flush sul rettangolo del nodo.

**Curvo** funziona perché `linkHorizontal` (d3-shape) ha tangenti orizzontali ai nodi.

## Soluzione (approccio A)

In modalità **Dritto**, disegnare un **nastro trapezoidale** (path chiuso) che collega la fascia sorgente alla fascia destinazione con lati dritti.

### Geometria

Per ogni link, dati layout invariati (`source.x1`, `target.x0`, `y0`, `y1`, `width`):

```
w  = max(1, width)
x0 = source.x1
x1 = target.x0

Path (senso orario):
  M x0, y0 - w/2
  L x1, y1 - w/2
  L x1, y1 + w/2
  L x0, y0 + w/2
  Z
```

### Rendering

| Modalità | Path | Stile |
|----------|------|--------|
| **Curvo** | Bézier `linkHorizontal` (invariato) | `stroke`, `strokeWidth = width`, `fill = none` |
| **Dritto** | Trapezio chiuso sopra | `fill` con opacità, `stroke = none` |

Hover (invariato come comportamento):
- Opacità fill/stroke maggiore
- Label valore al midpoint `( (x0+x1)/2, (y0+y1)/2 )`
- Hit area: path chiuso con `fill="transparent"` o path duplicato con area minima

## Architettura

### `lib/cashflow/sankey-link-path.ts`

- Aggiungere `straightRibbonPath(link)` che restituisce path chiuso `Z`
- `createSankeyLinkPath("straight")` usa `straightRibbonPath` al posto del segmento diagonale
- Esportare helper `isStraightRibbonMode(mode)` se utile al chart

### `components/cashflow/cashflow-sankey-chart.tsx` — `SankeyFlowLink`

- Prop aggiuntiva `linkPathMode: SankeyLinkPathMode` (o `filled: boolean`)
- **Dritto:** `<path fill={stroke} fillOpacity={...} stroke="none" />` + hit path con fill transparent
- **Curvo:** comportamento attuale (stroke)

### Test — `lib/cashflow/sankey-link-path.test.ts`

Fixture: `y0=50, y1=80, width=20, x1=100, x0=200`

- Path inizia con `M100,40` (y0 - w/2)
- Contiene vertici `200,70` e `200,90` e chiusura `Z`
- Path chiuso (regex `/Z$/`)

## Requisiti

| ID | Requisito |
|----|-----------|
| R1 | Dritto: bordo sinistro del nastro allineato a `x = source.x1`, estensione verticale `[y0 ± width/2]` |
| R2 | Dritto: bordo destro analogo su `target.x0`, `[y1 ± width/2]` |
| R3 | Curvo: comportamento identico a oggi |
| R4 | Hover valore/opacità funziona in entrambe le modalità |
| R5 | Nessun cambiamento al layout nodi/link (`y0`, `y1`, `width`) |

## Fuori scope

- Layout link / spacing V/H
- Slider curvatura
- Modalità ortogonale
- Migrazione curvo a fill (opzionale futuro)

## Note

- Il midpoint label resta su media di `y0` e `y1` (centro fascia), non centroide del trapezio — sufficiente per label hover.
- Colori: stesso `nodeFill(sourceKind)` del flusso curvo.
