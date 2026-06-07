# Cashflow Sankey — Allineamento link post-ordinamento

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ripristinare `link.y0 ≈ link.y1` sui link cross-colonna dopo l'ordinamento nodi raggruppato per padre, eliminando artefatti visivi ai bordi del Sankey.

**Architecture:** Nuova funzione `alignSankeyLinks()` in `lib/cashflow/sankey-layout.ts` porta la relaxation di d3-sankey (`targetTop`/`sourceTop`, `relaxLeftToRight`/`relaxRightToLeft`, `resolveCollisions`) senza re-sort delle colonne. Il chart la invoca dopo `resolveSameLevelOverlaps`, poi `reorderLayoutLinks` + `update()`.

**Tech Stack:** TypeScript, Vitest, `d3-sankey@^0.12.3`, React 19 Client Component.

**Spec:** [`docs/superpowers/specs/2026-06-07-cashflow-sankey-link-alignment-design.md`](../specs/2026-06-07-cashflow-sankey-link-alignment-design.md)

---

## File map

| File | Responsabilità |
|------|----------------|
| `lib/cashflow/sankey-layout.ts` | `alignSankeyLinks`, helper relaxation, `syncAuxiliaryNodePositions` |
| `lib/cashflow/sankey-layout.test.ts` | Test allineamento, ordine preservato, altezze, ausiliari |
| `components/cashflow/cashflow-sankey-chart.tsx` | Integrazione nel pipeline layout |
| `docs/MANUAL_TEST.md` | Checklist verifica visiva link allineati |

---

### Task 1: Helper `targetTop` / `sourceTop` (TDD)

**Files:**
- Modify: `lib/cashflow/sankey-layout.ts`
- Test: `lib/cashflow/sankey-layout.test.ts`

- [ ] **Step 1: Scrivi test helper (falliscono)**

Aggiungi in `lib/cashflow/sankey-layout.test.ts`:

```ts
import {
  alignSankeyLinks,
  computeSankeyTargetTop,
  computeSankeySourceTop,
  syncAuxiliaryNodePositions,
  type LayoutNodeWithLinks,
} from "@/lib/cashflow/sankey-layout";

describe("computeSankeyTargetTop / computeSankeySourceTop", () => {
  it("targetTop posiziona la fascia al centro dello stack sourceLinks", () => {
    const source: LayoutNodeWithLinks = {
      id: "income:monade",
      label: "monade",
      fullPath: "monade",
      kind: "income",
      value: 100,
      level: 1,
      directAmount: 0,
      y0: 50,
      y1: 150,
      sourceLinks: [],
      targetLinks: [],
    };
    const center: LayoutNodeWithLinks = {
      id: "center",
      label: "Disponibilità",
      fullPath: null,
      kind: "center",
      value: 200,
      level: 0,
      directAmount: 0,
      y0: 80,
      y1: 280,
      sourceLinks: [],
      targetLinks: [],
    };

    const linkToCenter: LayoutAdjacencyLink = {
      source,
      target: center,
      width: 40,
      value: 100,
    };
    const linkOther: LayoutAdjacencyLink = {
      source,
      target: { id: "other", y0: 0 } as LayoutAdjacencyLink["target"],
      width: 20,
      value: 50,
    };

    source.sourceLinks = [linkOther, linkToCenter];
    center.targetLinks = [linkToCenter];

    // Primo link occupa y 50..70; secondo link (to center) centro a 50+20+12+20 = 102? 
    // targetTop: y = source.y0 - (n-1)*py/2 + widths before target
    const py = 12;
    const top = computeSankeyTargetTop(source, center, py);
    expect(top).toBe(50 - 12 / 2 + 20 + 12); // 50 - 6 + 32 = 76
  });
});
```

- [ ] **Step 2: Esegui test — deve fallire**

Run: `npm test -- lib/cashflow/sankey-layout.test.ts -t "computeSankeyTargetTop" 2>&1 | tail -20`  
Expected: FAIL — `computeSankeyTargetTop is not exported`

- [ ] **Step 3: Implementa helper**

Aggiungi in `lib/cashflow/sankey-layout.ts` (prima di `reorderLayoutLinks`):

