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

export function shouldSkipHistoryPopForHref(
  href: string,
  currentPathname: string,
  currentSearch = "",
): boolean {
  const next = new URL(href, "http://hestia.local");
  const current = new URL(
    `${currentPathname}${currentSearch}`,
    "http://hestia.local",
  );

  return next.pathname !== current.pathname || next.search !== current.search;
}

export function hrefFromClickTarget(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) {
    return null;
  }

  const link = target.closest("a[href]");
  return link?.getAttribute("href") ?? null;
}

export function pushOverlayHistory(overlayId: string): void {
  window.history.pushState(
    nextOverlayHistoryState(window.history.state, overlayId),
    "",
    window.location.href,
  );
}
