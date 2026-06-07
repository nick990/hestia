# Cashflow Sankey — Viewport zoomabile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendere l'area del grafico Sankey una canvas navigabile (pan) e zoomabile con fit iniziale automatico e toolbar +/−/Adatta.

**Architecture:** Pure function `computeFitTransform` in `lib/cashflow/sankey-zoom.ts`; componente `SankeyZoomViewport` attacha `d3-zoom` su SVG React con `<g>` interno per il contenuto; `CashflowSankeyChart` delega zoom al viewport e rimuove scroll nativo.

**Tech Stack:** Next.js 16.2.7, React 19.2.4, `d3-zoom@^3`, `d3-selection@^3`, Vitest, shadcn Button, lucide-react.

**Spec:** [`docs/superpowers/specs/2026-06-07-cashflow-sankey-zoom-design.md`](../specs/2026-06-07-cashflow-sankey-zoom-design.md)

---

## File map

| File | Responsabilità |
|------|----------------|
| `lib/cashflow/sankey-zoom.ts` | `computeFitTransform`, costanti zoom |
| `lib/cashflow/sankey-zoom.test.ts` | Unit test fit |
| `components/cashflow/sankey-zoom-viewport.tsx` | Container, ResizeObserver, d3-zoom, toolbar |
| `components/cashflow/cashflow-sankey-chart.tsx` | Contenuto Sankey in `<g>`, usa viewport |
| `components/cashflow/cashflow-sankey-dialog.tsx` | Rimuove `overflow-auto` dal wrapper |
| `docs/MANUAL_TEST.md` | Checklist zoom/pan |
| `package.json` | `d3-zoom`, `d3-selection`, tipi |

---

### Task 0: Dipendenze d3-zoom

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Installa pacchetti**

```bash
npm install d3-zoom@^3.0.0 d3-selection@^3.0.0
npm install -D @types/d3-zoom@^3.0.0 @types/d3-selection@^3.0.0
```

- [ ] **Step 2: Verifica build**

Run: `npm run build`  
Expected: success

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add d3-zoom for Sankey viewport navigation"
```

---

### Task 1: computeFitTransform (TDD)

**Files:**
- Create: `lib/cashflow/sankey-zoom.ts`
- Create: `lib/cashflow/sankey-zoom.test.ts`

- [ ] **Step 1: Scrivi test (falliscono)**

Crea `lib/cashflow/sankey-zoom.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  computeFitTransform,
  SANKEY_ZOOM_MAX,
  SANKEY_ZOOM_MIN,
} from "@/lib/cashflow/sankey-zoom";

describe("computeFitTransform", () => {
  it("scala down contenuto più grande del viewport (landscape)", () => {
    const result = computeFitTransform(800, 400, 960, 800, 24);

    expect(result.k).toBeLessThan(1);
    expect(result.k).toBeGreaterThanOrEqual(SANKEY_ZOOM_MIN);
    expect(result.x).toBeGreaterThan(0);
    expect(result.y).toBeGreaterThan(0);
  });

  it("scala down contenuto più alto del viewport (portrait)", () => {
    const result = computeFitTransform(400, 900, 960, 1200, 24);

    expect(result.k).toBeCloseTo((900 - 48) / 1200, 5);
    expect(result.x).toBeGreaterThan(0);
  });

  it("non upscala contenuto più piccolo del viewport", () => {
    const result = computeFitTransform(800, 600, 400, 300, 24);

    expect(result.k).toBe(1);
    expect(result.x).toBe(200);
    expect(result.y).toBe(150);
  });

  it("rispetta padding sui bordi", () => {
    const result = computeFitTransform(500, 500, 500, 500, 24);

    expect(result.k).toBe(1);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });

  it("non scende sotto SANKEY_ZOOM_MIN", () => {
    const result = computeFitTransform(100, 100, 960, 5000, 24);

    expect(result.k).toBe(SANKEY_ZOOM_MIN);
  });

  it("esporta limiti coerenti con d3 scaleExtent", () => {
    expect(SANKEY_ZOOM_MIN).toBe(0.3);
    expect(SANKEY_ZOOM_MAX).toBe(4);
  });
});
```

- [ ] **Step 2: Esegui test — devono fallire**

Run: `npm test -- lib/cashflow/sankey-zoom.test.ts`  
Expected: FAIL — modulo non trovato

- [ ] **Step 3: Implementa**

Crea `lib/cashflow/sankey-zoom.ts`:

```ts
export const SANKEY_ZOOM_MIN = 0.3;
export const SANKEY_ZOOM_MAX = 4;
export const SANKEY_ZOOM_PADDING = 24;
export const SANKEY_ZOOM_IN_FACTOR = 1.3;
export const SANKEY_ZOOM_OUT_FACTOR = 1 / SANKEY_ZOOM_IN_FACTOR;

