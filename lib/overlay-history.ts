export const OVERLAY_HISTORY_KEY = "__hestiaOverlay";

export function overlayIdFromState(state: unknown): string | null {
  if (!state || typeof state !== "object") {
    return null;
  }

  const id = (state as Record<string, unknown>)[OVERLAY_HISTORY_KEY];
  return typeof id === "string" ? id : null;
}

export function nextOverlayHistoryState(
  current: unknown,
  overlayId: string,
): Record<string, unknown> {
  const base =
    current && typeof current === "object" && !Array.isArray(current)
      ? { ...(current as Record<string, unknown>) }
      : {};

  return { ...base, [OVERLAY_HISTORY_KEY]: overlayId };
}

export function shouldCloseOverlayOnPop(
  pushed: boolean,
  overlayId: string,
  nextState: unknown,
): boolean {
  return pushed && overlayIdFromState(nextState) !== overlayId;
}

export function shouldPopHistoryOnUiClose(
  pushed: boolean,
  overlayId: string,
  currentState: unknown,
): boolean {
  return pushed && overlayIdFromState(currentState) === overlayId;
}

export function pushOverlayHistory(overlayId: string): void {
  window.history.pushState(
    nextOverlayHistoryState(window.history.state, overlayId),
    "",
    window.location.href,
  );
}
