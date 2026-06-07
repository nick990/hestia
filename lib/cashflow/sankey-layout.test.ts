import { describe, expect, it } from "vitest";
import type { SankeyGraphLink, SankeyGraphNode } from "@/lib/cashflow/sankey";
import { SURPLUS_NODE_ID } from "@/lib/cashflow/sankey";
import {
  alignSankeyLinks,
  applyGroupedNodeOrder,
  applyLinkBreadths,
  assignColumnYPositions,
  computeSankeyTargetTop,
  enforceMinColumnGap,
  expandColumnGaps,
  finalizeLinkAlignment,
  orderNodesInColumn,
  reorderLayoutLinks,
  snapMisalignedLinks,
  syncAuxiliaryNodePositions,
  type LayoutAdjacencyLink,
  type LayoutNodeWithLinks,
  type OrderableNode,
} from "@/lib/cashflow/sankey-layout";
import {
  clampColumnGapX,
  clampColumnGapY,
  computeLayoutInnerHeight,
  SANKEY_COLUMN_GAP_X_DEFAULT,
  SANKEY_COLUMN_GAP_X_MIN,
  SANKEY_COLUMN_GAP_X_STEP,
  SANKEY_COLUMN_GAP_Y_DEFAULT,
  SANKEY_COLUMN_GAP_Y_MIN,
  SANKEY_COLUMN_GAP_Y_STEP,
} from "@/lib/cashflow/sankey-layout-config";

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

  it("posiziona Avanzo sempre per ultimo tra le radici uscite", () => {
    const nodes = [
      node(SURPLUS_NODE_ID, -1, 500),
      node("expense:casa", -1, 100),
      node("expense:auto", -1, 50),
    ];

    const ordered = orderNodesInColumn(nodes, -1, [], new Map());

    expect(ordered.map((n) => n.id)).toEqual([
      "expense:casa",
      "expense:auto",
      SURPLUS_NODE_ID,
    ]);
  });
});

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

    const ordered = orderNodesInColumn(
      nodes,
      -2,
      links,
      new Map([["expense:cat1", 0]]),
    );

    expect(ordered.map((n) => n.id)).toEqual([
      "expense:cat1.cat2",
      "expense:cat1.cat3",
    ]);
  });

  it("simmetrico per entrate (level positivo)", () => {
    const incomeLinks: SankeyGraphLink[] = [
      {
        source: "income:monade.stipendio",
        target: "income:monade",
        value: 200,
      },
      {
        source: "income:monade.rimborsi",
        target: "income:monade",
        value: 50,
      },
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
    expect((cat1.y1 ?? 0) - (cat1.y0 ?? 0)).toBe(40);
    expect((cat2.y1 ?? 0) - (cat2.y0 ?? 0)).toBe(30);
    expect((cat3.y1 ?? 0) - (cat3.y0 ?? 0)).toBe(20);
  });
});

function applyLinkBreadthsForTest(nodes: LayoutNodeWithLinks[]): void {
  applyLinkBreadths({ nodes });
}

