# Cashflow Sankey — Ordinamento nodi raggruppato per padre

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Riordinare verticalmente i nodi del grafico Sankey per `value` decrescente, raggruppati per padre a ogni colonna, così i figli di padri diversi non si mescolano.

**Architecture:** Pure functions in `lib/cashflow/sankey-layout.ts` calcolano l'ordine per colonna e riassegnano `y0`/`y1` dopo il primo pass `d3-sankey`. Il chart invoca `applyGroupedNodeOrder` tra `applyColumnLayout` e `layoutGenerator.update()`. Altezze nodi restano quelle del layout d3 iniziale.

**Tech Stack:** TypeScript, Vitest, `d3-sankey@^0.12.3`, React 19 Client Component.

**Spec:** [`docs/superpowers/specs/2026-06-07-cashflow-sankey-node-order-design.md`](../specs/2026-06-07-cashflow-sankey-node-order-design.md)

---

## File map

| File | Responsabilità |
|------|----------------|
| `lib/cashflow/sankey-layout.ts` | `orderNodesInColumn`, `assignColumnYPositions`, `applyGroupedNodeOrder` |
| `lib/cashflow/sankey-layout.test.ts` | Unit test ordinamento e assegnazione Y |
| `components/cashflow/cashflow-sankey-chart.tsx` | Integrazione nel flusso layout esistente |
| `docs/MANUAL_TEST.md` | Checklist verifica visiva raggruppamento |

---

### Task 1: Helper ordinamento colonna radici (TDD)

**Files:**
- Create: `lib/cashflow/sankey-layout.ts`
- Create: `lib/cashflow/sankey-layout.test.ts`

- [ ] **Step 1: Scrivi test colonna radici (falliscono)**

Crea `lib/cashflow/sankey-layout.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { SankeyGraphLink } from "@/lib/cashflow/sankey";
import { orderNodesInColumn, type OrderableNode } from "@/lib/cashflow/sankey-layout";

function node(id: string, level: number, value: number): OrderableNode {
  return { id, level, value };
}

describe("orderNodesInColumn — radici (level ±1)", () => {
  it("ordina radici uscite per value decrescente", () => {
    const nodes = [
      node("expense:catA", -1, 150),
      node("expense:cat1", -1, 200),
      node("expense:altro", -1, 50),
    ];

    const ordered = orderNodesInColumn(nodes, -1, [], new Map());

    expect(ordered.map((n) => n.id)).toEqual([
      "expense:cat1",
      "expense:catA",
      "expense:altro",
    ]);
  });

  it("ordina radici entrate per value decrescente", () => {
    const nodes = [
      node("income:monade", 1, 100),
      node("income:lavoro", 1, 300),
    ];

    const ordered = orderNodesInColumn(nodes, 1, [], new Map());

    expect(ordered.map((n) => n.id)).toEqual([
      "income:lavoro",
      "income:monade",
    ]);
  });

  it("tie-break per id a parità di value", () => {
    const nodes = [node("expense:b", -1, 100), node("expense:a", -1, 100)];

    const ordered = orderNodesInColumn(nodes, -1, [], new Map());

    expect(ordered.map((n) => n.id)).toEqual(["expense:a", "expense:b"]);
  });
});
```

- [ ] **Step 2: Esegui test — devono fallire**

Run: `npm test -- lib/cashflow/sankey-layout.test.ts`  
Expected: FAIL — modulo `@/lib/cashflow/sankey-layout` non trovato

- [ ] **Step 3: Implementa helper radici**

Crea `lib/cashflow/sankey-layout.ts`:

