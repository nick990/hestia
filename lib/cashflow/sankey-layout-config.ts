/** Padding fisso tra fasce link (d3 + allineamento). Non esposto in UI. */
export const SANKEY_LINK_PADDING = 12;

/** Gap verticale extra tra nodi adiacenti in colonna (controllo UI **V**). */
export const SANKEY_COLUMN_GAP_Y_DEFAULT = 12;
export const SANKEY_COLUMN_GAP_Y_MIN = 12;
export const SANKEY_COLUMN_GAP_Y_STEP = 1;

/** Gap orizzontale extra tra colonne adiacenti (controllo UI **H**), in px. */
export const SANKEY_COLUMN_GAP_X_DEFAULT = 12;
export const SANKEY_COLUMN_GAP_X_MIN = 12;
export const SANKEY_COLUMN_GAP_X_STEP = 1;

export function clampColumnGapY(value: number): number {
  return Math.max(SANKEY_COLUMN_GAP_Y_MIN, value);
}

export function clampColumnGapX(value: number): number {
  return Math.max(SANKEY_COLUMN_GAP_X_MIN, value);
}

/** Altezza extent d3: proporzionale al flusso, indipendente da columnGapY. */
export function computeLayoutInnerHeight(
  nodes: Array<{ kind: string; value: number }>,
  minInnerHeight: number,
  pixelsPerValue = 0.1,
): number {
  const center = nodes.find((node) => node.kind === "center");
  const flow = center?.value ?? 1;
  return Math.max(minInnerHeight, flow * pixelsPerValue);
}
