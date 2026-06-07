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
  level: number;
  directAmount: number;
};

export type SankeyGraphLink = {
  source: string;
  target: string;
  value: number;
};

export type CashflowSankeyGraph = {
  nodes: SankeyGraphNode[];
  links: SankeyGraphLink[];
};

export const CENTER_NODE_ID = "center";
export const SURPLUS_NODE_ID = "surplus";
export const DEFICIT_NODE_ID = "deficit";
export const UNCategorized_INCOME_ID = "income:uncategorized";
export const UNCategorized_EXPENSE_ID = "expense:uncategorized";

const LABEL_MAX = 20;

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
  graph: CashflowSankeyGraph,
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
    const segments = path.split(".");
    const level =
      side === "expense"
        ? -segments.length
        : segments.length;

    graph.nodes.push({
      id: categoryNodeId(side, path),
      label: segmentLabel(path),
      fullPath: path,
      kind: side,
      value,
      level,
      directAmount: directAmounts.get(path) ?? 0,
    });

    if (segments.length === 1) {
      if (side === "expense") {
        graph.links.push({
          source: CENTER_NODE_ID,
          target: categoryNodeId(side, path),
          value,
        });
      } else {
        graph.links.push({
          source: categoryNodeId(side, path),
          target: CENTER_NODE_ID,
          value,
        });
      }
      continue;
    }

    const parentPath = segments.slice(0, -1).join(".");
    if (side === "expense") {
      graph.links.push({
        source: categoryNodeId(side, parentPath),
        target: categoryNodeId(side, path),
        value,
      });
    } else {
      graph.links.push({
        source: categoryNodeId(side, path),
        target: categoryNodeId(side, parentPath),
        value,
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
      level: side === "expense" ? -1 : 1,
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

export const DIRECT_SOURCE_SUFFIX = "::__direct__";
export const DIRECT_SINK_SUFFIX = "::__terminal__";

function getChildFlowSum(
  node: SankeyGraphNode,
  links: SankeyGraphLink[],
): number {
  return links
    .filter((link) => {
      if (link.source === CENTER_NODE_ID || link.target === CENTER_NODE_ID) {
        return false;
      }
      if (node.kind === "expense" || node.kind === "uncategorized-expense") {
        return link.source === node.id;
      }
      if (node.kind === "income" || node.kind === "uncategorized-income") {
        return link.target === node.id;
      }
      return false;
    })
    .reduce((sum, link) => sum + link.value, 0);
}

function buildAuxiliaryNode(
  id: string,
  graph: CashflowSankeyGraph,
): SankeyGraphNode {
  const isDirect = id.endsWith(DIRECT_SOURCE_SUFFIX);
  const suffix = isDirect ? DIRECT_SOURCE_SUFFIX : DIRECT_SINK_SUFFIX;
  const parentId = id.replace(suffix, "");
  const parent = graph.nodes.find((node) => node.id === parentId);
  const level = isDirect
    ? (parent?.level ?? 0) + 1
    : (parent?.level ?? 0) - 1;

  return {
    id,
    label: "",
    fullPath: parent?.fullPath ?? null,
    kind: parent?.kind ?? "expense",
    value: 0,
    level,
    directAmount: 0,
  };
}

/** Adds hidden auxiliary links so mixed parent nodes balance with a single visible outflow. */
export function augmentSankeyGraphForLayout(graph: CashflowSankeyGraph): {
  nodes: SankeyGraphNode[];
  links: SankeyGraphLink[];
} {
  const extraLinks: SankeyGraphLink[] = [];
  const auxiliaryIds = new Set<string>();

  for (const node of graph.nodes) {
    if (
      node.kind === "center" ||
      node.kind === "surplus" ||
      node.kind === "deficit"
    ) {
      continue;
    }

    const childFlow = getChildFlowSum(node, graph.links);
    if (childFlow <= 0) {
      continue;
    }

    const remainder = node.value - childFlow;
    if (remainder <= 0) {
      continue;
    }

    if (node.kind === "income" || node.kind === "uncategorized-income") {
      const directId = `${node.id}${DIRECT_SOURCE_SUFFIX}`;
      auxiliaryIds.add(directId);
      extraLinks.push({
        source: directId,
        target: node.id,
        value: remainder,
      });
    } else if (
      node.kind === "expense" ||
      node.kind === "uncategorized-expense"
    ) {
      const sinkId = `${node.id}${DIRECT_SINK_SUFFIX}`;
      auxiliaryIds.add(sinkId);
      extraLinks.push({
        source: node.id,
        target: sinkId,
        value: remainder,
      });
    }
  }

  const auxiliaryNodes = Array.from(auxiliaryIds).map((id) =>
    buildAuxiliaryNode(id, graph),
  );

  return {
    nodes: [...graph.nodes, ...auxiliaryNodes],
    links: [...graph.links, ...extraLinks],
  };
}

export function isAuxiliarySankeyNodeId(id: string): boolean {
  return id.endsWith(DIRECT_SOURCE_SUFFIX) || id.endsWith(DIRECT_SINK_SUFFIX);
}

export function truncateSankeyLabel(label: string, max = LABEL_MAX): string {
  if (label.length <= max) {
    return label;
  }
  return `${label.slice(0, max - 1)}…`;
}

export function findNode(
  graph: CashflowSankeyGraph,
  id: string,
): SankeyGraphNode | undefined {
  return graph.nodes.find((node) => node.id === id);
}

export function findLink(
  graph: CashflowSankeyGraph,
  source: string,
  target: string,
): SankeyGraphLink | undefined {
  return graph.links.find(
    (link) => link.source === source && link.target === target,
  );
}

export function buildSankeyGraph(movements: Movement[]): CashflowSankeyGraph {
  if (movements.length === 0) {
    return { nodes: [], links: [] };
  }

  const totalIncome = movements
    .filter((m) => m.type === "income")
    .reduce((sum, m) => sum + m.amount, 0);
  const totalExpense = movements
    .filter((m) => m.type === "expense")
    .reduce((sum, m) => sum + m.amount, 0);

  const graph: CashflowSankeyGraph = {
    nodes: [
      {
        id: CENTER_NODE_ID,
        label: "Disponibilità",
        fullPath: null,
        kind: "center",
        value: Math.max(totalIncome, totalExpense),
        level: 0,
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
      level: -1,
      directAmount: surplus,
    });
    graph.links.push({
      source: CENTER_NODE_ID,
      target: SURPLUS_NODE_ID,
      value: surplus,
    });
  }

  return graph;
}