```ts
import type { SankeyGraphLink } from "@/lib/cashflow/sankey";

export type OrderableNode = {
  id: string;
  level: number;
  value: number;
};

export function compareByValueDesc(
  a: OrderableNode,
  b: OrderableNode,
): number {
  if (b.value !== a.value) {
    return b.value - a.value;
  }
  return a.id.localeCompare(b.id);
}

export function orderNodesInColumn(
  nodes: OrderableNode[],
  level: number,
  links: SankeyGraphLink[],
  parentYById: Map<string, number>,
): OrderableNode[] {
  if (nodes.length === 0) {
    return [];
  }

  if (Math.abs(level) === 1) {
    return [...nodes].sort(compareByValueDesc);
  }

  return orderChildColumn(nodes, level, links, parentYById);
}

function orderChildColumn(
  nodes: OrderableNode[],
  level: number,
  links: SankeyGraphLink[],
  parentYById: Map<string, number>,
): OrderableNode[] {
  const byParent = new Map<string, OrderableNode[]>();

  for (const n of nodes) {
    const parentId = findParentId(n.id, level, links);
    const key = parentId ?? "__orphan__";
    const group = byParent.get(key) ?? [];
    group.push(n);
    byParent.set(key, group);
  }

  const parentIds = [...byParent.keys()].sort((a, b) => {
    const ya = parentYById.get(a) ?? Number.POSITIVE_INFINITY;
    const yb = parentYById.get(b) ?? Number.POSITIVE_INFINITY;
    if (ya !== yb) {
      return ya - yb;
    }
    return a.localeCompare(b);
  });

  const ordered: OrderableNode[] = [];
  for (const parentId of parentIds) {
    const group = byParent.get(parentId) ?? [];
    group.sort(compareByValueDesc);
    ordered.push(...group);
  }
  return ordered;
}

export function findParentId(
  nodeId: string,
  level: number,
  links: SankeyGraphLink[],
): string | null {
  if (Math.abs(level) === 1) {
    return null;
  }

  for (const link of links) {
    if (level < 0 && link.target === nodeId) {
      return link.source;
    }
    if (level > 0 && link.source === nodeId) {
      return link.target;
    }
  }
  return null;
}
```

- [ ] **Step 4: Esegui test radici**

Run: `npm test -- lib/cashflow/sankey-layout.test.ts`  
Expected: PASS (3 test radici)

- [ ] **Step 5: Commit**

```bash
git add lib/cashflow/sankey-layout.ts lib/cashflow/sankey-layout.test.ts
git commit -m "feat(cashflow): add Sankey column ordering helpers for root nodes"
```

---

### Task 2: Ordinamento colonna figli raggruppata per padre (TDD)

**Files:**
- Modify: `lib/cashflow/sankey-layout.test.ts`
- Modify: `lib/cashflow/sankey-layout.ts` (già contiene `orderChildColumn` — verifica con nuovi test)

- [ ] **Step 1: Aggiungi test colonna figli**

Aggiungi in `lib/cashflow/sankey-layout.test.ts`:

```ts
describe("orderNodesInColumn — figli raggruppati per padre", () => {
  const links: SankeyGraphLink[] = [
    { source: "expense:cat1", target: "expense:cat1.cat2", value: 120 },
    { source: "expense:cat1", target: "expense:cat1.cat3", value: 80 },
    { source: "expense:catA", target: "expense:catA.catB", value: 150 },
  ];

  it("raggruppa figli per padre senza interleaving", () => {
    const nodes = [
      node("expense:catA.catB", -2, 150),
      node("expense:cat1.cat3", -2, 80),
      node("expense:cat1.cat2", -2, 120),
    ];
    const parentY = new Map([
      ["expense:cat1", 8],
      ["expense:catA", 100],
    ]);

    const ordered = orderNodesInColumn(nodes, -2, links, parentY);

    expect(ordered.map((n) => n.id)).toEqual([
      "expense:cat1.cat2",
      "expense:cat1.cat3",
      "expense:catA.catB",
    ]);
  });

  it("ordina figli per value decrescente dentro il gruppo", () => {
    const nodes = [
      node("expense:cat1.cat3", -2, 80),
      node("expense:cat1.cat2", -2, 120),
    ];

    const ordered = orderNodesInColumn(nodes, -2, links, new Map([["expense:cat1", 0]]));

    expect(ordered.map((n) => n.id)).toEqual([
      "expense:cat1.cat2",
      "expense:cat1.cat3",
    ]);
  });

  it("simmetrico per entrate (level positivo)", () => {
    const incomeLinks: SankeyGraphLink[] = [
      { source: "income:monade.stipendio", target: "income:monade", value: 200 },
      { source: "income:monade.rimborsi", target: "income:monade", value: 50 },
      { source: "income:altro.bonus", target: "income:altro", value: 100 },
    ];
    const nodes = [
      node("income:altro.bonus", 2, 100),
      node("income:monade.rimborsi", 2, 50),
      node("income:monade.stipendio", 2, 200),
    ];
    const parentY = new Map([
      ["income:monade", 8],
      ["income:altro", 80],
    ]);

    const ordered = orderNodesInColumn(nodes, 2, incomeLinks, parentY);

    expect(ordered.map((n) => n.id)).toEqual([
      "income:monade.stipendio",
      "income:monade.rimborsi",
      "income:altro.bonus",
    ]);
  });
});
```