describe("reorderLayoutLinks", () => {
  it("ordina targetLinks per y0 del nodo sorgente (rimborsi sopra stipendio)", () => {
    const rimborsi: LayoutNodeWithLinks = {
      id: "income:monade.rimborsi",
      label: "rimborsi",
      fullPath: "monade.rimborsi",
      kind: "income",
      value: 33,
      level: 2,
      directAmount: 33,
      y0: 8,
      y1: 30,
      sourceLinks: [],
      targetLinks: [],
    };
    const stipendio: LayoutNodeWithLinks = {
      id: "income:monade.stipendio",
      label: "stipendio",
      fullPath: "monade.stipendio",
      kind: "income",
      value: 22,
      level: 2,
      directAmount: 22,
      y0: 42,
      y1: 60,
      sourceLinks: [],
      targetLinks: [],
    };
    const monade: LayoutNodeWithLinks = {
      id: "income:monade",
      label: "monade",
      fullPath: "monade",
      kind: "income",
      value: 55,
      level: 1,
      directAmount: 0,
      y0: 20,
      y1: 80,
      sourceLinks: [],
      targetLinks: [],
    };

    const linkStipendio: LayoutAdjacencyLink = {
      source: stipendio,
      target: monade,
      index: 0,
      width: 22,
      value: 22,
    };
    const linkRimborsi: LayoutAdjacencyLink = {
      source: rimborsi,
      target: monade,
      index: 1,
      width: 33,
      value: 33,
    };

    stipendio.sourceLinks = [linkStipendio];
    rimborsi.sourceLinks = [linkRimborsi];
    monade.targetLinks = [linkStipendio, linkRimborsi];

    reorderLayoutLinks({ nodes: [rimborsi, stipendio, monade] });
    applyLinkBreadthsForTest([monade]);

    expect(monade.targetLinks!.map((link) => link.source.id)).toEqual([
      "income:monade.rimborsi",
      "income:monade.stipendio",
    ]);
    expect(linkRimborsi.y1!).toBeLessThan(linkStipendio.y1!);
  });

  it("ordina sourceLinks per y0 del nodo destinazione", () => {
    const parent: LayoutNodeWithLinks = {
      id: "expense:utenze",
      label: "utenze",
      fullPath: "utenze",
      kind: "expense",
      value: 226,
      level: -1,
      directAmount: 0,
      y0: 8,
      y1: 80,
      sourceLinks: [],
      targetLinks: [],
    };
    const gas: LayoutNodeWithLinks = {
      id: "expense:utenze.gas",
      label: "gas",
      fullPath: "utenze.gas",
      kind: "expense",
      value: 45,
      level: -2,
      directAmount: 45,
      y0: 60,
      y1: 90,
      sourceLinks: [],
      targetLinks: [],
    };
    const corrente: LayoutNodeWithLinks = {
      id: "expense:utenze.corrente",
      label: "corrente",
      fullPath: "utenze.corrente",
      kind: "expense",
      value: 119,
      level: -2,
      directAmount: 119,
      y0: 8,
      y1: 50,
      sourceLinks: [],
      targetLinks: [],
    };

    const linkGas: LayoutAdjacencyLink = {
      source: parent,
      target: gas,
      index: 0,
      width: 45,
      value: 45,
    };
    const linkCorrente: LayoutAdjacencyLink = {
      source: parent,
      target: corrente,
      index: 1,
      width: 119,
      value: 119,
    };

    parent.sourceLinks = [linkGas, linkCorrente];
    gas.targetLinks = [linkGas];
    corrente.targetLinks = [linkCorrente];

    reorderLayoutLinks({ nodes: [parent, gas, corrente] });
    applyLinkBreadthsForTest([parent]);

    expect(parent.sourceLinks!.map((link) => link.target.id)).toEqual([
      "expense:utenze.corrente",
      "expense:utenze.gas",
    ]);
    expect(linkCorrente.y0!).toBeLessThan(linkGas.y0!);
  });
});

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

    const py = 12;
    const top = computeSankeyTargetTop(source, center, py);
    expect(top).toBe(50 - 12 / 2 + 20 + 12);
  });
});

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
      y0: 33,
      y1: 250,
    };

    monade.sourceLinks = [link];
    center.targetLinks = [link];

    alignSankeyLinks(
      { nodes: [center, monade] },
      {
        nodePadding: 12,
        iterations: 6,
      },
    );

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

    alignSankeyLinks(
      { nodes: [a, b] },
      {
        nodePadding: 12,
        iterations: 6,
      },
    );

    const sorted = [...[a, b]].sort((x, y) => (x.y0 ?? 0) - (y.y0 ?? 0));
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

    alignSankeyLinks(
      { nodes: [node] },
      {
        nodePadding: 12,
        iterations: 6,
      },
    );

    expect((node.y1 ?? 0) - (node.y0 ?? 0)).toBe(heightBefore);
  });
});

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
      { nodePadding: 12, iterations: 6 },
    );
    applyLinkBreadthsForTest([monade, center, stipendio, rimborsi]);

    expect(
      Math.abs((linkMonadeCenter.y0 ?? 0) - (linkMonadeCenter.y1 ?? 0)),
    ).toBeLessThan(1);
  });
});

