export const SANKEY_ZOOM_MIN = 0.3;
export const SANKEY_ZOOM_MAX = 4;
export const SANKEY_ZOOM_PADDING = 24;
export const SANKEY_ZOOM_IN_FACTOR = 1.3;
export const SANKEY_ZOOM_OUT_FACTOR = 1 / SANKEY_ZOOM_IN_FACTOR;

export type SankeyZoomTransform = {
  k: number;
  x: number;
  y: number;
};

export function computeFitTransform(
  viewportWidth: number,
  viewportHeight: number,
  contentWidth: number,
  contentHeight: number,
  padding = SANKEY_ZOOM_PADDING,
): SankeyZoomTransform {
  if (
    viewportWidth <= 0 ||
    viewportHeight <= 0 ||
    contentWidth <= 0 ||
    contentHeight <= 0
  ) {
    return { k: 1, x: 0, y: 0 };
  }

  const availableWidth = Math.max(0, viewportWidth - padding * 2);
  const availableHeight = Math.max(0, viewportHeight - padding * 2);

  let k = Math.min(
    availableWidth / contentWidth,
    availableHeight / contentHeight,
  );

  if (k > 1) {
    k = 1;
  }

  k = Math.max(k, SANKEY_ZOOM_MIN);

  const x = (viewportWidth - contentWidth * k) / 2;
  const y = (viewportHeight - contentHeight * k) / 2;

  return { k, x, y };
}
