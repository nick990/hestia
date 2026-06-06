# Cashflow Sankey chart — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere un grafico Sankey client-side sui movimenti filtrati in griglia, con gerarchia categorie a punti, squilibrio Avanzo/Disavanzo e modal shadcn.

**Architecture:** Logica pura in `lib/cashflow/sankey.ts` (`buildSankeyGraph`); la tabella emette `filteredMovements` via callback; il dialog compone metadati periodo + chart SVG con `d3-sankey`. I link uscite sono invertiti in fase layout (foglie a sinistra → centro) per rispettare il flusso L→R di d3-sankey.

**Tech Stack:** Next.js 16, React 19, Vitest, `d3-sankey`, shadcn Dialog/Badge, Tailwind CSS variables.

**Spec:** [`docs/superpowers/specs/2026-06-06-cashflow-sankey-design.md`](../specs/2026-06-06-cashflow-sankey-design.md)

---

## File map

| File | Responsabilità |
|------|----------------|
| `lib/cashflow/sankey.ts` | Tipi + `buildSankeyGraph`, helper label/truncate |
| `lib/cashflow/sankey.test.ts` | Unit test costruzione grafo |
| `components/cashflow/cashflow-sankey-chart.tsx` | Layout d3-sankey + SVG, tooltip, legenda inline |
| `components/cashflow/cashflow-sankey-dialog.tsx` | Modal titolo, periodo, badge filtri |
| `components/cashflow/movements-table.tsx` | Callback `onFilteredMovementsChange` |
| `components/cashflow/movements-manager.tsx` | Stato filtered, pulsante, dialog |
| `docs/MANUAL_TEST.md` | Checklist Sankey |
| `package.json` | `d3-sankey`, `@types/d3-sankey` |

---

### Task 0: Dipendenze

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Installa pacchetti**

```bash
npm install d3-sankey
npm install -D @types/d3-sankey
```

- [ ] **Step 2: Verifica build**

Run: `npm run build`  
Expected: success (nessun errore di risoluzione moduli)

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add d3-sankey for cashflow chart"
```

---

### Task 1: Tipi e helper movimento (TDD setup)

**Files:**
- Create: `lib/cashflow/sankey.ts`
- Create: `lib/cashflow/sankey.test.ts`

- [ ] **Step 1: Scrivi test iniziali (falliscono)**

Crea `lib/cashflow/sankey.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Movement } from "@/lib/cashflow/types";
import {
  buildSankeyGraph,
  findLink,
  findNode,
  truncateSankeyLabel,
} from "@/lib/cashflow/sankey";

export function movement(overrides: Partial<Movement> = {}): Movement {
  return {
    id: "1",
    type: "expense",
    amount: 0,
    occurred_on: "2026-06-01",
    description: "",
    created_at: "2026-06-01T00:00:00Z",
    category_id: null,
    category_name: null,
    scope: "private",
    family_id: null,
    user_id: "u1",
    author_name: null,
    ...overrides,
  };
}

describe("truncateSankeyLabel", () => {
  it("truncates long labels", () => {
    expect(truncateSankeyLabel("casa.corrente comune")).toBe("casa.corrente com…");
  });

  it("keeps short labels", () => {
    expect(truncateSankeyLabel("mutuo")).toBe("mutuo");
  });
});

describe("buildSankeyGraph", () => {
  it("returns empty graph for no movements", () => {
    const graph = buildSankeyGraph([]);
    expect(graph.nodes).toEqual([]);
    expect(graph.links).toEqual([]);
  });
});
```

- [ ] **Step 2: Esegui test — devono fallire**

Run: `npm test -- lib/cashflow/sankey.test.ts`  
Expected: FAIL — modulo `@/lib/cashflow/sankey` non trovato

- [ ] **Step 3: Implementa stub tipi e helper**

Crea `lib/cashflow/sankey.ts`:

```ts
import type { Movement } from "@/lib/cashflow/types";

export type SankeyNodeKind =
  | "center"
  | "income"
  | "expense"
  | "uncategorized-income"
  | "uncategorized-expense"
  | "surplus"
  | "deficit";

