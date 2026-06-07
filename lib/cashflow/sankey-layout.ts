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

  syncAuxiliaryNodePositions(layout.nodes);
}

type RelaxNode = LayoutNodeWithLinks & {
  x0?: number;
  sourceLinks: LayoutAdjacencyLink[];
  targetLinks: LayoutAdjacencyLink[];
};

export type AlignSankeyLinksOptions = {
  nodePadding: number;
  iterations?: number;
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

function shiftNodeY(node: RelaxNode, dy: number): void {
  if (Math.abs(dy) <= 1e-6) {
    return;
  }
  node.y0 = (node.y0 ?? 0) + dy;
  node.y1 = (node.y1 ?? 0) + dy;
}

function reorderNodeLinksForRelax(node: RelaxNode): void {
  for (const link of node.targetLinks) {
    const source = link.source as RelaxNode;
    source.sourceLinks?.sort(
      (a, b) => ((a.target as RelaxNode).y0 ?? 0) - ((b.target as RelaxNode).y0 ?? 0),
    );
  }
  for (const link of node.sourceLinks) {
    const target = link.target as RelaxNode;
    target.targetLinks?.sort(
      (a, b) => ((a.source as RelaxNode).y0 ?? 0) - ((b.source as RelaxNode).y0 ?? 0),
    );
  }
}

function columnSpan(source: RelaxNode, target: RelaxNode): number {
  return Math.max(1, Math.abs((target.x0 ?? 0) - (source.x0 ?? 0)));
}

function resolveColumnOverlaps(
  column: RelaxNode[],
  alpha: number,
  nodePadding: number,
): void {
  for (let i = 1; i < column.length; i++) {
    const previous = column[i - 1];
    const current = column[i];
    const minY0 = (previous.y1 ?? 0) + nodePadding;
    const y0 = current.y0 ?? 0;
    if (y0 < minY0) {
      shiftNodeY(current, (minY0 - y0) * alpha);
    }
  }
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
    .map(([, column]) =>
      column.sort((a, b) => (a.y0 ?? 0) - (b.y0 ?? 0)),
    );
}

function relaxNodesTowardLinks(
  nodes: RelaxNode[],
  alpha: number,
  nodePadding: number,
): void {
  for (const node of nodes) {
    let y = 0;
    let w = 0;
    for (const link of node.targetLinks) {
      const source = link.source as RelaxNode;
      const v = (link.value ?? 0) * columnSpan(source, node);
      y += computeSankeyTargetTop(source, node, nodePadding) * v;
      w += v;
    }
    if (w > 0) {
      shiftNodeY(node, (y / w - (node.y0 ?? 0)) * alpha);
      reorderNodeLinksForRelax(node);
    }
  }

  for (const node of nodes) {
    let y = 0;
    let w = 0;
    for (const link of node.sourceLinks) {
      const target = link.target as RelaxNode;
      const v = (link.value ?? 0) * columnSpan(node, target);
      y += computeSankeySourceTop(node, target, nodePadding) * v;
      w += v;
    }
    if (w > 0) {
      shiftNodeY(node, (y / w - (node.y0 ?? 0)) * alpha);
      reorderNodeLinksForRelax(node);
    }
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

/** Garantisce gap minimo tra nodi adiacenti in ogni colonna (x0). Ultimo passo Y prima del pin link. */
export function enforceMinColumnGap(
  layout: {
    nodes: Array<
      SankeyGraphNode & {
        x0?: number;
        y0?: number;
        y1?: number;
      }
    >;
  },
  minGap: number,
): void {
  const relaxNodes = layout.nodes.filter(
    (node) => !isAuxiliarySankeyNodeId(node.id),
  ) as RelaxNode[];

  for (const column of buildColumns(relaxNodes)) {
    for (let i = 1; i < column.length; i++) {
      const previous = column[i - 1];
      const current = column[i];
      const minY0 = (previous.y1 ?? 0) + minGap;
      const y0 = current.y0 ?? 0;
      if (y0 < minY0) {
        shiftNodeY(current, minY0 - y0);
      }
    }
  }

  syncAuxiliaryNodePositions(layout.nodes);
}

/** Aggiunge userGap px tra ogni coppia adiacente preservando gapLayout post-align. */
export function expandColumnGaps(
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
  userGap: number,
): void {
  if (userGap <= 0) {
    return;
  }

  const relaxNodes = layout.nodes.filter(
    (node) => !isAuxiliarySankeyNodeId(node.id),
  ) as RelaxNode[];

  for (const column of buildColumns(relaxNodes)) {
    const stackNodes = column.filter((node) => node.id !== SURPLUS_NODE_ID);
    if (stackNodes.length <= 1 && !column.some((n) => n.id === SURPLUS_NODE_ID)) {
      continue;
    }

    if (stackNodes.length > 1) {
      const snapshots = stackNodes.map((node) => ({
        y0: node.y0 ?? 0,
        y1: node.y1 ?? 0,
      }));

      for (let i = 1; i < stackNodes.length; i++) {
        const previous = stackNodes[i - 1];
        const current = stackNodes[i];
        const layoutGap = snapshots[i].y0 - snapshots[i - 1].y1;
        const targetY0 = (previous.y1 ?? 0) + layoutGap + userGap;
        shiftNodeY(current, targetY0 - (current.y0 ?? 0));
      }
    }

    const surplus = column.find((node) => node.id === SURPLUS_NODE_ID);
    if (surplus && stackNodes.length > 0) {
      const lastStack = stackNodes[stackNodes.length - 1];
      const minY0 = (lastStack.y1 ?? 0) + userGap;
      const link = surplus.targetLinks?.[0];
      const linkBandTop =
        link?.y0 != null && link.width != null
          ? link.y0 - link.width / 2
          : (surplus.y0 ?? 0);
      const targetY0 = Math.max(minY0, linkBandTop);
      shiftNodeY(surplus, targetY0 - (surplus.y0 ?? 0));
    }
  }

  applyLinkBreadths(layout);
  syncAuxiliaryNodePositions(layout.nodes);
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
    relaxNodesTowardLinks(relaxNodes, alpha, options.nodePadding);
    for (const column of buildColumns(relaxNodes)) {
      resolveColumnOverlaps(column, beta, options.nodePadding);
    }
  }

  syncAuxiliaryNodePositions(layout.nodes);
}

function linkConnectivity(node: RelaxNode): number {
  return (node.sourceLinks?.length ?? 0) + (node.targetLinks?.length ?? 0);
}

/** Ricalcola link.y0 / link.y1 impilando le fasce da node.y0 (come d3-sankey update). */
export function applyLinkBreadths(
  layout: {
    nodes: Array<{
      y0?: number;
      sourceLinks?: LayoutAdjacencyLink[];
      targetLinks?: LayoutAdjacencyLink[];
    }>;
  },
): void {
  for (const node of layout.nodes) {
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

/** Corregge link ancora disallineati spostando il nodo meno connesso (es. Avanzo). */
export function snapMisalignedLinks(
  layout: {
    nodes: Array<
      SankeyGraphNode & {
        sourceLinks?: LayoutAdjacencyLink[];
        targetLinks?: LayoutAdjacencyLink[];
      }
    >;
  },
  options: { nodePadding: number; threshold?: number; maxPasses?: number },
): void {
  const threshold = options.threshold ?? 1;
  const maxPasses = options.maxPasses ?? 12;
  const relaxNodes = layout.nodes.filter(
    (node) => !isAuxiliarySankeyNodeId(node.id),
  ) as RelaxNode[];

  for (let pass = 0; pass < maxPasses; pass++) {
    applyLinkBreadths(layout);
    let maxGap = 0;

    for (const node of relaxNodes) {
      for (const link of node.sourceLinks ?? []) {
        const source = link.source as RelaxNode;
        const target = link.target as RelaxNode;
        if (
          isAuxiliarySankeyNodeId(source.id) ||
          isAuxiliarySankeyNodeId(target.id)
        ) {
          continue;
        }

        const gap = (link.y0 ?? 0) - (link.y1 ?? 0);
        maxGap = Math.max(maxGap, Math.abs(gap));
        if (Math.abs(gap) <= threshold) {
          continue;
        }

        const moveTarget =
          linkConnectivity(target) <= linkConnectivity(source);
        shiftNodeY(moveTarget ? target : source, moveTarget ? gap : -gap);
      }
    }

    syncAuxiliaryNodePositions(layout.nodes);
    for (const column of buildColumns(relaxNodes)) {
      resolveColumnOverlaps(column, 1, options.nodePadding);
    }

    if (maxGap <= threshold) {
      break;
    }
  }

  applyLinkBreadths(layout);
  syncAuxiliaryNodePositions(layout.nodes);
}

/** Ultimo passo layout: pin nodi a link singolo + ricalcolo fasce (dopo reorder/update). */
export function finalizeLinkAlignment(
  layout: {
    nodes: Array<
      SankeyGraphNode & {
        y0?: number;
        sourceLinks?: LayoutAdjacencyLink[];
        targetLinks?: LayoutAdjacencyLink[];
      }
    >;
  },
): void {
  applyLinkBreadths(layout);
  pinSingleLinkNodes(layout);
  applyLinkBreadths(layout);
  syncAuxiliaryNodePositions(layout.nodes);
}

/** Allinea nodi con un solo link al centro della fascia del partner (es. Avanzo). */
function pinSingleLinkNodes(
  layout: {
    nodes: Array<
      SankeyGraphNode & {
        y0?: number;
        sourceLinks?: LayoutAdjacencyLink[];
        targetLinks?: LayoutAdjacencyLink[];
      }
    >;
  },
): void {
  for (const node of layout.nodes) {
    if (isAuxiliarySankeyNodeId(node.id)) {
      continue;
    }
    const relaxNode = node as RelaxNode;
    const degree = linkConnectivity(relaxNode);
    if (degree !== 1) {
      continue;
    }

    if (relaxNode.targetLinks?.length === 1) {
      const link = relaxNode.targetLinks[0];
      const bandTop = (link.y0 ?? 0) - (link.width ?? 0) / 2;
      shiftNodeY(relaxNode, bandTop - (relaxNode.y0 ?? 0));
      continue;
    }

    if (relaxNode.sourceLinks?.length === 1) {
      const link = relaxNode.sourceLinks[0];
      const bandTop = (link.y1 ?? 0) - (link.width ?? 0) / 2;
      shiftNodeY(relaxNode, bandTop - (relaxNode.y0 ?? 0));
    }
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