```ts
type RelaxNode = LayoutNodeWithLinks & {
  sourceLinks: LayoutAdjacencyLink[];
  targetLinks: LayoutAdjacencyLink[];
};

/** Y ideale del target per allineare un link in uscita da source (port da d3-sankey). */
export function computeSankeyTargetTop(
  source: RelaxNode,
  target: RelaxNode,
  nodePadding: number,
): number {
  let y = source.y0! - ((source.sourceLinks.length - 1) * nodePadding) / 2;
  for (const link of source.sourceLinks) {
    if (link.target === target) {
      break;
    }
    y += (link.width ?? 0) + nodePadding;
  }
  for (const link of target.targetLinks) {
    if (link.source === source) {
      break;
    }
    y -= link.width ?? 0;
  }
  return y;
}

/** Y ideale del source per allineare un link in entrata su target (port da d3-sankey). */
export function computeSankeySourceTop(
  source: RelaxNode,
  target: RelaxNode,
  nodePadding: number,
): number {
  let y = target.y0! - ((target.targetLinks.length - 1) * nodePadding) / 2;
  for (const link of target.targetLinks) {
    if (link.source === source) {
      break;
    }
    y += (link.width ?? 0) + nodePadding;
  }
  for (const link of source.sourceLinks) {
    if (link.target === target) {
      break;
    }
    y -= link.width ?? 0;
  }
  return y;
}
```

- [ ] **Step 4: Esegui test — deve passare**

Run: `npm test -- lib/cashflow/sankey-layout.test.ts -t "computeSankeyTargetTop" 2>&1 | tail -20`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/cashflow/sankey-layout.ts lib/cashflow/sankey-layout.test.ts
git commit -m "$(cat <<'EOF'
feat(cashflow): add Sankey link alignment helpers from d3-sankey

EOF
)"
```

---

### Task 2: `alignSankeyLinks` — allineamento cross-colonna (TDD)

**Files:**
- Modify: `lib/cashflow/sankey-layout.ts`
- Test: `lib/cashflow/sankey-layout.test.ts`

- [ ] **Step 1: Scrivi test allineamento (fallisce)**

Aggiungi in `lib/cashflow/sankey-layout.test.ts`:

```ts
function columnIndex(node: { x0?: number }, x0Values: number[]): number {
  return x0Values.indexOf(node.x0 ?? 0);
}

describe("alignSankeyLinks", () => {
  it("allinea y0 e y1 su link cross-colonna disallineati", () => {
    const center: LayoutNodeWithLinks = {
      id: "center",
      label: "Disponibilità",
      fullPath: null,
      kind: "center",
      value: 100,
      level: 0,
      directAmount: 0,
      x0: 400,
      x1: 490,
      y0: 200,
      y1: 300,
      sourceLinks: [],
      targetLinks: [],
    };
    const monade: LayoutNodeWithLinks = {
      id: "income:monade",
      label: "monade",
      fullPath: "monade",
      kind: "income",
      value: 100,
      level: 1,
      directAmount: 0,
      x0: 500,
      x1: 516,
      y0: 8,
      y1: 108,
      sourceLinks: [],
      targetLinks: [],
    };

    const link: LayoutAdjacencyLink = {
      source: monade,
      target: center,
      width: 50,
      value: 100,
      y0: 33, // disallineato volutamente
      y1: 250,
    };

    monade.sourceLinks = [link];
    center.targetLinks = [link];

    const layout = { nodes: [center, monade] };

    alignSankeyLinks(layout, {
      nodePadding: 12,
      iterations: 6,
      extentTop: 0,
      extentBottom: 600,
    });

    applyLinkBreadthsForTest([monade, center]);

    expect(Math.abs((link.y0 ?? 0) - (link.y1 ?? 0))).toBeLessThan(1);
  });

  it("preserva ordine verticale nodi nella colonna", () => {
    const a: LayoutNodeWithLinks = {
      id: "income:a",
      label: "a",
      fullPath: "a",
      kind: "income",
      value: 80,
      level: 1,
      directAmount: 0,
      x0: 500,
      x1: 516,
      y0: 8,
      y1: 88,
      sourceLinks: [],
      targetLinks: [],
    };
    const b: LayoutNodeWithLinks = {
      id: "income:b",
      label: "b",
      fullPath: "b",
      kind: "income",
      value: 60,
      level: 1,
      directAmount: 0,
      x0: 500,
      x1: 516,
      y0: 100,
      y1: 160,
      sourceLinks: [],
      targetLinks: [],
    };

    const orderBefore = [a.id, b.id];
    const layout = { nodes: [a, b] };

    alignSankeyLinks(layout, {
      nodePadding: 12,
      iterations: 6,
      extentTop: 0,
      extentBottom: 600,
    });

    const sorted = [...layout.nodes]
      .filter((n) => n.x0 === 500)
      .sort((x, y) => (x.y0 ?? 0) - (y.y0 ?? 0));
    expect(sorted.map((n) => n.id)).toEqual(orderBefore);
  });

  it("preserva altezze nodi", () => {
    const node: LayoutNodeWithLinks = {
      id: "income:monade",
      label: "monade",
      fullPath: "monade",
      kind: "income",
      value: 100,
      level: 1,
      directAmount: 0,
      x0: 500,
      x1: 516,
      y0: 8,
      y1: 108,
      sourceLinks: [],
      targetLinks: [],
    };
    const heightBefore = (node.y1 ?? 0) - (node.y0 ?? 0);
    const layout = { nodes: [node] };

    alignSankeyLinks(layout, {
      nodePadding: 12,
      iterations: 6,
      extentTop: 0,
      extentBottom: 600,
    });

    expect((node.y1 ?? 0) - (node.y0 ?? 0)).toBe(heightBefore);
  });
});
```

- [ ] **Step 2: Esegui test — deve fallire**

Run: `npm test -- lib/cashflow/sankey-layout.test.ts -t "alignSankeyLinks" 2>&1 | tail -20`  
Expected: FAIL — `alignSankeyLinks is not exported`

- [ ] **Step 3: Implementa `alignSankeyLinks`**

Aggiungi tipi ed export in `lib/cashflow/sankey-layout.ts`:

```ts
export type AlignSankeyLinksOptions = {
  nodePadding: number;
  iterations?: number;
  extentTop: number;
  extentBottom: number;
};

