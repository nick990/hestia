import { describe, expect, it } from "vitest";
import type { Movement } from "@/lib/cashflow/types";
import {
  augmentSankeyGraphForLayout,
  buildSankeyGraph,
  CENTER_NODE_ID,
  DEFICIT_NODE_ID,
  DIRECT_SOURCE_SUFFIX,
  DIRECT_SINK_SUFFIX,
  findLink,
  findNode,
  SURPLUS_NODE_ID,
  truncateSankeyLabel,
  UNCategorized_EXPENSE_ID,
  UNCategorized_INCOME_ID,
} from "@/lib/cashflow/sankey";

function movement(overrides: Partial<Movement> = {}): Movement {
  return {
    id: "1",
    type: "expense",
    amount: 0,
    occurred_on: "2026-06-01",
    description: "",
    created_at: "2026-06-01T00:00:00Z",
    category_id: null,
    category_name: null,
    created_by: "u1",
    assignee_kind: "member",
    assignee_user_id: "u1",
    is_private: false,
    creator_name: null,
    assignee_name: null,
    ...overrides,
  };
}

describe("truncateSankeyLabel", () => {
  it("truncates long labels", () => {
    expect(truncateSankeyLabel("casa.corrente comune extra")).toBe(
      "casa.corrente comun…",
    );
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
    expect(findLink(graph, "expense:casa", "expense:casa.mutuo")?.value).toBe(
      100,
    );
    expect(
      findLink(graph, "expense:casa", "expense:casa.corrente comune")?.value,
    ).toBe(50);

    expect(casa.level).toBe(-1);
    expect(mutuo.level).toBe(-2);
    expect(casa.directAmount).toBe(0);
  });

  it("builds expense hierarchy with three or more dot levels", () => {
    const graph = buildSankeyGraph([
      movement({
        id: "1",
        type: "expense",
        amount: 100,
        category_name: "cat1.cat2.cat3",
      }),
    ]);

    expect(findLink(graph, CENTER_NODE_ID, "expense:cat1")?.value).toBe(100);
    expect(findLink(graph, "expense:cat1", "expense:cat1.cat2")?.value).toBe(
      100,
    );
    expect(
      findLink(graph, "expense:cat1.cat2", "expense:cat1.cat2.cat3")?.value,
    ).toBe(100);
    expect(findNode(graph, "expense:cat1.cat2.cat3")?.level).toBe(-3);
  });

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
    expect(
      findLink(graph, "income:monade.stipendio", "income:monade")?.value,
    ).toBe(100);
    expect(findLink(graph, "income:monade", CENTER_NODE_ID)?.value).toBe(150);
    expect(monade.level).toBe(1);
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

  it("does not add deficit node when expense exceeds income", () => {
    const graph = buildSankeyGraph([
      movement({ id: "1", type: "income", amount: 100 }),
      movement({ id: "2", type: "expense", amount: 250 }),
    ]);

    expect(findNode(graph, DEFICIT_NODE_ID)).toBeUndefined();
    expect(findNode(graph, SURPLUS_NODE_ID)).toBeUndefined();
  });

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
    expect(findLink(graph, "expense:casa", "expense:casa.mutuo")?.value).toBe(
      100,
    );
    expect(findLink(graph, CENTER_NODE_ID, "expense:casa")?.value).toBe(150);
  });

  it("builds monade income hierarchy with mixed parent and three levels", () => {
    const graph = buildSankeyGraph([
      movement({
        id: "1",
        type: "income",
        amount: 11,
        category_name: "monade.stipendio.extra",
      }),
      movement({
        id: "2",
        type: "income",
        amount: 22,
        category_name: "monade.stipendio",
      }),
      movement({
        id: "3",
        type: "income",
        amount: 33,
        category_name: "monade.rimborsi",
      }),
    ]);

    const monade = findNode(graph, "income:monade")!;
    const stipendio = findNode(graph, "income:monade.stipendio")!;
    const extra = findNode(graph, "income:monade.stipendio.extra")!;
    const rimborsi = findNode(graph, "income:monade.rimborsi")!;

    expect(monade.value).toBe(66);
    expect(stipendio.value).toBe(33);
    expect(stipendio.directAmount).toBe(22);
    expect(extra.value).toBe(11);
    expect(rimborsi.value).toBe(33);

    expect(
      findLink(graph, "income:monade.stipendio.extra", "income:monade.stipendio")
        ?.value,
    ).toBe(11);
    expect(
      findLink(graph, "income:monade.stipendio", "income:monade")?.value,
    ).toBe(33);
    expect(
      findLink(graph, "income:monade.rimborsi", "income:monade")?.value,
    ).toBe(33);
    expect(findLink(graph, "income:monade", CENTER_NODE_ID)?.value).toBe(66);

    const layout = augmentSankeyGraphForLayout(graph);
    const stipendioOut = layout.links.filter(
      (link) =>
        link.source === "income:monade.stipendio" &&
        !link.target.endsWith(DIRECT_SINK_SUFFIX),
    );
    expect(stipendioOut).toHaveLength(1);
    expect(stipendioOut[0]?.value).toBe(33);
    expect(
      findLink(
        { nodes: layout.nodes, links: layout.links },
        `income:monade.stipendio${DIRECT_SOURCE_SUFFIX}`,
        "income:monade.stipendio",
      )?.value,
    ).toBe(22);
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
});
