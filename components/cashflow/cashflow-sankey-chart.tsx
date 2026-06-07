"use client";

import {
  sankey as d3Sankey,
  sankeyLinkHorizontal,
  type SankeyGraph as D3LayoutGraph,
  type SankeyLayout,
  type SankeyLink,
  type SankeyNode,
} from "d3-sankey";
import { useMemo, useState } from "react";
import { formatEuro } from "@/lib/cashflow/format";
import {
  augmentSankeyGraphForLayout,
  isAuxiliarySankeyNodeId,
  truncateSankeyLabel,
  type CashflowSankeyGraph,
  type SankeyGraphLink,
  type SankeyGraphNode,
  type SankeyNodeKind,
} from "@/lib/cashflow/sankey";
import {
  applyGroupedNodeOrder,
  reorderLayoutLinks,
} from "@/lib/cashflow/sankey-layout";
import { cn } from "@/lib/utils";

type LayoutNode = SankeyNode<SankeyGraphNode, SankeyGraphLink> &
  SankeyGraphNode;
type LayoutLink = SankeyLink<SankeyGraphNode, SankeyGraphLink> &
  SankeyGraphLink;

type CashflowSankeyChartProps = {
  graph: CashflowSankeyGraph;
  className?: string;
};

const NODE_WIDTH = 16;
const CENTER_NODE_WIDTH = 90;
const CHART_X0 = 8;
const CHART_X1 = 920;
const CHART_MARGIN_TOP = 8;
const CHART_MARGIN_BOTTOM = 12;
const MIN_INNER_HEIGHT = 472;
const SVG_VIEW_WIDTH = 960;
const NODE_PADDING = 12;

function makeChartExtent(
  innerHeight: number,
): [[number, number], [number, number]] {
  return [
    [CHART_X0, CHART_MARGIN_TOP],
    [CHART_X1, CHART_MARGIN_TOP + innerHeight],
  ];
}

function countMaxNodesPerLevel(nodes: SankeyGraphNode[]): number {
  const counts = new Map<number, number>();
  for (const node of nodes) {
    if (isAuxiliarySankeyNodeId(node.id)) {
      continue;
    }
    counts.set(node.level, (counts.get(node.level) ?? 0) + 1);
  }
  return Math.max(1, ...counts.values());
}

function initialInnerHeight(nodes: SankeyGraphNode[]): number {
  const maxInColumn = countMaxNodesPerLevel(nodes);
  return Math.max(MIN_INNER_HEIGHT, maxInColumn * 56);
}

function resolveSameLevelOverlaps(
  layout: D3LayoutGraph<SankeyGraphNode, SankeyGraphLink>,
  minGap = NODE_PADDING,
): number {
  const byLevel = new Map<number, LayoutNode[]>();
  for (const node of layout.nodes as LayoutNode[]) {
    if (isAuxiliarySankeyNodeId(node.id)) {
      continue;
    }
    const group = byLevel.get(node.level) ?? [];
    group.push(node);
    byLevel.set(node.level, group);
  }

  let maxY = CHART_MARGIN_TOP;
  for (const levelNodes of byLevel.values()) {
    const sorted = [...levelNodes].sort((a, b) => (a.y0 ?? 0) - (b.y0 ?? 0));
    let nextY0 = sorted[0]?.y0 ?? CHART_MARGIN_TOP;
    for (const node of sorted) {
      const height = Math.max(1, (node.y1 ?? 0) - (node.y0 ?? 0));
      let y0 = node.y0 ?? 0;
      if (y0 < nextY0) {
        y0 = nextY0;
      }
      node.y0 = y0;
      node.y1 = y0 + height;
      nextY0 = node.y1 + minGap;
      maxY = Math.max(maxY, node.y1);
    }
  }
  return maxY;
}

function getColumnLayout(graph: CashflowSankeyGraph) {
  const rawExpenseDepth = Math.max(
    0,
    ...graph.nodes
      .filter(
        (node) =>
          node.kind === "expense" ||
          node.kind === "uncategorized-expense" ||
          node.kind === "surplus",
      )
      .map((node) => Math.abs(node.level)),
  );
  const hasExpense = graph.nodes.some(
    (node) =>
      node.kind === "expense" ||
      node.kind === "uncategorized-expense" ||
      node.kind === "surplus",
  );
  const expenseDepth = hasExpense
    ? rawExpenseDepth
    : Math.max(1, rawExpenseDepth);

  const rawIncomeDepth = Math.max(
    0,
    ...graph.nodes
      .filter(
        (node) =>
          node.kind === "income" || node.kind === "uncategorized-income",
      )
      .map((node) => node.level),
  );
  const hasIncome = graph.nodes.some(
    (node) => node.kind === "income" || node.kind === "uncategorized-income",
  );
  const incomeDepth = hasIncome ? rawIncomeDepth : Math.max(1, rawIncomeDepth);

  const centerColumn = incomeDepth;
  const totalColumns = expenseDepth + incomeDepth + 1;

  return { centerColumn, totalColumns };
}