function shiftNodeY(node: RelaxNode, dy: number): void {
  if (Math.abs(dy) <= 1e-6) {
    return;
  }
  node.y0 = (node.y0 ?? 0) + dy;
  node.y1 = (node.y1 ?? 0) + dy;
}

function reorderNodeLinksForRelax(node: RelaxNode): void {
  for (const link of node.targetLinks) {
    link.source.sourceLinks?.sort(
      (a, b) => (a.target.y0 ?? 0) - (b.target.y0 ?? 0),
    );
  }
  for (const link of node.sourceLinks) {
    link.target.targetLinks?.sort(
      (a, b) => (a.source.y0 ?? 0) - (b.source.y0 ?? 0),
    );
  }
}

function columnSpan(source: RelaxNode, target: RelaxNode): number {
  return Math.max(1, Math.abs((target.x0 ?? 0) - (source.x0 ?? 0)));
}

function resolveCollisionsTopToBottom(
  nodes: RelaxNode[],
  y: number,
  i: number,
  alpha: number,
  nodePadding: number,
): void {
  for (; i < nodes.length; ++i) {
    const node = nodes[i];
    const dy = (y - (node.y0 ?? 0)) * alpha;
    if (dy > 1e-6) {
      shiftNodeY(node, dy);
    }
    y = (node.y1 ?? 0) + nodePadding;
  }
}

function resolveCollisionsBottomToTop(
  nodes: RelaxNode[],
  y: number,
  i: number,
  alpha: number,
  nodePadding: number,
): void {
  for (; i >= 0; --i) {
    const node = nodes[i];
    const dy = ((node.y1 ?? 0) - y) * alpha;
    if (dy > 1e-6) {
      shiftNodeY(node, -dy);
    }
    y = (node.y0 ?? 0) - nodePadding;
  }
}

function resolveColumnCollisions(
  column: RelaxNode[],
  alpha: number,
  nodePadding: number,
  extentTop: number,
  extentBottom: number,
): void {
  if (column.length === 0) {
    return;
  }
  const mid = column.length >> 1;
  const subject = column[mid];
  resolveCollisionsBottomToTop(
    column,
    (subject.y0 ?? 0) - nodePadding,
    mid - 1,
    alpha,
    nodePadding,
  );
  resolveCollisionsTopToBottom(
    column,
    (subject.y1 ?? 0) + nodePadding,
    mid + 1,
    alpha,
    nodePadding,
  );
  resolveCollisionsBottomToTop(
    column,
    extentBottom,
    column.length - 1,
    alpha,
    nodePadding,
  );
  resolveCollisionsTopToBottom(column, extentTop, 0, alpha, nodePadding);
}

