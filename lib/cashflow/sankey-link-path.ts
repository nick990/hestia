export type SankeyLinkPathMode = "curved" | "straight";

export const SANKEY_LINK_PATH_MODE_DEFAULT: SankeyLinkPathMode = "curved";

export const SANKEY_LINK_CURVE_BEND_DEFAULT = 50;
export const SANKEY_LINK_CURVE_BEND_MIN = 0;
export const SANKEY_LINK_CURVE_BEND_MAX = 100;
export const SANKEY_LINK_CURVE_BEND_STEP = 5;

export type SankeyLinkPathInput = {
  source: { x0?: number; x1?: number; y0?: number; y1?: number };
  target: { x0?: number; x1?: number; y0?: number; y1?: number };
  y0?: number;
  y1?: number;
  width?: number;
};

export function clampLinkCurveBend(value: number): number {
  return Math.max(
    SANKEY_LINK_CURVE_BEND_MIN,
    Math.min(SANKEY_LINK_CURVE_BEND_MAX, value),
  );
}

export function linkCurveBendToFraction(bend: number): number {
  return clampLinkCurveBend(bend) / 100;
}

/** Bézier orizzontale con punto di flesso a `bend` (0–1) sull'asse X. */
export function curvedLinkPath(
  link: SankeyLinkPathInput,
  bend = 0.5,
): string {
  const x0 = link.source.x1 ?? 0;
  const x1 = link.target.x0 ?? 0;
  const y0 = link.y0 ?? 0;
  const y1 = link.y1 ?? 0;
  const t = Math.max(0, Math.min(1, bend));
  const xc = x0 + (x1 - x0) * t;
  return `M${x0},${y0}C${xc},${y0},${xc},${y1},${x1},${y1}`;
}

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
  curveBend = SANKEY_LINK_CURVE_BEND_DEFAULT,
): (link: SankeyLinkPathInput) => string | null {
  if (mode === "straight") {
    return straightRibbonPath;
  }

  const fraction = linkCurveBendToFraction(curveBend);
  return (link) => curvedLinkPath(link, fraction);
}

export function isStraightRibbonMode(mode: SankeyLinkPathMode): boolean {
  return mode === "straight";
}
