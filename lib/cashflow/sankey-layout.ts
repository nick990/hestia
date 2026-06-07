import {
  isAuxiliarySankeyNodeId,
  SURPLUS_NODE_ID,
  type SankeyGraphLink,
  type SankeyGraphNode,
} from "@/lib/cashflow/sankey";

export type OrderableNode = {
  id: string;
  level: number;
  value: number;
};

export type LayoutGraph = {
  nodes: Array<SankeyGraphNode & { y0?: number; y1?: number }>;
  links: SankeyGraphLink[];
};

export type LayoutAdjacencyLink = {
  source: { id: string; y0?: number };
  target: { id: string; y0?: number };
  index?: number;
  y0?: number;
  y1?: number;
  width?: number;
  value?: number;
};

export type LayoutNodeWithLinks = SankeyGraphNode & {
  y0?: number;
  y1?: number;
  sourceLinks?: LayoutAdjacencyLink[];
  targetLinks?: LayoutAdjacencyLink[];
};

export type GroupedOrderOptions = {
  marginTop: number;
  nodePadding: number;
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

function compareRootNodes(a: OrderableNode, b: OrderableNode): number {
  const aSurplus = a.id === SURPLUS_NODE_ID;
  const bSurplus = b.id === SURPLUS_NODE_ID;
  if (aSurplus !== bSurplus) {
    return aSurplus ? 1 : -1;
  }
  return compareByValueDesc(a, b);
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
    return [...nodes].sort(compareRootNodes);
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

function nodeHeight(
  node: SankeyGraphNode & { y0?: number; y1?: number },
): number {
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

    const positions = assignColumnYPositions(
      withHeights,
      marginTop,
      nodePadding,
    );

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

function compareNodeY0(
  a: { y0?: number; id: string },
  b: { y0?: number; id: string },
): number {
  const dy = (a.y0 ?? 0) - (b.y0 ?? 0);
  if (dy !== 0) {
    return dy;
  }
  return a.id.localeCompare(b.id);
}

function compareLinksBySourceY0(
  a: LayoutAdjacencyLink,
  b: LayoutAdjacencyLink,
): number {
  const aAux = isAuxiliarySankeyNodeId(a.source.id);
  const bAux = isAuxiliarySankeyNodeId(b.source.id);
  if (aAux !== bAux) {
    return aAux ? 1 : -1;
  }
  return compareNodeY0(a.source, b.source) || (a.index ?? 0) - (b.index ?? 0);
}

function compareLinksByTargetY0(
  a: LayoutAdjacencyLink,
  b: LayoutAdjacencyLink,
): number {
  const aAux = isAuxiliarySankeyNodeId(a.target.id);
  const bAux = isAuxiliarySankeyNodeId(b.target.id);
  if (aAux !== bAux) {
    return aAux ? 1 : -1;
  }
  return compareNodeY0(a.target, b.target) || (a.index ?? 0) - (b.index ?? 0);
}

/** Reorders per-node link arrays so flow bands follow vertical node order (d3-sankey update input). */
export function reorderLayoutLinks(layout: {
  nodes: Array<{
    id: string;
    y0?: number;
    sourceLinks?: LayoutAdjacencyLink[];
    targetLinks?: LayoutAdjacencyLink[];
  }>;
}): void {
  for (const node of layout.nodes) {
    if (node.sourceLinks?.length) {
      node.sourceLinks.sort(compareLinksByTargetY0);
    }
    if (node.targetLinks?.length) {
      node.targetLinks.sort(compareLinksBySourceY0);
    }
  }
}