export type SankeyZoomTransform = {
  k: number;
  x: number;
  y: number;
};

export function computeFitTransform(
  viewportWidth: number,
  viewportHeight: number,
  contentWidth: number,
  contentHeight: number,
  padding = SANKEY_ZOOM_PADDING,
): SankeyZoomTransform {
  if (
    viewportWidth <= 0 ||
    viewportHeight <= 0 ||
    contentWidth <= 0 ||
    contentHeight <= 0
  ) {
    return { k: 1, x: 0, y: 0 };
  }

  const availableWidth = Math.max(0, viewportWidth - padding * 2);
  const availableHeight = Math.max(0, viewportHeight - padding * 2);

  let k = Math.min(
    availableWidth / contentWidth,
    availableHeight / contentHeight,
  );

  if (k > 1) {
    k = 1;
  }

  k = Math.max(k, SANKEY_ZOOM_MIN);

  const x = (viewportWidth - contentWidth * k) / 2;
  const y = (viewportHeight - contentHeight * k) / 2;

  return { k, x, y };
}
```

- [ ] **Step 4: Esegui test**

Run: `npm test -- lib/cashflow/sankey-zoom.test.ts`  
Expected: PASS (6 test)

- [ ] **Step 5: Commit**

```bash
git add lib/cashflow/sankey-zoom.ts lib/cashflow/sankey-zoom.test.ts
git commit -m "feat(cashflow): add Sankey fit transform helper for zoom viewport"
```

---

### Task 2: SankeyZoomViewport component

**Files:**
- Create: `components/cashflow/sankey-zoom-viewport.tsx`

- [ ] **Step 1: Crea componente viewport**

Crea `components/cashflow/sankey-zoom-viewport.tsx`:

```tsx
"use client";

