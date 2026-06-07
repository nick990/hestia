# Cashflow Sankey — Spacing verticale additivo (V)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Applicare V come gap **additivo** uniforme su ogni colonna dopo il layout link: `gapEffettivo = gapLayout + userV`, con controllo UI step 1 px, minimo 12 px, nessun cap.

**Architecture:** `applyGroupedNodeOrder` impila compatto (gap 0); align/finalize producono `gapLayout`; `expandColumnGaps(userV)` aggiunge `userV` tra ogni coppia adiacente preservando `gapLayout`; `enforceMinColumnGap(0)` come rete di sicurezza. Config e UI aggiornati per min 12 / step 1 / no max.

**Spec:** [`docs/superpowers/specs/2026-06-07-cashflow-sankey-column-gap-additive-design.md`](../specs/2026-06-07-cashflow-sankey-column-gap-additive-design.md)

**Tech Stack:** TypeScript, Vitest, React 19, d3-sankey.

---

## File map

| File | Responsabilità |
|------|----------------|
| `lib/cashflow/sankey-layout.ts` | Nuova `expandColumnGaps`; export se utile per test |
| `lib/cashflow/sankey-layout-config.ts` | Min 12, step 1, rimuovi MAX, clamp senza cap |
| `lib/cashflow/sankey-layout.test.ts` | Test unitari + integrazione pipeline |
| `components/cashflow/sankey-layout-controls.tsx` | UI V: − fino a 12, + illimitato |
| `components/cashflow/cashflow-sankey-chart.tsx` | Pipeline: grouped gap 0 → finalize → expand → enforce(0) |
| `docs/superpowers/specs/2026-06-07-cashflow-sankey-column-gap-additive-design.md` | Stato → Approvato |
| `docs/MANUAL_TEST.md` | Checklist V additivo |

---

### Task 1: Config V (min 12, step 1, no cap)

**Files:**
- Modify: `lib/cashflow/sankey-layout-config.ts`
- Test: `lib/cashflow/sankey-layout.test.ts`

- [ ] **Step 1: Test clamp**

Aggiungere in `sankey-layout.test.ts`:

```ts
import {
  clampColumnGapY,
  SANKEY_COLUMN_GAP_Y_MIN,
  SANKEY_COLUMN_GAP_Y_STEP,
} from "./sankey-layout-config";

describe("clampColumnGapY additivo", () => {
  it("floor a 12 px", () => {
    expect(clampColumnGapY(0)).toBe(12);
    expect(clampColumnGapY(6)).toBe(12);
    expect(clampColumnGapY(12)).toBe(12);
  });

  it("nessun cap superiore", () => {
    expect(clampColumnGapY(100)).toBe(100);
    expect(clampColumnGapY(999)).toBe(999);
  });

  it("step è 1", () => {
    expect(SANKEY_COLUMN_GAP_Y_STEP).toBe(1);
    expect(SANKEY_COLUMN_GAP_Y_MIN).toBe(12);
  });
});
```

- [ ] **Step 2: Run test — deve fallire**

Run: `npm test -- lib/cashflow/sankey-layout.test.ts -t "clampColumnGapY additivo"`

Expected: FAIL (valori/config non ancora aggiornati)

- [ ] **Step 3: Implementa config**

In `lib/cashflow/sankey-layout-config.ts`:

```ts
export const SANKEY_COLUMN_GAP_Y_DEFAULT = 12;
export const SANKEY_COLUMN_GAP_Y_MIN = 12;
export const SANKEY_COLUMN_GAP_Y_STEP = 1;
// Rimuovere SANKEY_COLUMN_GAP_Y_MAX

export function clampColumnGapY(value: number): number {
  return Math.max(SANKEY_COLUMN_GAP_Y_MIN, value);
}
```

- [ ] **Step 4: Run test — deve passare**

Run: `npm test -- lib/cashflow/sankey-layout.test.ts -t "clampColumnGapY additivo"`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/cashflow/sankey-layout-config.ts lib/cashflow/sankey-layout.test.ts
git commit -m "refactor(sankey): V min 12, step 1, no cap"
```

---

### Task 2: `expandColumnGaps` (TDD)

**Files:**
- Modify: `lib/cashflow/sankey-layout.ts`
- Test: `lib/cashflow/sankey-layout.test.ts`

- [ ] **Step 1: Test unitario**

```ts
import { expandColumnGaps } from "./sankey-layout";