function buildColumns(nodes: RelaxNode[]): RelaxNode[][] {
  const byX = new Map<number, RelaxNode[]>();
  for (const node of nodes) {
    if (isAuxiliarySankeyNodeId(node.id)) {
      continue;
    }
    const x = node.x0 ?? 0;
    const group = byX.get(x) ?? [];
    group.push(node);
    byX.set(x, group);
  }
  return [...byX.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, column]) => column);
}

function relaxLeftToRight(
  columns: RelaxNode[][],
  alpha: number,
  beta: number,
  options: AlignSankeyLinksOptions,
): void {
  const { nodePadding, extentTop, extentBottom } = options;
  for (let i = 1; i < columns.length; ++i) {
    const column = columns[i];
    for (const target of column) {
      let y = 0;
      let w = 0;
      for (const link of target.targetLinks) {
        const source = link.source as RelaxNode;
        const v = (link.value ?? 0) * columnSpan(source, target);
        y += computeSankeyTargetTop(source, target, nodePadding) * v;
        w += v;
      }
      if (w > 0) {
        const dy = (y / w - (target.y0 ?? 0)) * alpha;
        shiftNodeY(target, dy);
        reorderNodeLinksForRelax(target);
      }
    }
    resolveColumnCollisions(column, beta, nodePadding, extentTop, extentBottom);
  }
}

function relaxRightToLeft(
  columns: RelaxNode[][],
  alpha: number,
  beta: number,
  options: AlignSankeyLinksOptions,
): void {
  const { nodePadding, extentTop, extentBottom } = options;
  for (let i = columns.length - 2; i >= 0; --i) {
    const column = columns[i];
    for (const source of column) {
      let y = 0;
      let w = 0;
      for (const link of source.sourceLinks) {
        const target = link.target as RelaxNode;
        const v = (link.value ?? 0) * columnSpan(source, target);
        y += computeSankeySourceTop(source, target, nodePadding) * v;
        w += v;
      }
      if (w > 0) {
        const dy = (y / w - (source.y0 ?? 0)) * alpha;
        shiftNodeY(source, dy);
        reorderNodeLinksForRelax(source);
      }
    }
    resolveColumnCollisions(column, beta, nodePadding, extentTop, extentBottom);
  }
}

export function syncAuxiliaryNodePositions(
  nodes: Array<SankeyGraphNode & { y0?: number; y1?: number }>,
): void {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  for (const node of nodes) {
    if (!isAuxiliarySankeyNodeId(node.id)) {
      continue;
    }
    const parentId = node.id.replace(/::__direct__$|::__terminal__$/, "");
    const parent = byId.get(parentId);
    if (!parent) {
      continue;
    }
    node.y0 = parent.y0;
    node.y1 = parent.y1;
  }
}

export function alignSankeyLinks(
  layout: {
    nodes: Array<
      SankeyGraphNode & {
        x0?: number;
        y0?: number;
        y1?: number;
        sourceLinks?: LayoutAdjacencyLink[];
        targetLinks?: LayoutAdjacencyLink[];
      }
    >;
  },
  options: AlignSankeyLinksOptions,
): void {
  const iterations = options.iterations ?? 6;
  const relaxNodes = layout.nodes.filter(
    (node) => !isAuxiliarySankeyNodeId(node.id),
  ) as RelaxNode[];

  for (let i = 0; i < iterations; ++i) {
    const alpha = 0.99 ** i;
    const beta = Math.max(1 - alpha, (i + 1) / iterations);
    const columns = buildColumns(relaxNodes);
    relaxLeftToRight(columns, alpha, beta, options);
    relaxRightToLeft(columns, alpha, beta, options);
  }

  syncAuxiliaryNodePositions(layout.nodes);
}
```

Refactor `applyGroupedNodeOrder`: sostituisci il loop ausiliari finale con:

```ts
  syncAuxiliaryNodePositions(layout.nodes);
```

- [ ] **Step 4: Esegui test — deve passare**

Run: `npm test -- lib/cashflow/sankey-layout.test.ts -t "alignSankeyLinks" 2>&1 | tail -20`  
Expected: PASS (3 test)

- [ ] **Step 5: Esegui suite layout completa**

Run: `npm test -- lib/cashflow/sankey-layout.test.ts 2>&1 | tail -20`  
Expected: tutti PASS

- [ ] **Step 6: Commit**

```bash
git add lib/cashflow/sankey-layout.ts lib/cashflow/sankey-layout.test.ts
git commit -m "$(cat <<'EOF'
feat(cashflow): align Sankey link positions after grouped node order

