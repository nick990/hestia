"use client";

import {
  sankey as d3Sankey,
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
  alignSankeyLinks,
  applyGroupedNodeOrder,
  enforceMinColumnGap,
  expandColumnGaps,
  finalizeLinkAlignment,
  reorderLayoutLinks,
  snapMisalignedLinks,
} from "@/lib/cashflow/sankey-layout";
import {
  computeLayoutInnerHeight,
  SANKEY_COLUMN_GAP_X_DEFAULT,
  SANKEY_COLUMN_GAP_Y_DEFAULT,
  SANKEY_LINK_PADDING,
} from "@/lib/cashflow/sankey-layout-config";
import { SankeyLayoutControls } from "@/components/cashflow/sankey-layout-controls";
import {
  createSankeyLinkPath,
  isStraightRibbonMode,
  SANKEY_LINK_PATH_MODE_DEFAULT,
  type SankeyLinkPathMode,
} from "@/lib/cashflow/sankey-link-path";
import { SankeyZoomViewport } from "@/components/cashflow/sankey-zoom-viewport";
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
const CONTENT_WIDTH_MARGIN = 32;

function makeChartExtent(
  innerHeight: number,
): [[number, number], [number, number]] {
  return [
    [CHART_X0, CHART_MARGIN_TOP],
    [CHART_X1, CHART_MARGIN_TOP + innerHeight],
  ];
}

function initialInnerHeight(nodes: SankeyGraphNode[]): number {
  return computeLayoutInnerHeight(nodes, MIN_INNER_HEIGHT);
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
  columnGapX: number,
): number {
  const { centerColumn, totalColumns } = getColumnLayout(graph);
  const [[x0], [x1]] = extent;
  const baseSpan = x1 - x0;
  const columnGaps = Math.max(0, totalColumns - 1);
  const span = baseSpan + columnGaps * columnGapX;
  const step = columnGaps > 0 ? span / columnGaps : 0;

  for (const node of layout.nodes) {
    const data = node as SankeyGraphNode;
    const column = resolveColumn(data, centerColumn);
    const width = data.kind === "center" ? CENTER_NODE_WIDTH : NODE_WIDTH;
    const slotX = x0 + column * step - width / 2;
    node.x0 = Math.max(x0, slotX);
    node.x1 = node.x0 + width;
  }

  layoutGenerator.update(layout);

  return Math.max(
    x1,
    ...layout.nodes.map((node) => node.x1 ?? 0),
  );
}

function getLinkMidpoint(link: LayoutLink): { x: number; y: number } {
  const source = link.source as LayoutNode;
  const target = link.target as LayoutNode;
  return {
    x: ((source.x1 ?? 0) + (target.x0 ?? 0)) / 2,
    y: ((link.y0 ?? 0) + (link.y1 ?? 0)) / 2,
  };
}