describe("expandColumnGaps", () => {
  it("aggiunge userV sopra gapLayout tra nodi adiacenti", () => {
    const top: LayoutNodeWithLinks = {
      id: "a",
      label: "a",
      fullPath: "a",
      kind: "expense",
      value: 50,
      level: -1,
      directAmount: 50,
      x0: 300,
      x1: 316,
      y0: 8,
      y1: 58,
      sourceLinks: [],
      targetLinks: [],
    };
    const bottom: LayoutNodeWithLinks = {
      id: "b",
      label: "b",
      fullPath: "b",
      kind: "expense",
      value: 40,
      level: -1,
      directAmount: 40,
      x0: 300,
      x1: 316,
      y0: 70, // gapLayout = 70 - 58 = 12
      y1: 110,
      sourceLinks: [],
      targetLinks: [],
    };
    const userV = 12;

    expandColumnGaps({ nodes: [top, bottom] }, userV);

    const gap = (bottom.y0 ?? 0) - (top.y1 ?? 0);
    expect(gap).toBeCloseTo(12 + userV, 5); // gapLayout + userV
    expect(bottom.y1).toBeCloseTo(110 + userV, 5);
  });

  it("applica userV su ogni coppia in colonna da 3 nodi", () => {
    const mk = (id: string, y0: number, y1: number): LayoutNodeWithLinks => ({
      id,
      label: id,
      fullPath: id,
      kind: "expense",
      value: 10,
      level: -1,
      directAmount: 10,
      x0: 100,
      x1: 116,
      y0,
      y1,
      sourceLinks: [],
      targetLinks: [],
    });
    const nodes = [mk("a", 0, 20), mk("b", 30, 50), mk("c", 60, 80)];
    // gapLayout: 10, 10

    expandColumnGaps({ nodes }, 12);

    expect((nodes[1].y0 ?? 0) - (nodes[0].y1 ?? 0)).toBeCloseTo(22, 5);
    expect((nodes[2].y0 ?? 0) - (nodes[1].y1 ?? 0)).toBeCloseTo(22, 5);
  });
});
```

- [ ] **Step 2: Run test — deve fallire**

Run: `npm test -- lib/cashflow/sankey-layout.test.ts -t "expandColumnGaps"`

Expected: FAIL (`expandColumnGaps` not exported / not defined)

- [ ] **Step 3: Implementa**

In `lib/cashflow/sankey-layout.ts`, dopo `enforceMinColumnGap`:

```ts
/** Aggiunge userGap px tra ogni coppia adiacente preservando gapLayout post-align. */
export function expandColumnGaps(
  layout: {
    nodes: Array<
      SankeyGraphNode & {
        x0?: number;
        y0?: number;
        y1?: number;
      }
    >;
  },
  userGap: number,
): void {
  if (userGap <= 0) {
    return;
  }

  const relaxNodes = layout.nodes.filter(
    (node) => !isAuxiliarySankeyNodeId(node.id),
  ) as RelaxNode[];

  for (const column of buildColumns(relaxNodes)) {
    if (column.length <= 1) {
      continue;
    }

    const snapshots = column.map((node) => ({
      y0: node.y0 ?? 0,
      y1: node.y1 ?? 0,
    }));

    for (let i = 1; i < column.length; i++) {
      const previous = column[i - 1];
      const current = column[i];
      const layoutGap = snapshots[i].y0 - snapshots[i - 1].y1;
      const targetY0 = (previous.y1 ?? 0) + layoutGap + userGap;
      shiftNodeY(current, targetY0 - (current.y0 ?? 0));
    }
  }

  applyLinkBreadths(layout);
  syncAuxiliaryNodePositions(layout.nodes);
}
```

- [ ] **Step 4: Run test — deve passare**

Run: `npm test -- lib/cashflow/sankey-layout.test.ts -t "expandColumnGaps"`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/cashflow/sankey-layout.ts lib/cashflow/sankey-layout.test.ts
git commit -m "feat(sankey): expandColumnGaps additivo post-layout"
```

---

### Task 3: Pipeline chart + test integrazione

**Files:**
- Modify: `components/cashflow/cashflow-sankey-chart.tsx`
- Modify: `lib/cashflow/sankey-layout.test.ts`

- [ ] **Step 1: Test integrazione pipeline**

Aggiornare il test esistente che fa `enforceMinColumnGap` **prima** di `finalizeLinkAlignment` (circa riga 806–810) e aggiungere:

```ts
describe("pipeline expandColumnGaps", () => {
  it("viewHeight cresce con userV a parità di nodi", () => {
    // fixture minimal: 3 nodi stessa colonna post-align simulato
    const nodes = [/* top, mid, bottom con link mock se serve */];
    alignSankeyLinks({ nodes }, { nodePadding: 12, iterations: 6 });
    snapMisalignedLinks({ nodes }, { nodePadding: 12 });
    finalizeLinkAlignment({ nodes });
    const y1Before = Math.max(...nodes.map((n) => n.y1 ?? 0));

    expandColumnGaps({ nodes }, 12);
    const y1After12 = Math.max(...nodes.map((n) => n.y1 ?? 0));

    // reset fixture e ripeti con userV=24
    // ...
    expect(y1After24 - y1After12).toBeGreaterThan(0);
  });

  it("gap uniforme tra colonne diverse dopo expand", () => {
    // 2 colonne x0 diverse, ciascuna con 2 nodi
    // finalize → expandColumnGaps(12)
    // assert gap adiacente === gapLayout + 12 in entrambe
  });
});
```