EOF
)"
```

---

### Task 3: Test ausiliari + fixture monade→centro

**Files:**
- Test: `lib/cashflow/sankey-layout.test.ts`

- [ ] **Step 1: Scrivi test ausiliari e integrazione**

```ts
describe("syncAuxiliaryNodePositions", () => {
  it("copia y0/y1 dal padre", () => {
    const parent: LayoutNodeWithLinks = {
      id: "income:monade.stipendio",
      label: "stipendio",
      fullPath: "monade.stipendio",
      kind: "income",
      value: 50,
      level: 2,
      directAmount: 10,
      y0: 40,
      y1: 90,
      sourceLinks: [],
      targetLinks: [],
    };
    const aux: LayoutNodeWithLinks = {
      id: "income:monade.stipendio::__direct__",
      label: "",
      fullPath: "monade.stipendio",
      kind: "income",
      value: 0,
      level: 3,
      directAmount: 0,
      y0: 0,
      y1: 0,
      sourceLinks: [],
      targetLinks: [],
    };

    syncAuxiliaryNodePositions([parent, aux]);
    expect(aux.y0).toBe(40);
    expect(aux.y1).toBe(90);
  });
});

describe("alignSankeyLinks — integrazione monade", () => {
  it("allinea catena figli → monade → centro", () => {
    const center: LayoutNodeWithLinks = {
      id: "center",
      label: "Disponibilità",
      fullPath: null,
      kind: "center",
      value: 150,
      level: 0,
      directAmount: 0,
      x0: 400,
      x1: 490,
      y0: 180,
      y1: 330,
      sourceLinks: [],
      targetLinks: [],
    };
    const monade: LayoutNodeWithLinks = {
      id: "income:monade",
      label: "monade",
      fullPath: "monade",
      kind: "income",
      value: 150,
      level: 1,
      directAmount: 0,
      x0: 500,
      x1: 516,
      y0: 8,
      y1: 158,
      sourceLinks: [],
      targetLinks: [],
    };
    const stipendio: LayoutNodeWithLinks = {
      id: "income:monade.stipendio",
      label: "stipendio",
      fullPath: "monade.stipendio",
      kind: "income",
      value: 100,
      level: 2,
      directAmount: 0,
      x0: 600,
      x1: 616,
      y0: 8,
      y1: 108,
      sourceLinks: [],
      targetLinks: [],
    };
    const rimborsi: LayoutNodeWithLinks = {
      id: "income:monade.rimborsi",
      label: "rimborsi",
      fullPath: "monade.rimborsi",
      kind: "income",
      value: 50,
      level: 2,
      directAmount: 0,
      x0: 600,
      x1: 616,
      y0: 120,
      y1: 170,
      sourceLinks: [],
      targetLinks: [],
    };

    const linkStipendio: LayoutAdjacencyLink = {
      source: stipendio,
      target: monade,
      width: 50,
      value: 100,
    };
    const linkRimborsi: LayoutAdjacencyLink = {
      source: rimborsi,
      target: monade,
      width: 25,
      value: 50,
    };
    const linkMonadeCenter: LayoutAdjacencyLink = {
      source: monade,
      target: center,
      width: 75,
      value: 150,
      y0: 40,
      y1: 240,
    };

    stipendio.sourceLinks = [linkStipendio];
    rimborsi.sourceLinks = [linkRimborsi];
    monade.targetLinks = [linkStipendio, linkRimborsi];
    monade.sourceLinks = [linkMonadeCenter];
    center.targetLinks = [linkMonadeCenter];

    alignSankeyLinks(
      { nodes: [center, monade, stipendio, rimborsi] },
      { nodePadding: 12, iterations: 6, extentTop: 0, extentBottom: 600 },
    );
    applyLinkBreadthsForTest([monade, center, stipendio, rimborsi]);

    expect(Math.abs((linkMonadeCenter.y0 ?? 0) - (linkMonadeCenter.y1 ?? 0))).toBeLessThan(1);
  });
});
```

- [ ] **Step 2: Esegui test**

Run: `npm test -- lib/cashflow/sankey-layout.test.ts -t "syncAuxiliaryNodePositions|integrazione monade" 2>&1 | tail -20`  
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add lib/cashflow/sankey-layout.test.ts
git commit -m "$(cat <<'EOF'
test(cashflow): cover Sankey link alignment integration cases

EOF
)"
```

---

### Task 4: Integrazione nel chart

**Files:**
- Modify: `components/cashflow/cashflow-sankey-chart.tsx`

