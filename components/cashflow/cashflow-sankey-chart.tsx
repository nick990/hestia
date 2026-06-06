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
import { cn } from "@/lib/utils";

type LayoutNode = SankeyNode<SankeyGraphNode, SankeyGraphLink> & SankeyGraphNode;
type LayoutLink = SankeyLink<SankeyGraphNode, SankeyGraphLink> & SankeyGraphLink;

type CashflowSankeyChartProps = {
  graph: CashflowSankeyGraph;
  className?: string;
};

const NODE_WIDTH = 16;
const CENTER_NODE_WIDTH = 28;
const CHART_EXTENT: [[number, number], [number, number]] = [
  [8, 8],
  [920, 480],
];
const SVG_VIEW_WIDTH = 960;
const SVG_VIEW_HEIGHT = 500;

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
  const expenseDepth = hasExpense ? rawExpenseDepth : Math.max(1, rawExpenseDepth);

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
    (node) =>
      node.kind === "income" || node.kind === "uncategorized-income",
  );
  const incomeDepth = hasIncome ? rawIncomeDepth : Math.max(1, rawIncomeDepth);

  const centerColumn = incomeDepth;
  const totalColumns = expenseDepth + incomeDepth + 1;

  return { centerColumn, totalColumns };
}

function resolveColumn(
  node: SankeyGraphNode,
  centerColumn: number,
): number {
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
) {
  const { centerColumn, totalColumns } = getColumnLayout(graph);
  const [[x0], [x1]] = CHART_EXTENT;
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

export function CashflowSankeyChart({ graph, className }: CashflowSankeyChartProps) {
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

    const layoutGenerator = d3Sankey<SankeyGraphNode, SankeyGraphLink>()
      .nodeId((node) => node.id)
      .nodeWidth(NODE_WIDTH)
      .nodePadding(12)
      .extent(CHART_EXTENT);

    const result = layoutGenerator(data);
    applyColumnLayout(result, graph, layoutGenerator);
    return result;
  }, [graph]);

  if (!layout || layout.links.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nessun dato da visualizzare.</p>
    );
  }

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
          <span className="size-2 rounded-sm bg-foreground" />
          Totale periodo
        </span>
      </div>

      {hovered ? (
        <p className="text-sm">
          <span className="font-medium">{hovered.label}</span>{" "}
          <span className="text-muted-foreground">{hovered.detail}</span>
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-md border bg-card">
        <svg
          viewBox={`0 0 ${SVG_VIEW_WIDTH} ${SVG_VIEW_HEIGHT}`}
          className="min-h-[calc(100dvh-12rem)] w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {layout.links.map((link, index) => {
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

          {layout.nodes.map((node) => {
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
                  strokeWidth={isCenter ? 1.5 : 0}
                  rx={2}
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
                      "text-[11px]",
                      isCenter ? "fill-foreground font-medium" : "fill-foreground",
                    )}
                  >
                    <tspan x={labelX} dy="-0.35em">
                      {truncateSankeyLabel(n.label)}
                    </tspan>
                    <tspan
                      x={labelX}
                      dy="1.15em"
                      className="fill-muted-foreground text-[10px] font-normal"
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