Adattare la fixture surplus esistente:

```ts
// PRIMA (vecchio ordine):
enforceMinColumnGap({ nodes }, 12);
finalizeLinkAlignment({ nodes });

// DOPO (nuovo ordine):
finalizeLinkAlignment({ nodes });
expandColumnGaps({ nodes }, 12);
enforceMinColumnGap({ nodes }, 0);
```

- [ ] **Step 2: Run test — fallisce su pipeline chart (ok se solo test layout aggiornati passano parzialmente)**

Run: `npm test -- lib/cashflow/sankey-layout.test.ts`

- [ ] **Step 3: Aggiorna chart pipeline**

In `components/cashflow/cashflow-sankey-chart.tsx`:

1. Import `expandColumnGaps` da `@/lib/cashflow/sankey-layout`.
2. Cambiare `applyGroupedNodeOrder`:

```ts
applyGroupedNodeOrder(result, links, {
  marginTop: CHART_MARGIN_TOP,
  nodePadding: 0,
});
```

3. Sostituire blocco finale:

```ts
// RIMUOVI:
enforceMinColumnGap(result, columnGapY);
finalizeLinkAlignment(result);

// AGGIUNGI:
finalizeLinkAlignment(
  result as unknown as Parameters<typeof finalizeLinkAlignment>[0],
);
expandColumnGaps(
  result as unknown as Parameters<typeof expandColumnGaps>[0],
  columnGapY,
);
enforceMinColumnGap(
  result as unknown as Parameters<typeof enforceMinColumnGap>[0],
  0,
);
```

- [ ] **Step 4: Run suite layout**

Run: `npm test -- lib/cashflow/sankey-layout.test.ts`

Expected: PASS (tutti)

- [ ] **Step 5: Commit**

```bash
git add components/cashflow/cashflow-sankey-chart.tsx lib/cashflow/sankey-layout.test.ts
git commit -m "feat(sankey): pipeline V additivo post-finalize"
```

---

### Task 4: UI controls + docs

**Files:**
- Modify: `components/cashflow/sankey-layout-controls.tsx`
- Modify: `docs/superpowers/specs/2026-06-07-cashflow-sankey-column-gap-additive-design.md`
- Modify: `docs/MANUAL_TEST.md`

- [ ] **Step 1: Aggiorna controls**

In `sankey-layout-controls.tsx`:

```ts
// Rimuovi import SANKEY_COLUMN_GAP_Y_MAX
const canDecreaseV = columnGapY > SANKEY_COLUMN_GAP_Y_MIN;
const canIncreaseV = true;
```

- [ ] **Step 2: Aggiorna spec stato**

In `2026-06-07-cashflow-sankey-column-gap-additive-design.md`: `Stato: Approvato`

- [ ] **Step 3: MANUAL_TEST checklist**

Aggiungere voci:

```markdown
- [ ] V a 12 (minimo): grafico compatto ma senza overlap nodi
- [ ] V +1 px alla volta: altezza grafico cresce, gap visivo uniforme su income L1/L2 e expense L-1/L-2
- [ ] V alto (es. 48+): nessun cap, scroll verticale ok
- [ ] Link centro → Avanzo ancora orizzontali dopo expand
```

- [ ] **Step 4: Run suite completa**

Run: `npm test`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/cashflow/sankey-layout-controls.tsx docs/
git commit -m "docs(sankey): UI V senza cap + checklist spacing additivo"
```

---

## Self-review (spec → plan)

| Requisito spec | Task |
|----------------|------|
| A1 min 12, step 1, no cap | Task 1, Task 4 |
| A2 gapLayout + userV | Task 2 |
| A3 uniforme tutte colonne | Task 2 (`buildColumns`), Task 3 |
| A4 V↑ → viewHeight↑ | Task 3 integrazione |
| A5 no overlap | Task 3 `enforceMinColumnGap(0)` |
| A6 linkPadding/H invariati | Task 3 (solo V tocato) |

Nessun placeholder TBD nel piano.

---

## Verifica manuale post-implementazione

1. Apri cashflow Sankey, periodo anno 2026.
2. V=12: controlla gap simile su tutte le colonne.
3. V=20, V=40: grafico cresce, − ferma a 12.
4. Link Avanzo / cross-colonna: nessuna pancia.