- [ ] **Step 2: Esegui test figli**

Run: `npm test -- lib/cashflow/sankey-layout.test.ts`  
Expected: PASS (6 test totali)

- [ ] **Step 3: Commit**

```bash
git add lib/cashflow/sankey-layout.test.ts
git commit -m "test(cashflow): cover Sankey child column grouping by parent"
```

---

### Task 3: Assegnazione Y e applyGroupedNodeOrder (TDD)

**Files:**
- Modify: `lib/cashflow/sankey-layout.ts`
- Modify: `lib/cashflow/sankey-layout.test.ts`

- [ ] **Step 1: Scrivi test assignColumnYPositions**

Aggiungi in `lib/cashflow/sankey-layout.test.ts`:

```ts
import {
  assignColumnYPositions,
  applyGroupedNodeOrder,
} from "@/lib/cashflow/sankey-layout";
import type { SankeyGraphLink, SankeyGraphNode } from "@/lib/cashflow/sankey";

describe("assignColumnYPositions", () => {
  it("assegna y0/y1 top-down con padding", () => {
    const positions = assignColumnYPositions(
      [
        { id: "a", height: 40 },
        { id: "b", height: 20 },
      ],
      8,
      12,
    );

    expect(positions.get("a")).toEqual({ y0: 8, y1: 48 });
    expect(positions.get("b")).toEqual({ y0: 60, y1: 80 });
  });
});

describe("applyGroupedNodeOrder", () => {
  it("riposiziona nodi visibili per colonna mantenendo altezze", () => {
    type LayoutNode = SankeyGraphNode & { y0?: number; y1?: number };

    const layoutNodes: LayoutNode[] = [
      {
        id: "expense:cat1",
        label: "cat1",
        fullPath: "cat1",
        kind: "expense",
        value: 200,
        level: -1,
        directAmount: 0,
        y0: 50,
        y1: 90,
      },
      {
        id: "expense:catA",
        label: "catA",
        fullPath: "catA",
        kind: "expense",
        value: 150,
        level: -1,
        directAmount: 0,
        y0: 10,
        y1: 40,
      },
      {
        id: "expense:cat1.cat2",
        label: "cat2",
        fullPath: "cat1.cat2",
        kind: "expense",
        value: 120,
        level: -2,
        directAmount: 120,
        y0: 30,
        y1: 60,
      },
      {
        id: "expense:cat1.cat3",
        label: "cat3",
        fullPath: "cat1.cat3",
        kind: "expense",
        value: 80,
        level: -2,
        directAmount: 80,
        y0: 70,
        y1: 90,
      },
    ];

    const links: SankeyGraphLink[] = [
      { source: "expense:cat1", target: "expense:cat1.cat2", value: 120 },
      { source: "expense:cat1", target: "expense:cat1.cat3", value: 80 },
    ];

    applyGroupedNodeOrder(
      { nodes: layoutNodes, links },
      links,
      { marginTop: 8, nodePadding: 12 },
    );

    const cat1 = layoutNodes.find((n) => n.id === "expense:cat1")!;
    const catA = layoutNodes.find((n) => n.id === "expense:catA")!;
    const cat2 = layoutNodes.find((n) => n.id === "expense:cat1.cat2")!;
    const cat3 = layoutNodes.find((n) => n.id === "expense:cat1.cat3")!;

    expect(cat1.y0).toBeLessThan(catA.y0!);
    expect(cat2.y0).toBeLessThan(cat3.y0!);
    expect(cat2.y0).toBeLessThan(catA.y0!);
    expect(cat3.y1).toBeLessThanOrEqual(catA.y0!);
    expect((cat1.y1 ?? 0) - (cat1.y0 ?? 0)).toBe(40);
    expect((cat2.y1 ?? 0) - (cat2.y0 ?? 0)).toBe(30);
  });
});
```