export type SankeyGraphNode = {
  id: string;
  label: string;
  fullPath: string | null;
  kind: SankeyNodeKind;
  value: number;
  depth: number;
  /** Importo che termina su questo nodo senza link verso figli (padre misto). */
  directAmount: number;
};

export type SankeyGraphLink = {
  source: string;
  target: string;
  value: number;
};

export type SankeyGraph = {
  nodes: SankeyGraphNode[];
  links: SankeyGraphLink[];
};

export const CENTER_NODE_ID = "center";
export const SURPLUS_NODE_ID = "surplus";
export const DEFICIT_NODE_ID = "deficit";
export const UNCategorized_INCOME_ID = "income:uncategorized";
export const UNCategorized_EXPENSE_ID = "expense:uncategorized";

const LABEL_MAX = 20;

export function truncateSankeyLabel(label: string, max = LABEL_MAX): string {
  if (label.length <= max) {
    return label;
  }
  return `${label.slice(0, max - 1)}…`;
}

export function findNode(
  graph: SankeyGraph,
  id: string,
): SankeyGraphNode | undefined {
  return graph.nodes.find((node) => node.id === id);
}

export function findLink(
  graph: SankeyGraph,
  source: string,
  target: string,
): SankeyGraphLink | undefined {
  return graph.links.find(
    (link) => link.source === source && link.target === target,
  );
}

export function buildSankeyGraph(_movements: Movement[]): SankeyGraph {
  return { nodes: [], links: [] };
}
```

- [ ] **Step 4: Esegui test — devono passare**

Run: `npm test -- lib/cashflow/sankey.test.ts`  
Expected: PASS (3 test)

- [ ] **Step 5: Commit**

```bash
git add lib/cashflow/sankey.ts lib/cashflow/sankey.test.ts
git commit -m "feat(cashflow): sankey graph types and helpers"
```

---

### Task 2: Gerarchia uscite (TDD)

**Files:**
- Modify: `lib/cashflow/sankey.ts`
- Modify: `lib/cashflow/sankey.test.ts`

- [ ] **Step 1: Aggiungi test uscite (falliscono)**

In `sankey.test.ts`, dentro `describe("buildSankeyGraph")`:

```ts
it("builds expense hierarchy center → parent → child", () => {
  const graph = buildSankeyGraph([
    movement({
      id: "1",
      type: "expense",
      amount: 100,
      category_name: "casa.mutuo",
    }),
    movement({
      id: "2",
      type: "expense",
      amount: 50,
      category_name: "casa.corrente comune",
    }),
  ]);

  const center = findNode(graph, CENTER_NODE_ID)!;
  const casa = findNode(graph, "expense:casa")!;
  const mutuo = findNode(graph, "expense:casa.mutuo")!;
  const corrente = findNode(graph, "expense:casa.corrente comune")!;

  expect(center.kind).toBe("center");
  expect(casa.value).toBe(150);
  expect(casa.label).toBe("casa");
  expect(mutuo.value).toBe(100);
  expect(mutuo.label).toBe("mutuo");
  expect(corrente.value).toBe(50);

  expect(findLink(graph, CENTER_NODE_ID, "expense:casa")?.value).toBe(150);
  expect(findLink(graph, "expense:casa", "expense:casa.mutuo")?.value).toBe(100);
  expect(
    findLink(graph, "expense:casa", "expense:casa.corrente comune")?.value,
  ).toBe(50);

  expect(casa.depth).toBe(-1);
  expect(mutuo.depth).toBe(-2);
  expect(casa.directAmount).toBe(0);
});
```

- [ ] **Step 2: Esegui test — devono fallire**

Run: `npm test -- lib/cashflow/sankey.test.ts`  
Expected: FAIL — nodi/link assenti

- [ ] **Step 3: Implementa ramo uscite**

In `lib/cashflow/sankey.ts`, sostituisci `buildSankeyGraph` e aggiungi helper privati:

```ts
type Side = "income" | "expense";

function categoryNodeId(side: Side, path: string): string {
  return `${side}:${path}`;
}

function segmentLabel(path: string): string {
  const parts = path.split(".");
  return parts[parts.length - 1] ?? path;
}

