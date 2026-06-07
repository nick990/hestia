import { linkHorizontal } from "d3-shape";

export type SankeyLinkPathMode = "curved" | "straight";

export const SANKEY_LINK_PATH_MODE_DEFAULT: SankeyLinkPathMode = "curved";

export type SankeyLinkPathInput = {
  source: { x0?: number; x1?: number; y0?: number; y1?: number };
  target: { x0?: number; x1?: number; y0?: number; y1?: number };
  y0?: number;
  y1?: number;
};

const curvedLink = linkHorizontal<
  SankeyLinkPathInput,
  SankeyLinkPathInput
>()
  .source((d) => [d.source.x1 ?? 0, d.y0 ?? 0])
  .target((d) => [d.target.x0 ?? 0, d.y1 ?? 0]);

function straightPath(link: SankeyLinkPathInput): string {
  const x0 = link.source.x1 ?? 0;
  const y0 = link.y0 ?? 0;
  const x1 = link.target.x0 ?? 0;
  const y1 = link.y1 ?? 0;
  return `M${x0},${y0}L${x1},${y1}`;
}

export function createSankeyLinkPath(
  mode: SankeyLinkPathMode,
): (link: SankeyLinkPathInput) => string | null {
  if (mode === "straight") {
    return straightPath;
  }
  return (link) => curvedLink(link);
}