- [ ] **Step 2: Esegui test — assignColumnYPositions fallisce**

Run: `npm test -- lib/cashflow/sankey-layout.test.ts -t "assignColumnYPositions"`  
Expected: FAIL — `assignColumnYPositions` not exported

- [ ] **Step 3: Implementa assignColumnYPositions e applyGroupedNodeOrder**

Aggiungi in `lib/cashflow/sankey-layout.ts`:

```ts
import {
  CENTER_NODE_ID,
  isAuxiliarySankeyNodeId,
  type SankeyGraphLink,
  type SankeyGraphNode,
} from "@/lib/cashflow/sankey";

export type LayoutGraph = {
  nodes: Array<SankeyGraphNode & { y0?: number; y1?: number }>;
  links: SankeyGraphLink[];
};

export type GroupedOrderOptions = {
  marginTop: number;
  nodePadding: number;
};

export function assignColumnYPositions(
  nodes: Array<{ id: string; height: number }>,
  startY: number,
  padding: number,
): Map<string, { y0: number; y1: number }> {
  const positions = new Map<string, { y0: number; y1: number }>();
  let cursor = startY;

  for (const node of nodes) {
    const y0 = cursor;
    const y1 = y0 + Math.max(1, node.height);
    positions.set(node.id, { y0, y1 });
    cursor = y1 + padding;
  }

  return positions;
}

function nodeHeight(node: SankeyGraphNode & { y0?: number; y1?: number }): number {
  return Math.max(1, (node.y1 ?? 0) - (node.y0 ?? 0));
}

function levelsToProcess(nodes: SankeyGraphNode[]): number[] {
  const levels = new Set<number>();
  for (const node of nodes) {
    if (node.kind === "center" || node.level === 0) {
      continue;
    }
    levels.add(node.level);
  }

  const negative = [...levels].filter((l) => l < 0).sort((a, b) => b - a);
  const positive = [...levels].filter((l) => l > 0).sort((a, b) => a - b);
  return [...negative, ...positive];
}

export function applyGroupedNodeOrder(
  layout: LayoutGraph,
  links: SankeyGraphLink[],
  options: GroupedOrderOptions,
): void {
  const { marginTop, nodePadding } = options;
  const layoutById = new Map(layout.nodes.map((node) => [node.id, node]));
  const yById = new Map<string, number>();

  for (const level of levelsToProcess(layout.nodes)) {
    const visible = layout.nodes.filter(
      (node) => node.level === level && !isAuxiliarySankeyNodeId(node.id),
    );
    if (visible.length === 0) {
      continue;
    }

    const orderable: OrderableNode[] = visible.map((node) => ({
      id: node.id,
      level: node.level,
      value: node.value,
    }));

    const parentYById = new Map<string, number>();
    for (const [id, y0] of yById) {
      parentYById.set(id, y0);
    }

    const ordered = orderNodesInColumn(orderable, level, links, parentYById);
    const withHeights = ordered.map((node) => ({
      id: node.id,
      height: nodeHeight(layoutById.get(node.id)!),
    }));

    const positions = assignColumnYPositions(withHeights, marginTop, nodePadding);

    for (const [id, pos] of positions) {
      const layoutNode = layoutById.get(id);
      if (!layoutNode) {
        continue;
      }
      layoutNode.y0 = pos.y0;
      layoutNode.y1 = pos.y1;
      yById.set(id, pos.y0);
    }
  }

  for (const node of layout.nodes) {
    if (!isAuxiliarySankeyNodeId(node.id)) {
      continue;
    }
    const parentId = node.id.replace(/::__direct__$|::__terminal__$/, "");
    const parent = layoutById.get(parentId);
    if (!parent) {
      continue;
    }
    node.y0 = parent.y0;
    node.y1 = parent.y1;
  }
}
```