function accumulatePathAmounts(
  movements: Movement[],
  type: Movement["type"],
): Map<string, number> {
  const amounts = new Map<string, number>();

  for (const movement of movements) {
    if (movement.type !== type) {
      continue;
    }

    const raw = movement.category_name?.trim();
    const path = raw && raw.length > 0 ? raw : "__uncategorized__";
    amounts.set(path, (amounts.get(path) ?? 0) + movement.amount);
  }

  return amounts;
}

function addCategorySide(
  graph: SankeyGraph,
  side: Side,
  pathAmounts: Map<string, number>,
): void {
  const uncategorizedKey = "__uncategorized__";
  const uncategorizedAmount = pathAmounts.get(uncategorizedKey) ?? 0;
  pathAmounts.delete(uncategorizedKey);

  const nodeValues = new Map<string, number>();
  const directAmounts = new Map<string, number>();

  for (const [path, amount] of pathAmounts) {
    directAmounts.set(path, amount);
    const segments = path.split(".");
    for (let i = 1; i <= segments.length; i += 1) {
      const prefix = segments.slice(0, i).join(".");
      nodeValues.set(prefix, (nodeValues.get(prefix) ?? 0) + amount);
    }
  }

  for (const [path, value] of nodeValues) {
    const depth =
      side === "expense"
        ? -path.split(".").length
        : path.split(".").length;

    graph.nodes.push({
      id: categoryNodeId(side, path),
      label: segmentLabel(path),
      fullPath: path,
      kind: side,
      value,
      depth,
      directAmount: directAmounts.get(path) ?? 0,
    });
  }

  for (const [path, amount] of pathAmounts) {
    const segments = path.split(".");
    if (segments.length === 1) {
      continue;
    }
    const parentPath = segments.slice(0, -1).join(".");
    graph.links.push({
      source: categoryNodeId(side, parentPath),
      target: categoryNodeId(side, path),
      value: amount,
    });
  }

  for (const path of nodeValues.keys()) {
    const segments = path.split(".");
    if (segments.length !== 1) {
      continue;
    }
    if (side === "expense") {
      graph.links.push({
        source: CENTER_NODE_ID,
        target: categoryNodeId(side, path),
        value: nodeValues.get(path)!,
      });
    } else {
      graph.links.push({
        source: categoryNodeId(side, path),
        target: CENTER_NODE_ID,
        value: nodeValues.get(path)!,
      });
    }
  }

  if (uncategorizedAmount > 0) {
    const nodeId =
      side === "income" ? UNCategorized_INCOME_ID : UNCategorized_EXPENSE_ID;
    graph.nodes.push({
      id: nodeId,
      label: "Senza categoria",
      fullPath: null,
      kind:
        side === "income" ? "uncategorized-income" : "uncategorized-expense",
      value: uncategorizedAmount,
      depth: side === "expense" ? -1 : 1,
      directAmount: uncategorizedAmount,
    });
    if (side === "expense") {
      graph.links.push({
        source: CENTER_NODE_ID,
        target: nodeId,
        value: uncategorizedAmount,
      });
    } else {
      graph.links.push({
        source: nodeId,
        target: CENTER_NODE_ID,
        value: uncategorizedAmount,
      });
    }
  }
}

