import { getCurrentMonthKey, monthDateBounds, shiftMonthKey } from "@/lib/cashflow/month";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type DateRange = { from: string; to: string };

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) {
    return false;
  }
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return (
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  );
}

export function getCurrentMonthBounds(): DateRange {
  const monthKey = getCurrentMonthKey();
  const { start, end } = monthDateBounds(monthKey);
  return { from: start, to: end };
}

export function getCurrentYear(): number {
  return Number(getCurrentMonthKey().slice(0, 4));
}

export function parseDateRangeParams(
  fromParam: string | undefined,
  toParam: string | undefined,
): DateRange {
  const fallback = getCurrentMonthBounds();

  if (!fromParam || !toParam) {
    return fallback;
  }

  if (!isValidIsoDate(fromParam) || !isValidIsoDate(toParam)) {
    return fallback;
  }

  if (fromParam > toParam) {
    return { from: toParam, to: fromParam };
  }

  return { from: fromParam, to: toParam };
}

export function parseYearParam(value: string | undefined): number {
  if (!value || !/^\d{4}$/.test(value)) {
    return getCurrentYear();
  }

  const year = Number(value);
  if (year < 1970 || year > 2100) {
    return getCurrentYear();
  }

  return year;
}

export function monthBoundsForYearMonth(year: number, month: number): DateRange {
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  const { start, end } = monthDateBounds(monthKey);
  return { from: start, to: end };
}

export function shiftMonthRange(from: string, delta: number): DateRange {
  const monthKey = from.slice(0, 7);
  const nextKey = shiftMonthKey(monthKey, delta);
  const { start, end } = monthDateBounds(nextKey);
  return { from: start, to: end };
}

export function isFullMonthRange(
  from: string,
  to: string,
  year: number,
  month: number,
): boolean {
  const bounds = monthBoundsForYearMonth(year, month);
  return from === bounds.from && to === bounds.to;
}

export function buildCashflowSearchParams(params: {
  from: string;
  to: string;
  year: number;
}): string {
  return new URLSearchParams({
    from: params.from,
    to: params.to,
    year: String(params.year),
  }).toString();
}

export const MONTH_ABBR_IT = [
  "Gen",
  "Feb",
  "Mar",
  "Apr",
  "Mag",
  "Giu",
  "Lug",
  "Ago",
  "Set",
  "Ott",
  "Nov",
  "Dic",
] as const;
