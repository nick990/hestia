export function buildCashflowHref(input: { from: string; to: string }): string {
  const params = new URLSearchParams({ from: input.from, to: input.to });
  return `/cashflow?${params.toString()}`;
}

export function buildCashflowAdvancedHref(input: {
  from: string;
  to: string;
  year: number;
}): string {
  const params = new URLSearchParams({
    from: input.from,
    to: input.to,
    year: String(input.year),
  });
  return `/cashflow/avanzato?${params.toString()}`;
}