describe("snapMisalignedLinks — centro con molte uscite + Avanzo", () => {
  it("allinea il link centro → Avanzo con colonna uscite alta", () => {
    const center: LayoutNodeWithLinks = {
      id: "center",
      label: "Disponibilità",
      fullPath: null,
      kind: "center",
      value: 5000,
      level: 0,
      directAmount: 0,
      x0: 400,
      x1: 490,
      y0: 8,
      y1: 5008,
      sourceLinks: [],
      targetLinks: [],
    };

    const expenses: LayoutNodeWithLinks[] = [];
    const expenseLinks: LayoutAdjacencyLink[] = [];
    let expenseY = 8;
    const expenseValues = [678, 626, 408, 265, 221, 180, 150, 120, 90, 60];

    for (const [index, value] of expenseValues.entries()) {
      const expense: LayoutNodeWithLinks = {
        id: `expense:cat${index}`,
        label: `cat${index}`,
        fullPath: `cat${index}`,
        kind: "expense",
        value,
        level: -1,
        directAmount: value,
        x0: 300,
        x1: 316,
        y0: expenseY,
        y1: expenseY + value,
        sourceLinks: [],
        targetLinks: [],
      };
      expenseY += value + 12;
      expenses.push(expense);

      const link: LayoutAdjacencyLink = {
        source: center,
        target: expense,
        width: value,
        value,
      };
      expenseLinks.push(link);
      expense.sourceLinks = [];
      expense.targetLinks = [link];
    }

    const surplus: LayoutNodeWithLinks = {
      id: SURPLUS_NODE_ID,
      label: "Avanzo",
      fullPath: null,
      kind: "surplus",
      value: 3450,
      level: -1,
      directAmount: 3450,
      x0: 300,
      x1: 316,
      y0: expenseY,
      y1: expenseY + 3450,
      sourceLinks: [],
      targetLinks: [],
    };

    const surplusLink: LayoutAdjacencyLink = {
      source: center,
      target: surplus,
      width: 3450,
      value: 3450,
    };
    surplus.targetLinks = [surplusLink];
    expenseLinks.push(surplusLink);

    center.sourceLinks = expenseLinks;
    const nodes = [center, ...expenses, surplus];

    alignSankeyLinks({ nodes }, { nodePadding: 12, iterations: 6 });
    applyLinkBreadths({ nodes });
    snapMisalignedLinks({ nodes }, { nodePadding: 12 });
    finalizeLinkAlignment({ nodes });

    expect(
      Math.abs((surplusLink.y0 ?? 0) - (surplusLink.y1 ?? 0)),
    ).toBeLessThan(1);

    const lastExpense = expenses[expenses.length - 1];
    expandColumnGaps({ nodes }, 12);
    enforceMinColumnGap({ nodes }, 0);

    expect((surplus.y0 ?? 0)).toBeGreaterThanOrEqual(
      (lastExpense.y1 ?? 0) + 12,
    );
  });
});

describe("enforceMinColumnGap", () => {
  it("separa nodi sovrapposti nella stessa colonna", () => {
    const top: LayoutNodeWithLinks = {
      id: "expense:a",
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
      id: "expense:b",
      label: "b",
      fullPath: "b",
      kind: "expense",
      value: 40,
      level: -1,
      directAmount: 40,
      x0: 300,
      x1: 316,
      y0: 40,
      y1: 80,
      sourceLinks: [],
      targetLinks: [],
    };

    enforceMinColumnGap({ nodes: [top, bottom] }, 12);

    expect(bottom.y0).toBeGreaterThanOrEqual(58 + 12);
  });
});