import { zoom as d3Zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import { select } from "d3-selection";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import {
  computeFitTransform,
  SANKEY_ZOOM_IN_FACTOR,
  SANKEY_ZOOM_MAX,
  SANKEY_ZOOM_MIN,
  SANKEY_ZOOM_OUT_FACTOR,
  type SankeyZoomTransform,
} from "@/lib/cashflow/sankey-zoom";
import { cn } from "@/lib/utils";

type SankeyZoomViewportProps = {
  contentWidth: number;
  contentHeight: number;
  /** Cambia quando il layout/grafico cambia → ricalcola fit */
  contentKey: string;
  children: ReactNode;
  className?: string;
};

function toZoomIdentity(transform: SankeyZoomTransform) {
  return zoomIdentity.translate(transform.x, transform.y).scale(transform.k);
}

export function SankeyZoomViewport({
  contentWidth,
  contentHeight,
  contentKey,
  children,
  className,
}: SankeyZoomViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomLayerRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const fitRef = useRef<SankeyZoomTransform>({ k: 1, x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);

  const recomputeFit = useCallback((): SankeyZoomTransform => {
    const fit = computeFitTransform(
      containerSize.width,
      containerSize.height,
      contentWidth,
      contentHeight,
    );
    fitRef.current = fit;
    return fit;
  }, [containerSize.width, containerSize.height, contentWidth, contentHeight]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setContainerSize({ width, height });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    const layer = zoomLayerRef.current;
    if (!svg || !layer || containerSize.width <= 0 || containerSize.height <= 0) {
      return;
    }

    const fit = recomputeFit();

    const zoom = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent([SANKEY_ZOOM_MIN, SANKEY_ZOOM_MAX])
      .on("zoom", (event) => {
        layer.setAttribute("transform", event.transform.toString());
        setScale(event.transform.k);
      });

    const selection = select(svg);
    selection.call(zoom);
    selection.call(zoom.transform, toZoomIdentity(fit));
    zoomRef.current = zoom;

    return () => {
      selection.on(".zoom", null);
      zoomRef.current = null;
    };
  }, [
    containerSize.width,
    containerSize.height,
    contentWidth,
    contentHeight,
    contentKey,
    recomputeFit,
  ]);

  function handleZoomIn() {
    const svg = svgRef.current;
    const zoom = zoomRef.current;
    if (!svg || !zoom || scale >= SANKEY_ZOOM_MAX) {
      return;
    }
    select(svg)
      .transition()
      .duration(200)
      .call(zoom.scaleBy, SANKEY_ZOOM_IN_FACTOR);
  }

  function handleZoomOut() {
    const svg = svgRef.current;
    const zoom = zoomRef.current;
    if (!svg || !zoom || scale <= SANKEY_ZOOM_MIN) {
      return;
    }
    select(svg)
      .transition()
      .duration(200)
      .call(zoom.scaleBy, SANKEY_ZOOM_OUT_FACTOR);
  }

  function handleFit() {
    const svg = svgRef.current;
    const zoom = zoomRef.current;
    if (!svg || !zoom) {
      return;
    }
    const fit = recomputeFit();
    select(svg)
      .transition()
      .duration(300)
      .call(zoom.transform, toZoomIdentity(fit));
  }

  const canZoomIn = scale < SANKEY_ZOOM_MAX - 0.001;
  const canZoomOut = scale > SANKEY_ZOOM_MIN + 0.001;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative min-h-0 flex-1 overflow-hidden rounded-md border bg-card",
        "cursor-grab touch-none active:cursor-grabbing",
        className,
      )}
    >
      <div
        role="toolbar"
        aria-label="Controlli zoom grafico"
        className="absolute top-2 right-2 z-10 flex gap-1"
      >
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9 bg-background/90"
          aria-label="Zoom avanti"
          disabled={!canZoomIn}
          onClick={handleZoomIn}
        >
          <ZoomIn className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9 bg-background/90"
          aria-label="Zoom indietro"
          disabled={!canZoomOut}
          onClick={handleZoomOut}
        >
          <ZoomOut className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9 bg-background/90"
          aria-label="Adatta al viewport"
          onClick={handleFit}
        >
          <Maximize2 className="size-4" />
        </Button>
      </div>

      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        className="block h-full w-full"
        onWheel={(event) => event.preventDefault()}
      >
        <g ref={zoomLayerRef}>{children}</g>
      </svg>
    </div>
  );
}
```

Nota: `d3-selection`'s `.transition()` richiede `d3-transition` — se la build fallisce, aggiungi `import "d3-transition"` in cima al file (side-effect import che estende selection).

- [ ] **Step 2: Aggiungi d3-transition se necessario**

Se build fallisce su `.transition()`:

```bash
npm install d3-transition@^3.0.0
```

E in cima a `sankey-zoom-viewport.tsx`:

```ts
import "d3-transition";
```

- [ ] **Step 3: Verifica TypeScript**

Run: `npm run build`  
Expected: success (componente non ancora usato ma compila)

- [ ] **Step 4: Commit**

```bash
git add components/cashflow/sankey-zoom-viewport.tsx package.json package-lock.json
git commit -m "feat(cashflow): add SankeyZoomViewport with d3-zoom and toolbar"
```

---

### Task 3: Integra viewport in CashflowSankeyChart

**Files:**
- Modify: `components/cashflow/cashflow-sankey-chart.tsx`

- [ ] **Step 1: Aggiungi import e contentKey**

In cima al file:

```ts
import { SankeyZoomViewport } from "@/components/cashflow/sankey-zoom-viewport";
```

Dopo il calcolo layout, prima del return, aggiungi:

```ts
  const contentKey = useMemo(
    () =>
      graph.nodes
        .filter((n) => !isAuxiliarySankeyNodeId(n.id))
        .map((n) => `${n.id}:${n.value}`)
        .join("|"),
    [graph],
  );
