export type CashflowView = "all" | "private" | "family";

const VALID_VIEWS: CashflowView[] = ["all", "private", "family"];

export function parseCashflowViewParam(value: string | undefined): CashflowView {
  if (value && VALID_VIEWS.includes(value as CashflowView)) {
    return value as CashflowView;
  }
  return "all";
}

export function buildCashflowViewSearchParams(
  params: URLSearchParams,
  view: CashflowView,
): URLSearchParams {
  const next = new URLSearchParams(params);
  if (view === "all") {
    next.delete("view");
  } else {
    next.set("view", view);
  }
  return next;
}