export function buildSankeyGraph(movements: Movement[]): SankeyGraph {
  if (movements.length === 0) {
    return { nodes: [], links: [] };
  }

  const totalIncome = movements
    .filter((m) => m.type === "income")
    .reduce((sum, m) => sum + m.amount, 0);
  const totalExpense = movements
    .filter((m) => m.type === "expense")
    .reduce((sum, m) => sum + m.amount, 0);

  const graph: SankeyGraph = {
    nodes: [
      {
        id: CENTER_NODE_ID,
        label: "Totale periodo",
        fullPath: null,
        kind: "center",
        value: Math.max(totalIncome, totalExpense),
        depth: 0,
        directAmount: 0,
      },
    ],
    links: [],
  };

  addCategorySide(graph, "expense", accumulatePathAmounts(movements, "expense"));
  addCategorySide(graph, "income", accumulatePathAmounts(movements, "income"));

  if (totalIncome > totalExpense) {
    const surplus = totalIncome - totalExpense;
    graph.nodes.push({
      id: SURPLUS_NODE_ID,
      label: "Avanzo",
      fullPath: null,
      kind: "surplus",
      value: surplus,
      depth: -1,
      directAmount: surplus,
    });
    graph.links.push({
      source: CENTER_NODE_ID,
      target: SURPLUS_NODE_ID,
      value: surplus,
    });
  } else if (totalExpense > totalIncome) {
    const deficit = totalExpense - totalIncome;
    graph.nodes.push({
      id: DEFICIT_NODE_ID,
      label: "Disavanzo",
      fullPath: null,
      kind: "deficit",
      value: deficit,
      depth: -1,
      directAmount: deficit,
    });
    graph.links.push({
      source: DEFICIT_NODE_ID,
      target: CENTER_NODE_ID,
      value: deficit,
    });
  }

  return graph;
}
```

- [ ] **Step 4: Esegui test — devono passare**

Run: `npm test -- lib/cashflow/sankey.test.ts`  
Expected: PASS (test gerarchia uscite + stub vuoto + truncate)

- [ ] **Step 5: Commit**

```bash
git add lib/cashflow/sankey.ts lib/cashflow/sankey.test.ts
git commit -m "feat(cashflow): build sankey expense hierarchy"
```

---

### Task 3: Gerarchia entrate + senza categoria + squilibrio (TDD)

**Files:**
- Modify: `lib/cashflow/sankey.test.ts`

- [ ] **Step 1: Aggiungi test (falliscono se incompleti)**

```ts
it("builds income hierarchy leaf → parent → center", () => {
  const graph = buildSankeyGraph([
    movement({
      id: "1",
      type: "income",
      amount: 100,
      category_name: "monade.stipendio",
    }),
    movement({
      id: "2",
      type: "income",
      amount: 50,
      category_name: "monade.rimborsi",
    }),
  ]);

  const monade = findNode(graph, "income:monade")!;
  expect(monade.value).toBe(150);
  expect(findLink(graph, "income:monade.stipendio", "income:monade")?.value).toBe(
    100,
  );
  expect(findLink(graph, "income:monade", CENTER_NODE_ID)?.value).toBe(150);
  expect(monade.depth).toBe(1);
});

it("uses distinct uncategorized nodes for income and expense", () => {
  const graph = buildSankeyGraph([
    movement({ id: "1", type: "income", amount: 40, category_name: null }),
    movement({ id: "2", type: "expense", amount: 10, category_name: null }),
  ]);

  expect(findNode(graph, UNCategorized_INCOME_ID)?.value).toBe(40);
  expect(findNode(graph, UNCategorized_EXPENSE_ID)?.value).toBe(10);
  expect(findLink(graph, UNCategorized_INCOME_ID, CENTER_NODE_ID)?.value).toBe(
    40,
  );
  expect(findLink(graph, CENTER_NODE_ID, UNCategorized_EXPENSE_ID)?.value).toBe(
    10,
  );
});

it("adds surplus node when income exceeds expense", () => {
  const graph = buildSankeyGraph([
    movement({ id: "1", type: "income", amount: 300 }),
    movement({ id: "2", type: "expense", amount: 200 }),
  ]);

  expect(findNode(graph, SURPLUS_NODE_ID)?.value).toBe(100);
  expect(findLink(graph, CENTER_NODE_ID, SURPLUS_NODE_ID)?.value).toBe(100);
  expect(findNode(graph, DEFICIT_NODE_ID)).toBeUndefined();
});