```

- [ ] **Step 2: Refactor JSX — viewport + g interno**

Sostituisci il blocco return (da `return (` fino alla chiusura) con:

```tsx
  return (
    <div className={cn("flex h-full min-h-0 flex-col gap-3", className)}>
      {hovered ? (
        <p className="shrink-0 text-sm">
          <span className="font-medium">{hovered.label}</span>{" "}
          <span className="text-muted-foreground">{hovered.detail}</span>
        </p>
      ) : null}

      <SankeyZoomViewport
        contentWidth={SVG_VIEW_WIDTH}
        contentHeight={viewHeight}
        contentKey={contentKey}
      >
        {sankeyLayout.links.map((link, index) => {
          const layoutLink = link as LayoutLink;
          if (isAuxiliaryLink(layoutLink)) {
            return null;
          }
          const path = sankeyLinkHorizontal()(layoutLink);
          if (!path) {
            return null;
          }
          const sourceNode = layoutLink.source as LayoutNode;
          const sourceKind =
            typeof sourceNode === "object" && sourceNode !== null
              ? sourceNode.kind
              : "center";
          const midpoint = getLinkMidpoint(layoutLink);

          return (
            <g key={`link-${index}`}>
              <path
                d={path}
                fill="none"
                stroke={nodeFill(sourceKind)}
                strokeOpacity={0.35}
                strokeWidth={Math.max(1, layoutLink.width ?? 1)}
              />
              <text
                x={midpoint.x}
                y={midpoint.y}
                dy="0.35em"
                textAnchor="middle"
                className="fill-foreground text-[10px] font-medium"
                paintOrder="stroke"
                stroke="var(--card, #fff)"
                strokeWidth={3}
              >
                {formatEuro(layoutLink.value)}
              </text>
            </g>
          );
        })}

        {sankeyLayout.nodes.map((node) => {
          const n = node as LayoutNode;
          if (isAuxiliarySankeyNodeId(n.id)) {
            return null;
          }
          const tooltipPath = n.fullPath ?? n.label;
          const isCenter = n.kind === "center";
          const labelX = isCenter
            ? ((n.x0 ?? 0) + (n.x1 ?? 0)) / 2
            : (n.x0 ?? 0) < SVG_VIEW_WIDTH / 2
              ? (n.x1 ?? 0) + 6
              : (n.x0 ?? 0) - 6;
          return (
            <g key={n.id}>
              <rect
                x={n.x0 ?? 0}
                y={n.y0 ?? 0}
                width={Math.max(1, (n.x1 ?? 0) - (n.x0 ?? 0))}
                height={Math.max(1, (n.y1 ?? 0) - (n.y0 ?? 0))}
                fill={nodeFill(n.kind)}
                stroke={isCenter ? "var(--border, hsl(0 0% 80%))" : undefined}
                strokeWidth={isCenter ? 2 : 0}
                rx={isCenter ? 4 : 2}
                onMouseEnter={() =>
                  setHovered({
                    label: tooltipPath,
                    detail: formatEuro(n.value ?? 0),
                  })
                }
                onMouseLeave={() => setHovered(null)}
              />
              {n.label ? (
                <text
                  x={labelX}
                  y={((n.y0 ?? 0) + (n.y1 ?? 0)) / 2}
                  textAnchor={
                    isCenter
                      ? "middle"
                      : (n.x0 ?? 0) < SVG_VIEW_WIDTH / 2
                        ? "start"
                        : "end"
                  }
                  className={cn(
                    isCenter
                      ? "fill-background text-[12px] font-semibold"
                      : "fill-foreground text-[11px]",
                  )}
                >
                  <tspan x={labelX} dy={isCenter ? "-0.45em" : "-0.35em"}>
                    {truncateSankeyLabel(n.label)}
                  </tspan>
                  <tspan
                    x={labelX}
                    dy="1.2em"
                    className={
                      isCenter
                        ? "fill-background/90 text-[11px] font-medium"
                        : "fill-muted-foreground text-[10px] font-normal"
                    }
                  >
                    {formatEuro(n.value ?? 0)}
                  </tspan>
                </text>
              ) : null}
            </g>
          );
        })}
      </SankeyZoomViewport>
    </div>
  );
```

Rimuovi:
- `<div className="overflow-x-auto rounded-md border bg-card">`
- `<svg viewBox=... preserveAspectRatio=... min-h-[calc(100dvh-12rem)]>`
- Il wrapper `<g>` esterno non serve — i children vanno direttamente nel viewport (che crea il `<g ref={zoomLayerRef}>`)

- [ ] **Step 3: Verifica build e test**

Run: `npm test && npm run build`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add components/cashflow/cashflow-sankey-chart.tsx
git commit -m "feat(cashflow): wrap Sankey chart in zoomable viewport"
```

---

### Task 4: Aggiorna dialog wrapper

**Files:**
- Modify: `components/cashflow/cashflow-sankey-dialog.tsx`

- [ ] **Step 1: Rimuovi overflow-auto dal wrapper chart**

In `cashflow-sankey-dialog.tsx`, sostituisci:

```tsx
        <div className="min-h-0 flex-1 overflow-auto">
          <CashflowSankeyChart graph={graph} className="h-full" />
        </div>
```

Con:

```tsx
        <div className="flex min-h-0 flex-1 flex-col">
          <CashflowSankeyChart graph={graph} className="h-full min-h-0" />
        </div>
```

- [ ] **Step 2: Verifica build**

Run: `npm run build`  
Expected: success

- [ ] **Step 3: Commit**

```bash
git add components/cashflow/cashflow-sankey-dialog.tsx
git commit -m "fix(cashflow): delegate Sankey scroll to zoom viewport"
```

---

### Task 5: Documentazione test manuale

**Files:**
- Modify: `docs/MANUAL_TEST.md`

- [ ] **Step 1: Aggiungi sezione zoom**

Dopo la sezione «Ordinamento nodi raggruppato per padre», aggiungi:

```markdown
### Viewport zoom e pan

- [ ] Apertura modale → grafico intero visibile (fit automatico)
- [ ] Drag → pan fluido; cursore grab/grabbing
- [ ] Rotella mouse → zoom sul puntatore; la modale non scrolla
- [ ] Pinch su mobile/tablet
- [ ] Pulsante **+** → zoom avanti; disabilitato al massimo
- [ ] Pulsante **−** → zoom indietro; disabilitato al minimo
- [ ] Pulsante **Adatta** → reset al fit iniziale
- [ ] Hover nodo dopo zoom → tooltip corretto
- [ ] Cambio filtro con modale aperta → fit ricalcolato sul nuovo grafico
```

- [ ] **Step 2: Commit**

```bash
git add docs/MANUAL_TEST.md
git commit -m "docs: add manual test checklist for Sankey zoom viewport"
```

---

## Spec coverage

| Requisito | Task |
|-----------|------|
| Z1 Fit iniziale + cambio grafo | Task 1, 2, 3 (`contentKey`) |
| Z2 Pan drag/touch | Task 2 (d3-zoom default) |
| Z3 Wheel/pinch | Task 2 |
| Z4 Toolbar +/−/Adatta | Task 2 |
| Z5 Zoom ±30% animato | Task 2 (`SANKEY_ZOOM_IN/OUT_FACTOR`) |
| Z6 Adatta animato | Task 2 (`handleFit`) |
| Z7 Limiti 0.3–4 | Task 1, 2 |
| Z8 Wheel preventDefault | Task 2 (`onWheel`) |
| Z9 Hover invariato | Task 3 (eventi su rect in g zoomato) |
| Z10 Cursore grab | Task 2 (className container) |
| Z11 aria-label | Task 2 (toolbar buttons) |
| Z12 Ricalcolo fit su filtri | Task 3 (`contentKey`) |

## Verifica finale

Run: `npm test && npm run build`  
Expected: tutti i test PASS, build success

Test manuale rapido:
1. Apri cashflow → Grafico Sankey
2. Verifica fit iniziale
3. Zoom, pan, Adatta
4. Hover nodo dopo zoom