describe("columnGapY e altezza layout", () => {
  it("gap maggiore produce colonna più alta a parità di altezze nodo", () => {
    const nodes = [
      { id: "a", height: 40 },
      { id: "b", height: 30 },
      { id: "c", height: 20 },
    ];

    const compact = assignColumnYPositions(nodes, 8, 6);
    const spacious = assignColumnYPositions(nodes, 8, 24);

    expect(spacious.get("c")!.y1).toBeGreaterThan(compact.get("c")!.y1);
  });

  it("computeLayoutInnerHeight è indipendente dal gap colonna", () => {
    const nodes = [
      {
        id: "center",
        label: "c",
        fullPath: null,
        kind: "center" as const,
        value: 5000,
        level: 0,
        directAmount: 0,
      },
    ];
    expect(computeLayoutInnerHeight(nodes, 472)).toBe(500);
  });
});

describe("finalizeLinkAlignment", () => {
  it("allinea centro → Avanzo dopo reorder+update simulati", () => {
    const center: LayoutNodeWithLinks = {
      id: "center",
      label: "Disponibilità",
      fullPath: null,
      kind: "center",
      value: 5000,
      level: 0,
      directAmount: 0,
      x0: 400,
      x1: 490,
      y0: 8,
      y1: 5008,
      sourceLinks: [],
      targetLinks: [],
    };

    const expenses: LayoutNodeWithLinks[] = [];
    const expenseLinks: LayoutAdjacencyLink[] = [];
    let expenseY = 8;
    const expenseValues = [678, 626, 408, 265, 221, 180, 150, 120, 90, 60];

    for (const [index, value] of expenseValues.entries()) {
      const expense: LayoutNodeWithLinks = {
        id: `expense:cat${index}`,
        label: `cat${index}`,
        fullPath: `cat${index}`,
        kind: "expense",
        value,
        level: -1,
        directAmount: value,
        x0: 300,
        x1: 316,
        y0: expenseY,
        y1: expenseY + value,
        sourceLinks: [],
        targetLinks: [],
      };
      expenseY += value + 12;
      expenses.push(expense);

      const link: LayoutAdjacencyLink = {
        source: center,
        target: expense,
        width: value,
        value,
      };
      expenseLinks.push(link);
      expense.targetLinks = [link];
    }

    const surplus: LayoutNodeWithLinks = {
      id: SURPLUS_NODE_ID,
      label: "Avanzo",
      fullPath: null,
      kind: "surplus",
      value: 3450,
      level: -1,
      directAmount: 3450,
      x0: 300,
      x1: 316,
      y0: expenseY,
      y1: expenseY + 3450,
      sourceLinks: [],
      targetLinks: [],
    };

    const surplusLink: LayoutAdjacencyLink = {
      source: center,
      target: surplus,
      width: 3450,
      value: 3450,
    };
    surplus.targetLinks = [surplusLink];
    expenseLinks.push(surplusLink);
    center.sourceLinks = expenseLinks;

    const nodes = [center, ...expenses, surplus];

    alignSankeyLinks({ nodes }, { nodePadding: 12, iterations: 6 });
    reorderLayoutLinks({ nodes });
    applyLinkBreadths({ nodes });
    snapMisalignedLinks({ nodes }, { nodePadding: 12 });
    reorderLayoutLinks({ nodes });
    applyLinkBreadths({ nodes });
    finalizeLinkAlignment({ nodes });

    expect(
      Math.abs((surplusLink.y0 ?? 0) - (surplusLink.y1 ?? 0)),
    ).toBeLessThan(1);

    const lastExpense = expenses[expenses.length - 1];
    expandColumnGaps({ nodes }, 12);
    enforceMinColumnGap({ nodes }, 0);

    expect((surplus.y0 ?? 0)).toBeGreaterThanOrEqual(
      (lastExpense.y1 ?? 0) + 12,
    );
  });
});

