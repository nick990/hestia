export type HomeTab = "cashflow" | "notes";

export function parseHomeTab(value: string | undefined | null): HomeTab {
  return value === "notes" ? "notes" : "cashflow";
}

export function buildHomeHref(input: {
  tab?: HomeTab;
  from?: string;
  to?: string;
}): string {
  const params = new URLSearchParams();

  if (input.tab === "notes") {
    params.set("tab", "notes");
  }

  if (input.from) {
    params.set("from", input.from);
  }

  if (input.to) {
    params.set("to", input.to);
  }

  const query = params.toString();
  return query === "" ? "/" : `/?${query}`;
}