function resolveColumn(node: SankeyGraphNode, centerColumn: number): number {
  if (node.kind === "center") {
    return centerColumn;
  }
  if (
    node.kind === "expense" ||
    node.kind === "uncategorized-expense" ||
    node.kind === "surplus" ||
    node.kind === "income" ||
    node.kind === "uncategorized-income"
  ) {
    return centerColumn - node.level;
  }
  return centerColumn;
}

function applyColumnLayout(
  layout: D3LayoutGraph<SankeyGraphNode, SankeyGraphLink>,
  graph: CashflowSankeyGraph,
  layoutGenerator: SankeyLayout<
    D3LayoutGraph<SankeyGraphNode, SankeyGraphLink>,
    SankeyGraphNode,
    SankeyGraphLink
  >,
  extent: [[number, number], [number, number]],
) {
  const { centerColumn, totalColumns } = getColumnLayout(graph);
  const [[x0], [x1]] = extent;
  const span = x1 - x0;
  const step = totalColumns > 1 ? span / (totalColumns - 1) : 0;

  for (const node of layout.nodes) {
    const data = node as SankeyGraphNode;
    const column = resolveColumn(data, centerColumn);
    const width = data.kind === "center" ? CENTER_NODE_WIDTH : NODE_WIDTH;
    const slotX = x0 + column * step - width / 2;
    node.x0 = Math.max(x0, Math.min(slotX, x1 - width));
    node.x1 = node.x0 + width;
  }

  layoutGenerator.update(layout);
}

function getLinkMidpoint(link: LayoutLink): { x: number; y: number } {
  const source = link.source as LayoutNode;
  const target = link.target as LayoutNode;
  return {
    x: ((source.x1 ?? 0) + (target.x0 ?? 0)) / 2,
    y: ((link.y0 ?? 0) + (link.y1 ?? 0)) / 2,
  };
}

function isAuxiliaryLink(link: LayoutLink): boolean {
  const source = link.source as LayoutNode;
  const target = link.target as LayoutNode;
  if (
    (typeof source === "object" &&
      source !== null &&
      isAuxiliarySankeyNodeId(source.id)) ||
    (typeof target === "object" &&
      target !== null &&
      isAuxiliarySankeyNodeId(target.id))
  ) {
    return true;
  }
  return false;
}

function nodeFill(kind: SankeyNodeKind): string {
  switch (kind) {
    case "center":
      return "var(--foreground, hsl(0 0% 20%))";
    case "income":
    case "uncategorized-income":
      return "var(--chart-income, hsl(142 76% 36%))";
    case "expense":
    case "uncategorized-expense":
      return "var(--chart-expense, hsl(0 72% 51%))";
    case "surplus":
      return "var(--chart-surplus, hsl(142 40% 45%))";
    default:
      return "var(--muted-foreground)";
  }
}