- [ ] **Step 4: Esegui tutti i test layout**

Run: `npm test -- lib/cashflow/sankey-layout.test.ts`  
Expected: PASS (8 test)

- [ ] **Step 5: Commit**

```bash
git add lib/cashflow/sankey-layout.ts lib/cashflow/sankey-layout.test.ts
git commit -m "feat(cashflow): apply grouped vertical order to Sankey layout nodes"
```

---

### Task 4: Integrazione nel chart

**Files:**
- Modify: `components/cashflow/cashflow-sankey-chart.tsx`

- [ ] **Step 1: Importa e invoca applyGroupedNodeOrder**

In `components/cashflow/cashflow-sankey-chart.tsx`, aggiungi import:

```ts
import { applyGroupedNodeOrder } from "@/lib/cashflow/sankey-layout";
```

Nel `useMemo` del layout, dopo `applyColumnLayout` e **prima** di `resolveSameLevelOverlaps`, inserisci:

```ts
    applyGroupedNodeOrder(result, links, {
      marginTop: CHART_MARGIN_TOP,
      nodePadding: NODE_PADDING,
    });
    layoutGenerator.update(result);
```

Il flusso completo diventa:

```ts
    const result = layoutGenerator({ ... });
    applyColumnLayout(result, graph, layoutGenerator, extent);
    applyGroupedNodeOrder(result, links, {
      marginTop: CHART_MARGIN_TOP,
      nodePadding: NODE_PADDING,
    });
    layoutGenerator.update(result);
    const maxY = resolveSameLevelOverlaps(result);
    layoutGenerator.update(result);
```

- [ ] **Step 2: Verifica TypeScript**

Run: `npm run build`  
Expected: success, nessun errore di tipo

- [ ] **Step 3: Esegui suite test**

Run: `npm test`  
Expected: tutti i test PASS

- [ ] **Step 4: Commit**

```bash
git add components/cashflow/cashflow-sankey-chart.tsx
git commit -m "feat(cashflow): use grouped node order in Sankey chart layout"
```

---

### Task 5: Documentazione test manuale

**Files:**
- Modify: `docs/MANUAL_TEST.md`

- [ ] **Step 1: Aggiungi sezione ordinamento nodi**

Cerca la sezione Sankey in `docs/MANUAL_TEST.md` e aggiungi:

```markdown
### Ordinamento nodi raggruppato per padre

- [ ] Aprire Sankey con almeno due categorie radice con figli (es. `casa.*` e `auto.*`)
- [ ] Verificare che le radici siano ordinate dall'alto verso il basso per importo decrescente
- [ ] Verificare che i figli di una radice siano contigui e non mescolati con figli di un'altra radice
- [ ] Verificare che i figli dentro ogni gruppo siano ordinati per importo decrescente
- [ ] Ripetere lato entrate (gerarchia con almeno due radici)
- [ ] Con «Senza categoria» presente: verificare che partecipi all'ordinamento per importo tra le radici
```

- [ ] **Step 2: Commit**

```bash
git add docs/MANUAL_TEST.md
git commit -m "docs: add manual test checklist for Sankey node grouping"
```

---

## Spec coverage

| Requisito | Task |
|-----------|------|
| O1 Ordinamento per `value` | Task 1, 2 (`compareByValueDesc`) |
| O2 Radici ordinate per `value` | Task 1 |
| O3 Figli ordinati nel gruppo | Task 2 |
| O4 Blocco figli non mescolato | Task 2, 3 |
| O5 Simmetria entrate/uscite | Task 2 (test income) |
| O6 Nodi speciali come radici | Task 1 (stesso sort per level ±1) |
| O7 Centro escluso | Task 3 (`levelsToProcess` salta level 0) |
| O8 Ausiliari con padre | Task 3 (loop ausiliari) |
| O9 Altezze da d3 | Task 3 (`nodeHeight` dal layout esistente) |
| O10 Link ricalcolati | Task 4 (`layoutGenerator.update`) |

## Verifica finale

Run: `npm test && npm run build`  
Expected: PASS + build success
