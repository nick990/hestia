# Cashflow Sankey — Fix allineamento + controlli spacing

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminare la pancia sul link centro → Avanzo e aggiungere controlli toolbar per spacing verticale (6–24px) e orizzontale (0.75–1.5×).

**Architecture:** `finalizeLinkAlignment()` come ultimo passo layout (pin + breadth, senza reorder dopo). Spacing parametrizzato in `useMemo` layout; toolbar V/H accanto a zoom con fit su cambio `contentKey`.

**Spec:** [`docs/superpowers/specs/2026-06-07-cashflow-sankey-layout-spacing-design.md`](../specs/2026-06-07-cashflow-sankey-layout-spacing-design.md)

**Tech Stack:** TypeScript, Vitest, React 19, d3-sankey, shadcn Button.

---

## File map

| File | Responsabilità |
|------|----------------|
| `lib/cashflow/sankey-layout.ts` | `finalizeLinkAlignment`, export pin logic |
| `lib/cashflow/sankey-layout.test.ts` | Pipeline finale + spacing |
| `lib/cashflow/sankey-layout-config.ts` | **Nuovo** — costanti range V/H |
| `components/cashflow/sankey-layout-controls.tsx` | **Nuovo** — toolbar V/H |
| `components/cashflow/cashflow-sankey-chart.tsx` | State spacing, pipeline, contentWidth dinamico |
| `components/cashflow/sankey-zoom-viewport.tsx` | Slot `toolbarExtra` per controlli spacing |
| `docs/MANUAL_TEST.md` | Checklist |

---

### Task 1: `finalizeLinkAlignment` + fix pipeline (TDD)

**Files:**
- Modify: `lib/cashflow/sankey-layout.ts`
- Test: `lib/cashflow/sankey-layout.test.ts`

- [ ] **Step 1: Test pipeline completa post-snap**

```ts
describe("finalizeLinkAlignment", () => {
  it("allinea centro → Avanzo dopo reorder+update simulati", () => {
    // ... fixture surplus come test esistente ...
    alignSankeyLinks({ nodes }, { nodePadding: 12, iterations: 6 });
    reorderLayoutLinks({ nodes });
    applyLinkBreadths({ nodes });
    // simula update d3
    finalizeLinkAlignment({ nodes });
    expect(Math.abs((surplusLink.y0 ?? 0) - (surplusLink.y1 ?? 0))).toBeLessThan(1);
  });
});
```

- [ ] **Step 2: Implementa export**

```ts
export function finalizeLinkAlignment(layout: { nodes: ... }): void {
  applyLinkBreadths(layout);
  pinSingleLinkNodes(layout);
  applyLinkBreadths(layout);
  syncAuxiliaryNodePositions(layout.nodes);
}
```

Rimuovi duplicato finale da `snapMisalignedLinks` (delega a stessa logica o chiama `finalizeLinkAlignment`).

- [ ] **Step 3: Run tests** — `npm test -- lib/cashflow/sankey-layout.test.ts`

- [ ] **Step 4: Aggiorna chart** — rimuovi ultimo `reorderLayoutLinks` + `update()` post-snap; aggiungi `finalizeLinkAlignment(result)` come ultimo passo.

---

### Task 2: Config spacing + layout parametrizzato

**Files:**
- Create: `lib/cashflow/sankey-layout-config.ts`
- Modify: `components/cashflow/cashflow-sankey-chart.tsx`

- [ ] **Step 1: Costanti**

```ts
export const SANKEY_NODE_PADDING_DEFAULT = 12;
export const SANKEY_NODE_PADDING_MIN = 6;
export const SANKEY_NODE_PADDING_MAX = 24;
export const SANKEY_NODE_PADDING_STEP = 2;

export const SANKEY_COLUMN_GAP_DEFAULT = 1;
export const SANKEY_COLUMN_GAP_MIN = 0.75;
export const SANKEY_COLUMN_GAP_MAX = 1.5;
export const SANKEY_COLUMN_GAP_STEP = 0.05;
```

- [ ] **Step 2: Parametrizza `applyColumnLayout`**

Aggiungi `columnGapScale` e usa `scaledSpan = (x1 - x0) * columnGapScale` per `step`.

Calcola `contentWidth = Math.max(SVG_VIEW_WIDTH, Math.ceil(maxNodeX1) + 32)`.

- [ ] **Step 3: `useMemo` layout** dipende da `nodePaddingY`, `columnGapScale`; sostituisci `NODE_PADDING` ovunque nel pipeline.

- [ ] **Step 4: `contentKey`** include `v${nodePaddingY}|h${columnGapScale}`.

---

### Task 3: Toolbar controlli spacing

**Files:**
- Create: `components/cashflow/sankey-layout-controls.tsx`
- Modify: `components/cashflow/sankey-zoom-viewport.tsx`
- Modify: `components/cashflow/cashflow-sankey-chart.tsx`

- [ ] **Step 1: `SankeyLayoutControls`**

Props: `nodePaddingY`, `columnGapScale`, `onNodePaddingChange`, `onColumnGapChange`.

UI: due gruppi `[−] V:12 [+]` e `[−] H:100% [+]` con Button outline size icon/sm.

- [ ] **Step 2: `SankeyZoomViewport`** accetta `toolbarExtra?: ReactNode` renderizzato nella toolbar.

- [ ] **Step 3: Chart** — `useState` per spacing default; passa controlli a viewport.

---

### Task 4: MANUAL_TEST + verify

- [ ] Aggiorna checklist Avanzo 2026 + controlli V/H
- [ ] `npm test` — tutti pass

---

## Spec coverage

| Req | Task |
|-----|------|
| F1–F3 | Task 1 |
| F4–F5, F7–F9 | Task 2 |
| F6, F8 | Task 3 |
| Manuale | Task 4 |