- [ ] **Step 1: Import e pipeline layout**

In `components/cashflow/cashflow-sankey-chart.tsx`, aggiorna import:

```ts
import {
  alignSankeyLinks,
  applyGroupedNodeOrder,
  reorderLayoutLinks,
} from "@/lib/cashflow/sankey-layout";
```

Sostituisci il blocco layout nel `useMemo` (dopo `resolveSameLevelOverlaps`):

```ts
    const maxY = resolveSameLevelOverlaps(result);
    alignSankeyLinks(result, {
      nodePadding: NODE_PADDING,
      iterations: 6,
      extentTop: CHART_MARGIN_TOP,
      extentBottom: maxY + CHART_MARGIN_TOP,
    });
    reorderLayoutLinks(
      result as unknown as Parameters<typeof reorderLayoutLinks>[0],
    );
    layoutGenerator.update(result);
    const chartY1 = Math.max(
      maxY,
      ...result.nodes.map((n) => (n.y1 ?? 0)),
    ) + CHART_MARGIN_TOP;
```

Rimuovi il secondo blocco duplicato `reorderLayoutLinks` + `update()` che era dopo `resolveSameLevelOverlaps` (sostituito dal flusso sopra).

Il flusso finale deve essere:

```ts
    applyColumnLayout(result, graph, layoutGenerator, extent);
    applyGroupedNodeOrder(result, links, {
      marginTop: CHART_MARGIN_TOP,
      nodePadding: NODE_PADDING,
    });
    reorderLayoutLinks(
      result as unknown as Parameters<typeof reorderLayoutLinks>[0],
    );
    layoutGenerator.update(result);
    const maxY = resolveSameLevelOverlaps(result);
    alignSankeyLinks(result, {
      nodePadding: NODE_PADDING,
      iterations: 6,
      extentTop: CHART_MARGIN_TOP,
      extentBottom: maxY + CHART_MARGIN_TOP,
    });
    reorderLayoutLinks(
      result as unknown as Parameters<typeof reorderLayoutLinks>[0],
    );
    layoutGenerator.update(result);
    const chartY1 =
      Math.max(maxY, ...result.nodes.map((n) => (n.y1 ?? 0))) +
      CHART_MARGIN_TOP;
```

- [ ] **Step 2: Verifica TypeScript**

Run: `npx tsc --noEmit 2>&1 | tail -20`  
Expected: nessun errore sui file modificati

- [ ] **Step 3: Esegui test completi**

Run: `npm test 2>&1 | tail -30`  
Expected: tutti PASS

- [ ] **Step 4: Commit**

```bash
git add components/cashflow/cashflow-sankey-chart.tsx
git commit -m "$(cat <<'EOF'
feat(cashflow): run link alignment relaxation in Sankey chart layout

EOF
)"
```

---

### Task 5: MANUAL_TEST + verifica visiva

**Files:**
- Modify: `docs/MANUAL_TEST.md`

- [ ] **Step 1: Aggiungi checklist**

In `docs/MANUAL_TEST.md`, sezione Sankey cashflow, aggiungi:

```markdown
### Allineamento link Sankey
- [ ] Aprire Sankey con dati maggio 2026 (o mese con monade + uscite multiple)
- [ ] Flusso monade → Disponibilità: nessuna "ala" triangolare ai bordi del nodo
- [ ] Flussi uscite da Disponibilità (mutuo, luce, gas, …): bordi flush sui nodi
- [ ] Zoom +/− e Adatta: link restano allineati dopo fit
- [ ] Ordinamento nodi per padre invariato rispetto a prima del fix
```

- [ ] **Step 2: Commit**

```bash
git add docs/MANUAL_TEST.md
git commit -m "$(cat <<'EOF'
docs: add Sankey link alignment manual test checklist

EOF
)"
```

---

## Spec coverage (self-review)

| Requisito | Task |
|-----------|------|
| L1 `\|y0-y1\| < 1` | Task 2, 3 |
| L2 ordine colonna invariato | Task 2 |
| L3 altezze invariate | Task 2 |
| L4 ausiliari sync | Task 2, 3 |
| L5 centro si sposta | Task 2 (implicito in relaxation) |
| L6 rendering invariato | Task 4 (solo pipeline) |
| Manuale maggio | Task 5 |

Nessun placeholder TBD. Tipi coerenti: `AlignSankeyLinksOptions`, `alignSankeyLinks`, `syncAuxiliaryNodePositions` definiti in Task 2 e usati in Task 4.