function SankeyFlowLink({
  layoutLink,
  path,
  sourceKind,
  filled,
  isHovered,
  onHoverStart,
  onHoverEnd,
}: {
  layoutLink: LayoutLink;
  path: string;
  sourceKind: SankeyNodeKind;
  filled: boolean;
  isHovered: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}) {
  const width = Math.max(1, layoutLink.width ?? 1);
  const stroke = nodeFill(sourceKind);
  const midpoint = getLinkMidpoint(layoutLink);
  const hitWidth = Math.max(width + 10, 14);
  const opacity = isHovered ? 0.7 : 0.35;

  return (
    <g
      className="cursor-pointer"
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
    >
      {filled ? (
        <>
          <path
            d={path}
            fill={stroke}
            fillOpacity={opacity}
            stroke="none"
            pointerEvents="none"
          />
          <path
            d={path}
            fill="transparent"
            stroke="none"
            pointerEvents="fill"
          />
        </>
      ) : (
        <>
          <path
            d={path}
            fill="none"
            stroke={stroke}
            strokeOpacity={opacity}
            strokeWidth={width}
            pointerEvents="none"
          />
          <path
            d={path}
            fill="none"
            stroke="transparent"
            strokeWidth={hitWidth}
            pointerEvents="stroke"
          />
        </>
      )}
      {isHovered ? (
        <text
          x={midpoint.x}
          y={midpoint.y}
          dy="0.35em"
          textAnchor="middle"
          pointerEvents="none"
          className="fill-foreground text-[10px] font-semibold"
          paintOrder="stroke"
          stroke="var(--card, #fff)"
          strokeWidth={3}
        >
          {formatEuro(layoutLink.value)}
        </text>
      ) : null}
    </g>
  );
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
  const [columnGapY, setColumnGapY] = useState(SANKEY_COLUMN_GAP_Y_DEFAULT);
  const [columnGapX, setColumnGapX] = useState(SANKEY_COLUMN_GAP_X_DEFAULT);
  const [linkPathMode, setLinkPathMode] = useState<SankeyLinkPathMode>(
    SANKEY_LINK_PATH_MODE_DEFAULT,
  );
  const [hoveredLinkIndex, setHoveredLinkIndex] = useState<number | null>(
    null,
  );

  const linkPath = useMemo(
    () => createSankeyLinkPath(linkPathMode),
    [linkPathMode],
  );

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
      .nodePadding(SANKEY_LINK_PADDING)
      .extent(extent);

    const result = layoutGenerator({
      nodes: data.nodes.map((node) => ({ ...node })),
      links: data.links.map((link) => ({ ...link })),
    });
    const maxNodeX1 = applyColumnLayout(
      result,
      graph,
      layoutGenerator,
      extent,
      columnGapX,
    );
    applyGroupedNodeOrder(result, links, {
      marginTop: CHART_MARGIN_TOP,
      nodePadding: 0,
    });
    reorderLayoutLinks(
      result as unknown as Parameters<typeof reorderLayoutLinks>[0],
    );
    layoutGenerator.update(result);

    alignSankeyLinks(
      result as unknown as Parameters<typeof alignSankeyLinks>[0],
      {
        nodePadding: SANKEY_LINK_PADDING,
        iterations: 6,
      },
    );
    reorderLayoutLinks(
      result as unknown as Parameters<typeof reorderLayoutLinks>[0],
    );
    layoutGenerator.update(result);
    snapMisalignedLinks(
      result as unknown as Parameters<typeof snapMisalignedLinks>[0],
      { nodePadding: SANKEY_LINK_PADDING },
    );
    reorderLayoutLinks(
      result as unknown as Parameters<typeof reorderLayoutLinks>[0],
    );
    layoutGenerator.update(result);
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

    const chartY1 =
      Math.max(...result.nodes.map((n) => n.y1 ?? 0)) + CHART_MARGIN_TOP;
    const contentWidth = Math.max(
      SVG_VIEW_WIDTH,
      Math.ceil(maxNodeX1) + CONTENT_WIDTH_MARGIN,
    );

    return {
      graph: result,
      viewHeight: chartY1 + CHART_MARGIN_BOTTOM,
      contentWidth,
    };
  }, [graph, columnGapY, columnGapX]);

  const dataKey = useMemo(
    () =>
      graph.nodes
        .filter((node) => !isAuxiliarySankeyNodeId(node.id))
        .map((node) => `${node.id}:${node.value}`)
        .join("|"),
    [graph],
  );

  const contentKey = useMemo(
    () => [dataKey, `v${columnGapY}`, `h${columnGapX}`].join("|"),
    [dataKey, columnGapY, columnGapX],
  );

  if (!layout || layout.graph.links.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nessun dato da visualizzare.
      </p>
    );
  }

  const { graph: sankeyLayout, viewHeight, contentWidth } = layout;

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <SankeyZoomViewport
        contentWidth={contentWidth}
        contentHeight={viewHeight}
        contentKey={contentKey}
        fitKey={dataKey}
        toolbarExtra={
          <SankeyLayoutControls
            columnGapY={columnGapY}
            columnGapX={columnGapX}
            linkPathMode={linkPathMode}
            onColumnGapYChange={setColumnGapY}
            onColumnGapXChange={setColumnGapX}
            onLinkPathModeChange={setLinkPathMode}
          />
        }
      >
          {sankeyLayout.links.map((link, index) => {
            const layoutLink = link as LayoutLink;
            if (isAuxiliaryLink(layoutLink)) {
              return null;
            }
            const path = linkPath(
              layoutLink as unknown as Parameters<typeof linkPath>[0],
            );
            if (!path) {
              return null;
            }
            const sourceNode = layoutLink.source as LayoutNode;
            const sourceKind =
              typeof sourceNode === "object" && sourceNode !== null
                ? sourceNode.kind
                : "center";

            return (
              <SankeyFlowLink
                key={`link-${index}`}
                layoutLink={layoutLink}
                path={path}
                sourceKind={sourceKind}
                filled={isStraightRibbonMode(linkPathMode)}
                isHovered={hoveredLinkIndex === index}
                onHoverStart={() => setHoveredLinkIndex(index)}
                onHoverEnd={() =>
                  setHoveredLinkIndex((current) =>
                    current === index ? null : current,
                  )
                }
              />
            );
          })}

          {sankeyLayout.nodes.map((node) => {
            const n = node as LayoutNode;
            if (isAuxiliarySankeyNodeId(n.id)) {
              return null;
            }
            const isCenter = n.kind === "center";
            const labelX = isCenter
              ? ((n.x0 ?? 0) + (n.x1 ?? 0)) / 2
              : (n.x0 ?? 0) < contentWidth / 2
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
                />
                {n.label ? (
                  <text
                    x={labelX}
                    y={((n.y0 ?? 0) + (n.y1 ?? 0)) / 2}
                    textAnchor={
                      isCenter
                        ? "middle"
                        : (n.x0 ?? 0) < contentWidth / 2
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
      </SankeyZoomViewport>
    </div>
  );
}