it("adds deficit node when expense exceeds income", () => {
  const graph = buildSankeyGraph([
    movement({ id: "1", type: "income", amount: 100 }),
    movement({ id: "2", type: "expense", amount: 250 }),
  ]);

  expect(findNode(graph, DEFICIT_NODE_ID)?.value).toBe(150);
  expect(findLink(graph, DEFICIT_NODE_ID, CENTER_NODE_ID)?.value).toBe(150);
  expect(findNode(graph, SURPLUS_NODE_ID)).toBeUndefined();
});
```

- [ ] **Step 2: Esegui test**

Run: `npm test -- lib/cashflow/sankey.test.ts`  
Expected: PASS (implementazione Task 2 già copre entrate/squilibrio)

- [ ] **Step 3: Commit test aggiuntivi**

```bash
git add lib/cashflow/sankey.test.ts
git commit -m "test(cashflow): sankey income, uncategorized, imbalance"
```

---

### Task 4: Padre con quota diretta + bilanciamento (TDD)

**Files:**
- Modify: `lib/cashflow/sankey.test.ts`

- [ ] **Step 1: Aggiungi test padre misto**

```ts
it("keeps direct amount on parent without synthetic child leaf", () => {
  const graph = buildSankeyGraph([
    movement({
      id: "1",
      type: "expense",
      amount: 50,
      category_name: "casa",
    }),
    movement({
      id: "2",
      type: "expense",
      amount: 100,
      category_name: "casa.mutuo",
    }),
  ]);

  const casa = findNode(graph, "expense:casa")!;
  expect(casa.value).toBe(150);
  expect(casa.directAmount).toBe(50);
  expect(findLink(graph, "expense:casa", "expense:casa.mutuo")?.value).toBe(100);
  expect(findLink(graph, CENTER_NODE_ID, "expense:casa")?.value).toBe(150);
});

it("balances flows at center including surplus", () => {
  const graph = buildSankeyGraph([
    movement({
      id: "1",
      type: "income",
      amount: 150,
      category_name: "monade.stipendio",
    }),
    movement({
      id: "2",
      type: "expense",
      amount: 100,
      category_name: "casa.mutuo",
    }),
  ]);

  const inflow = graph.links
    .filter((l) => l.target === CENTER_NODE_ID)
    .reduce((s, l) => s + l.value, 0);
  const outflow = graph.links
    .filter((l) => l.source === CENTER_NODE_ID)
    .reduce((s, l) => s + l.value, 0);

  expect(inflow).toBe(outflow);
  expect(inflow).toBe(150);
});
```

- [ ] **Step 2: Esegui test**

Run: `npm test -- lib/cashflow/sankey.test.ts`  
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add lib/cashflow/sankey.test.ts
git commit -m "test(cashflow): sankey parent direct amount and balance"
```

---

### Task 5: Callback movimenti filtrati dalla tabella

**Files:**
- Modify: `components/cashflow/movements-table.tsx`

- [ ] **Step 1: Aggiungi prop e effect**

In `MovementsTableProps`:

```ts
onFilteredMovementsChange: (movements: Movement[]) => void;
```

Aggiungi parametro alla funzione e effect dopo quello di `onFilterSummaryChange`:

```ts
useEffect(() => {
  onFilteredMovementsChange(
    table.getFilteredRowModel().rows.map((row) => row.original),
  );
}, [
  columnFilters,
  sorting,
  movements,
  table,
  onFilteredMovementsChange,
]);
```

- [ ] **Step 2: Verifica TypeScript**

Run: `npx tsc --noEmit`  
Expected: errori su `movements-manager.tsx` finché non aggiornato — OK per questo step

- [ ] **Step 3: Commit parziale tabella**

```bash
git add components/cashflow/movements-table.tsx
git commit -m "feat(cashflow): emit filtered movements from table"
```

---

### Task 6: Componente chart SVG

**Files:**
- Create: `components/cashflow/cashflow-sankey-chart.tsx`

- [ ] **Step 1: Crea componente chart**

