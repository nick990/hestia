import { linkHorizontal } from "d3-shape";

export type SankeyLinkPathMode = "curved" | "straight";

export const SANKEY_LINK_PATH_MODE_DEFAULT: SankeyLinkPathMode = "curved";

export type SankeyLinkPathInput = {
  source: { x0?: number; x1?: number; y0?: number; y1?: number };
  target: { x0?: number; x1?: number; y0?: number; y1?: number };
  y0?: number;
  y1?: number;
  width?: number;
};

const curvedLink = linkHorizontal<
  SankeyLinkPathInput,
  SankeyLinkPathInput
>()
  .source((d) => [d.source.x1 ?? 0, d.y0 ?? 0])
  .target((d) => [d.target.x0 ?? 0, d.y1 ?? 0]);

/** Nastro trapezoidale flush sulle facce dei nodi (bordi dritti). */
export function straightRibbonPath(link: SankeyLinkPathInput): string {
  const x0 = link.source.x1 ?? 0;
  const x1 = link.target.x0 ?? 0;
  const y0 = link.y0 ?? 0;
  const y1 = link.y1 ?? 0;
  const half = Math.max(1, link.width ?? 1) / 2;

  return [
    `M${x0},${y0 - half}`,
    `L${x1},${y1 - half}`,
    `L${x1},${y1 + half}`,
    `L${x0},${y0 + half}`,
    "Z",
  ].join("");
}

export function createSankeyLinkPath(
  mode: SankeyLinkPathMode,
): (link: SankeyLinkPathInput) => string | null {
  if (mode === "straight") {
    return straightRibbonPath;
  }
  return (link) => curvedLink(link);
}

export function isStraightRibbonMode(mode: SankeyLinkPathMode): boolean {
  return mode === "straight";
}