describe("clampColumnGapX", () => {
  it("floor a 12 px", () => {
    expect(clampColumnGapX(0)).toBe(12);
    expect(clampColumnGapX(12)).toBe(12);
  });

  it("nessun cap superiore", () => {
    expect(clampColumnGapX(500)).toBe(500);
  });

  it("step e default", () => {
    expect(SANKEY_COLUMN_GAP_X_STEP).toBe(1);
    expect(SANKEY_COLUMN_GAP_X_MIN).toBe(12);
    expect(SANKEY_COLUMN_GAP_X_DEFAULT).toBe(12);
  });
});

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

  it("step e min sono 12 / 1", () => {
    expect(SANKEY_COLUMN_GAP_Y_STEP).toBe(1);
    expect(SANKEY_COLUMN_GAP_Y_MIN).toBe(12);
    expect(SANKEY_COLUMN_GAP_Y_DEFAULT).toBe(12);
  });
});

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
      y0: 70,
      y1: 110,
      sourceLinks: [],
      targetLinks: [],
    };
    const userV = 12;

    expandColumnGaps({ nodes: [top, bottom] }, userV);

    const gap = (bottom.y0 ?? 0) - (top.y1 ?? 0);
    expect(gap).toBeCloseTo(12 + userV, 5);
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

    expandColumnGaps({ nodes }, 12);

    expect((nodes[1].y0 ?? 0) - (nodes[0].y1 ?? 0)).toBeCloseTo(22, 5);
    expect((nodes[2].y0 ?? 0) - (nodes[1].y1 ?? 0)).toBeCloseTo(22, 5);
  });

  it("applica userV uniformemente su colonne diverse", () => {
    const mk = (
      id: string,
      x0: number,
      y0: number,
      y1: number,
    ): LayoutNodeWithLinks => ({
      id,
      label: id,
      fullPath: id,
      kind: "expense",
      value: 10,
      level: -1,
      directAmount: 10,
      x0,
      x1: x0 + 16,
      y0,
      y1,
      sourceLinks: [],
      targetLinks: [],
    });
    const colA = [mk("a1", 100, 0, 20), mk("a2", 100, 30, 50)];
    const colB = [mk("b1", 200, 5, 25), mk("b2", 200, 35, 55)];
    const nodes = [...colA, ...colB];

    expandColumnGaps({ nodes }, 12);

    expect((colA[1].y0 ?? 0) - (colA[0].y1 ?? 0)).toBeCloseTo(22, 5);
    expect((colB[1].y0 ?? 0) - (colB[0].y1 ?? 0)).toBeCloseTo(22, 5);
  });

  it("Avanzo resta sotto l'ultima uscita con gap userV", () => {
    const lastExpense: LayoutNodeWithLinks = {
      id: "expense:trasporti",
      label: "trasporti",
      fullPath: "trasporti",
      kind: "expense",
      value: 200,
      level: -1,
      directAmount: 200,
      x0: 300,
      x1: 316,
      y0: 400,
      y1: 600,
      sourceLinks: [],
      targetLinks: [],
    };
    const surplus: LayoutNodeWithLinks = {
      id: SURPLUS_NODE_ID,
      label: "Avanzo",
      fullPath: null,
      kind: "surplus",
      value: 3450,
      level: -1,
      directAmount: 3450,
      x0: 300,
      x1: 316,
      y0: 550,
      y1: 4000,
      sourceLinks: [],
      targetLinks: [],
    };
    const surplusLink: LayoutAdjacencyLink = {
      source: {
        id: "center",
        y0: 8,
      },
      target: surplus,
      y0: 520,
      width: 3450,
      value: 3450,
    };
    surplus.targetLinks = [surplusLink];
    const userV = 25;

    expandColumnGaps({ nodes: [lastExpense, surplus] }, userV);

    expect((surplus.y0 ?? 0)).toBeGreaterThanOrEqual((lastExpense.y1 ?? 0) + userV);
  });
});

describe("pipeline expandColumnGaps", () => {
  it("altezza colonna cresce con userV maggiore", () => {
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

    const run = (userV: number) => {
      const nodes = [mk("a", 0, 20), mk("b", 30, 50), mk("c", 60, 80)];
      finalizeLinkAlignment({ nodes });
      expandColumnGaps({ nodes }, userV);
      enforceMinColumnGap({ nodes }, 0);
      return Math.max(...nodes.map((n) => n.y1 ?? 0));
    };

    expect(run(24)).toBeGreaterThan(run(12));
  });
});