```tsx
"use client";

import {
  sankey as d3Sankey,
  sankeyJustify,
  sankeyLinkHorizontal,
  type SankeyGraph as D3SankeyGraph,
  type SankeyLink,
  type SankeyNode,
} from "d3-sankey";
import { useMemo, useState } from "react";
import type {
  SankeyGraph,
  SankeyGraphLink,
  SankeyGraphNode,
  SankeyNodeKind,
} from "@/lib/cashflow/sankey";
import { CENTER_NODE_ID, truncateSankeyLabel } from "@/lib/cashflow/sankey";
import { formatEuro } from "@/lib/cashflow/format";
import { cn } from "@/lib/utils";

type LayoutNode = SankeyNode<SankeyGraphNode, SankeyGraphLink> & SankeyGraphNode;
type LayoutLink = SankeyLink<SankeyGraphNode, SankeyGraphLink> & SankeyGraphLink;

type CashflowSankeyChartProps = {
  graph: SankeyGraph;
  className?: string;
};

const NODE_WIDTH = 16;

function nodeFill(kind: SankeyNodeKind): string {
  switch (kind) {
    case "income":
    case "uncategorized-income":
      return "var(--chart-income, hsl(142 76% 36%))";
    case "expense":
    case "uncategorized-expense":
      return "var(--chart-expense, hsl(0 72% 51%))";
    case "surplus":
      return "var(--chart-surplus, hsl(142 40% 45%))";
    case "deficit":
      return "var(--chart-deficit, hsl(0 50% 45%))";
    default:
      return "var(--muted-foreground)";
  }
}

function toLayoutLinks(links: SankeyGraphLink[]): SankeyGraphLink[] {
  return links.map((link) => {
    if (link.source === CENTER_NODE_ID || link.target === CENTER_NODE_ID) {
      return link;
    }
    if (link.source.startsWith("expense:")) {
      return {
        source: link.target,
        target: link.source,
        value: link.value,
      };
    }
    return link;
  });
}

function addDirectTerminalLinks(
  graph: SankeyGraph,
): SankeyGraphLink[] {
  const extra: SankeyGraphLink[] = [];

  for (const node of graph.nodes) {
    if (node.directAmount <= 0 || node.kind === "center") {
      continue;
    }
    const childOutflow = graph.links
      .filter((link) => link.source === node.id)
      .reduce((sum, link) => sum + link.value, 0);
    const remainder = node.value - childOutflow;
    if (remainder <= 0) {
      continue;
    }
    extra.push({
      source: node.id,
      target: `${node.id}::__terminal__`,
      value: remainder,
    });
  }

  return [...graph.links, ...extra];
}

export function CashflowSankeyChart({ graph, className }: CashflowSankeyChartProps) {
  const [hovered, setHovered] = useState<{
    label: string;
    detail: string;
  } | null>(null);

  const layout = useMemo(() => {
    if (graph.nodes.length === 0) {
      return null;
    }

    const layoutLinks = addDirectTerminalLinks({
      ...graph,
      links: toLayoutLinks(graph.links),
    });

    const terminalNodes = layoutLinks
      .map((link) => link.target)
      .filter((id) => id.endsWith("::__terminal__"))
      .map((id) => {
        const parentId = id.replace("::__terminal__", "");
        const parent = graph.nodes.find((node) => node.id === parentId);
        return {
          id,
          label: "",
          fullPath: parent?.fullPath ?? null,
          kind: parent?.kind ?? ("expense" as const),
          value: 0,
          depth: parent?.depth ?? 0,
          directAmount: 0,
        } satisfies SankeyGraphNode;
      });

    const nodes = [...graph.nodes, ...terminalNodes];
    const nodeMap = new Map(nodes.map((node) => [node.id, { ...node }]));

    const data: D3SankeyGraph<SankeyGraphNode, SankeyGraphLink> = {
      nodes: Array.from(nodeMap.values()),
      links: layoutLinks.map((link) => ({ ...link })),
    };

    const layoutGenerator = d3Sankey<SankeyGraphNode, SankeyGraphLink>()
      .nodeId((node) => node.id)
      .nodeAlign(sankeyJustify)
      .nodeWidth(NODE_WIDTH)
      .nodePadding(12)
      .extent([
        [8, 8],
        [920, 480],
      ]);

    return layoutGenerator(data);
  }, [graph]);

  if (!layout || layout.links.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nessun dato da visualizzare.</p>
    );
  }

  const width = 960;
  const height = 500;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-sm bg-[var(--chart-income,hsl(142_76%_36%))]" />
          Entrate
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-sm bg-[var(--chart-expense,hsl(0_72%_51%))]" />
          Uscite
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-sm bg-[var(--chart-surplus,hsl(142_40%_45%))]" />
          Avanzo
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-sm bg-[var(--chart-deficit,hsl(0_50%_45%))]" />
          Disavanzo
        </span>
      </div>

      {hovered ? (
        <p className="text-sm">
          <span className="font-medium">{hovered.label}</span>{" "}
          <span className="text-muted-foreground">{hovered.detail}</span>
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-md border bg-card">
        <svg viewBox={`0 0 ${width} ${height}`} className="min-h-[400px] w-full">
          {layout.links.map((link, index) => {
            const path = sankeyLinkHorizontal()(link as LayoutLink);
            if (!path) {
              return null;
            }
            const sourceKind = (link.source as LayoutNode).kind;
            return (
              <path
                key={`link-${index}`}
                d={path}
                fill="none"
                stroke={nodeFill(sourceKind)}
                strokeOpacity={0.35}
                strokeWidth={Math.max(1, (link as LayoutLink).width ?? 1)}
              />
            );
          })}

          {layout.nodes.map((node) => {
            const n = node as LayoutNode;
            if (n.id.endsWith("::__terminal__")) {
              return null;
            }
            const tooltipPath = n.fullPath ?? n.label;
            return (
              <g key={n.id}>
                <rect
                  x={n.x0 ?? 0}
                  y={n.y0 ?? 0}
                  width={Math.max(1, (n.x1 ?? 0) - (n.x0 ?? 0))}
                  height={Math.max(1, (n.y1 ?? 0) - (n.y0 ?? 0))}
                  fill={nodeFill(n.kind)}
                  rx={2}
                  onMouseEnter={() =>
                    setHovered({
                      label: tooltipPath,
                      detail: formatEuro(n.value),
                    })
                  }
                  onMouseLeave={() => setHovered(null)}
                />
                <text
                  x={(n.x0 ?? 0) < width / 2 ? (n.x1 ?? 0) + 6 : (n.x0 ?? 0) - 6}
                  y={((n.y0 ?? 0) + (n.y1 ?? 0)) / 2}
                  dy="0.35em"
                  textAnchor={(n.x0 ?? 0) < width / 2 ? "start" : "end"}
                  className="fill-foreground text-[11px]"
                >
                  {truncateSankeyLabel(n.label)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verifica build**

Run: `npm run build`  
Expected: success

- [ ] **Step 3: Commit**

```bash
git add components/cashflow/cashflow-sankey-chart.tsx
git commit -m "feat(cashflow): sankey chart SVG component"
```

---

### Task 7: Dialog Sankey

**Files:**
- Create: `components/cashflow/cashflow-sankey-dialog.tsx`

- [ ] **Step 1: Crea dialog**

```tsx
"use client";