export function CashflowSankeyChart({
  graph,
  className,
}: CashflowSankeyChartProps) {
  const [hovered, setHovered] = useState<{
    label: string;
    detail: string;
  } | null>(null);

  const layout = useMemo(() => {
    if (graph.nodes.length === 0) {
      return null;
    }

    const { nodes, links } = augmentSankeyGraphForLayout(graph);
    const nodeMap = new Map(nodes.map((node) => [node.id, { ...node }]));

    const data: D3LayoutGraph<SankeyGraphNode, SankeyGraphLink> = {
      nodes: Array.from(nodeMap.values()),
      links: links.map((link) => ({ ...link })),
    };

    const innerHeight = initialInnerHeight(nodes);
    const extent = makeChartExtent(innerHeight);

    const layoutGenerator = d3Sankey<SankeyGraphNode, SankeyGraphLink>()
      .nodeId((node) => node.id)
      .nodeWidth(NODE_WIDTH)
      .nodePadding(NODE_PADDING)
      .extent(extent);

    const result = layoutGenerator({
      nodes: data.nodes.map((node) => ({ ...node })),
      links: data.links.map((link) => ({ ...link })),
    });
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
    reorderLayoutLinks(
      result as unknown as Parameters<typeof reorderLayoutLinks>[0],
    );
    layoutGenerator.update(result);
    const chartY1 = maxY + CHART_MARGIN_TOP;

    return {
      graph: result,
      viewHeight: chartY1 + CHART_MARGIN_BOTTOM,
    };
  }, [graph]);

  if (!layout || layout.graph.links.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nessun dato da visualizzare.
      </p>
    );
  }

  const { graph: sankeyLayout, viewHeight } = layout;

  return (
    <div className={cn("space-y-3", className)}>
      {hovered ? (
        <p className="text-sm">
          <span className="font-medium">{hovered.label}</span>{" "}
          <span className="text-muted-foreground">{hovered.detail}</span>
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-md border bg-card">
        <svg
          viewBox={`0 0 ${SVG_VIEW_WIDTH} ${viewHeight}`}
          className="min-h-[calc(100dvh-12rem)] w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {sankeyLayout.links.map((link, index) => {
            const layoutLink = link as LayoutLink;
            if (isAuxiliaryLink(layoutLink)) {
              return null;
            }
            const path = sankeyLinkHorizontal()(layoutLink);
            if (!path) {
              return null;
            }
            const sourceNode = layoutLink.source as LayoutNode;
            const sourceKind =
              typeof sourceNode === "object" && sourceNode !== null
                ? sourceNode.kind
                : "center";
            const midpoint = getLinkMidpoint(layoutLink);

            return (
              <g key={`link-${index}`}>
                <path
                  d={path}
                  fill="none"
                  stroke={nodeFill(sourceKind)}
                  strokeOpacity={0.35}
                  strokeWidth={Math.max(1, layoutLink.width ?? 1)}
                />
                <text
                  x={midpoint.x}
                  y={midpoint.y}
                  dy="0.35em"
                  textAnchor="middle"
                  className="fill-foreground text-[10px] font-medium"
                  paintOrder="stroke"
                  stroke="var(--card, #fff)"
                  strokeWidth={3}
                >
                  {formatEuro(layoutLink.value)}
                </text>
              </g>
            );
          })}

          {sankeyLayout.nodes.map((node) => {
            const n = node as LayoutNode;
            if (isAuxiliarySankeyNodeId(n.id)) {
              return null;
            }
            const tooltipPath = n.fullPath ?? n.label;
            const isCenter = n.kind === "center";
            const labelX = isCenter
              ? ((n.x0 ?? 0) + (n.x1 ?? 0)) / 2
              : (n.x0 ?? 0) < SVG_VIEW_WIDTH / 2
                ? (n.x1 ?? 0) + 6
                : (n.x0 ?? 0) - 6;
            return (
              <g key={n.id}>
                <rect
                  x={n.x0 ?? 0}
                  y={n.y0 ?? 0}
                  width={Math.max(1, (n.x1 ?? 0) - (n.x0 ?? 0))}
                  height={Math.max(1, (n.y1 ?? 0) - (n.y0 ?? 0))}
                  fill={nodeFill(n.kind)}
                  stroke={isCenter ? "var(--border, hsl(0 0% 80%))" : undefined}
                  strokeWidth={isCenter ? 2 : 0}
                  rx={isCenter ? 4 : 2}
                  onMouseEnter={() =>
                    setHovered({
                      label: tooltipPath,
                      detail: formatEuro(n.value ?? 0),
                    })
                  }
                  onMouseLeave={() => setHovered(null)}
                />
                {n.label ? (
                  <text
                    x={labelX}
                    y={((n.y0 ?? 0) + (n.y1 ?? 0)) / 2}
                    textAnchor={
                      isCenter
                        ? "middle"
                        : (n.x0 ?? 0) < SVG_VIEW_WIDTH / 2
                          ? "start"
                          : "end"
                    }
                    className={cn(
                      isCenter
                        ? "fill-background text-[12px] font-semibold"
                        : "fill-foreground text-[11px]",
                    )}
                  >
                    <tspan x={labelX} dy={isCenter ? "-0.45em" : "-0.35em"}>
                      {truncateSankeyLabel(n.label)}
                    </tspan>
                    <tspan
                      x={labelX}
                      dy="1.2em"
                      className={
                        isCenter
                          ? "fill-background/90 text-[11px] font-medium"
                          : "fill-muted-foreground text-[10px] font-normal"
                      }
                    >
                      {formatEuro(n.value ?? 0)}
                    </tspan>
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
