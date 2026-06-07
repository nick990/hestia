import { describe, expect, it } from "vitest";
import type { SankeyGraphLink, SankeyGraphNode } from "@/lib/cashflow/sankey";
import { SURPLUS_NODE_ID } from "@/lib/cashflow/sankey";
import {
  applyGroupedNodeOrder,
  assignColumnYPositions,
  orderNodesInColumn,
  reorderLayoutLinks,
  type LayoutAdjacencyLink,
  type LayoutNodeWithLinks,
  type OrderableNode,
} from "@/lib/cashflow/sankey-layout";

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
  for (const node of nodes) {
    let sourceY = node.y0 ?? 0;
    let targetY = node.y0 ?? 0;
    for (const link of node.sourceLinks ?? []) {
      link.y0 = sourceY + (link.width ?? 0) / 2;
      sourceY += link.width ?? 0;
    }
    for (const link of node.targetLinks ?? []) {
      link.y1 = targetY + (link.width ?? 0) / 2;
      targetY += link.width ?? 0;
    }
  }
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