import { useMemo } from "react";
import { CashflowSankeyChart } from "@/components/cashflow/cashflow-sankey-chart";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buildSankeyGraph } from "@/lib/cashflow/sankey";
import { formatOccurredOn } from "@/lib/cashflow/format";
import type { Movement } from "@/lib/cashflow/types";

type CashflowSankeyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movements: Movement[];
  from: string;
  to: string;
  filtersActive: boolean;
};

export function CashflowSankeyDialog({
  open,
  onOpenChange,
  movements,
  from,
  to,
  filtersActive,
}: CashflowSankeyDialogProps) {
  const graph = useMemo(() => buildSankeyGraph(movements), [movements]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Grafico Sankey</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2">
            <span>
              Periodo {formatOccurredOn(from)} – {formatOccurredOn(to)}
            </span>
            {filtersActive ? (
              <Badge variant="secondary">Filtri colonna attivi</Badge>
            ) : null}
          </DialogDescription>
        </DialogHeader>
        <CashflowSankeyChart graph={graph} />
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/cashflow/cashflow-sankey-dialog.tsx
git commit -m "feat(cashflow): sankey dialog wrapper"
```

---

### Task 8: Wiring in MovementsManager

**Files:**
- Modify: `components/cashflow/movements-manager.tsx`

- [ ] **Step 1: Stato, callback, pulsante e dialog**

Aggiungi import:

```tsx
import { CashflowSankeyDialog } from "@/components/cashflow/cashflow-sankey-dialog";
import { BarChart3 } from "lucide-react";
```

Aggiungi stato:

```tsx
const [filteredMovements, setFilteredMovements] = useState<Movement[]>(movements);
const [sankeyOpen, setSankeyOpen] = useState(false);

const handleFilteredMovementsChange = useCallback((next: Movement[]) => {
  setFilteredMovements(next);
}, []);
```

Subito prima di `<MovementsTable ...>`, aggiungi toolbar:

```tsx
<div className="flex flex-wrap items-center justify-between gap-4">
  <p className="text-sm text-muted-foreground">Movimenti</p>
  <Button
    type="button"
    variant="outline"
    disabled={filteredMovements.length === 0}
    onClick={() => setSankeyOpen(true)}
  >
    <BarChart3 className="size-4" />
    Grafico Sankey
  </Button>
</div>
```

Aggiorna `MovementsTable`:

```tsx
<MovementsTable
  ...
  onFilterSummaryChange={handleFilterSummaryChange}
  onFilteredMovementsChange={handleFilteredMovementsChange}
/>

<CashflowSankeyDialog
  open={sankeyOpen}
  onOpenChange={setSankeyOpen}
  movements={filteredMovements}
  from={from}
  to={to}
  filtersActive={filterSummary.active}
/>
```

- [ ] **Step 2: Verifica build e test**

Run: `npm test && npm run build`  
Expected: all tests PASS, build success

- [ ] **Step 3: Commit**

```bash
git add components/cashflow/movements-manager.tsx
git commit -m "feat(cashflow): open sankey chart from movements grid"
```

---

### Task 9: Documentazione test manuali

**Files:**
- Modify: `docs/MANUAL_TEST.md`

- [ ] **Step 1: Aggiungi sezione**

Dopo «Vista personale (share)», inserisci:

```markdown
## Grafico Sankey

- [ ] Cashflow con movimenti categorizzati → pulsante **Grafico Sankey** abilitato sopra la griglia
- [ ] Periodo senza movimenti filtrati → pulsante disabilitato
- [ ] Apri modal → titolo, intervallo date, chart visibile (min-height ~400px)
- [ ] Entrate gerarchiche (es. `monade.stipendio`, `monade.rimborsi`) → foglie a destra, padre `monade`, flusso verso centro
- [ ] Uscite gerarchiche (es. `casa.mutuo`, `casa.corrente comune`) → flusso dal centro verso sinistra (foglie a sinistra)
- [ ] Movimento senza categoria entrata e uscita → due nodi «Senza categoria» distinti
- [ ] Periodo con entrate > uscite → nodo **Avanzo**; uscite > entrate → **Disavanzo**
- [ ] Hover nodo → tooltip con path completo e importo €
- [ ] Applica filtro colonna categoria → badge «Filtri colonna attivi»; chart coerente con righe visibili e totali «Filtrato»
- [ ] Cambio filtro con modal aperto → chart aggiornato
- [ ] Mobile: scroll orizzontale chart se necessario
```

- [ ] **Step 2: Commit**

```bash
git add docs/MANUAL_TEST.md
git commit -m "docs: manual test checklist for cashflow sankey"
```

---

### Task 10: Verifica finale

- [ ] **Step 1: Lint + test + build**

```bash
npm run lint
npm test
npm run build
```

Expected: nessun errore; suite test PASS (inclusi `sankey.test.ts`)

- [ ] **Step 2: Smoke manuale rapido**

1. `npm run dev`
2. Apri `/cashflow` con movimenti nel periodo
3. Clic **Grafico Sankey** → modal con chart
4. Applica filtro categoria → riapri → subset coerente

- [ ] **Step 3: Commit fix eventuali**

Solo se lint/build richiedono aggiustamenti minori (es. import non usati).

---

## Spec coverage (self-review)

| Requisito | Task |
|-----------|------|
| R1–R2 filtered input, no server | Task 5, 8 |
| R3–R7 gerarchia, senza categoria, direzioni | Task 2–4 |
| R8–R10 squilibrio | Task 2–3 |
| R11 padre misto | Task 4, 6 (`directAmount` + terminal layout) |
| R12 altezza nodi ∝ flusso | Task 6 (d3-sankey) |
| R13–R18 UI modal, badge, legenda, truncate | Task 6–8 |
| Test unitari | Task 1–4 |
| MANUAL_TEST | Task 9 |

## Note implementative

1. **Link uscite invertiti in layout** (`toLayoutLinks`): il grafo semantico resta `center → casa → mutuo`; d3 riceve `mutuo → casa → center` così le foglie sono a sinistra.
2. **Nodi `::__terminal__`**: solo per bilanciare d3 quando un padre ha `directAmount > 0`; non mostrati in UI (R11).
3. **Colori**: usare CSS variables con fallback HSL; opzionale aggiungere in `globals.css` se si vogliono token dedicati `--chart-income` ecc.
