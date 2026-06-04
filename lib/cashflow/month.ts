const TIMEZONE = "Europe/Rome";

export function getCurrentMonthKey(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;

  if (!year || !month) {
    throw new Error("Impossibile determinare il mese corrente.");
  }

  return `${year}-${month}`;
}

export function parseMonthParam(value: string | undefined): string {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) {
    return getCurrentMonthKey();
  }

  const [, monthStr] = value.split("-");
  const month = Number(monthStr);

  if (month < 1 || month > 12) {
    return getCurrentMonthKey();
  }

  return value;
}

export function monthDateBounds(monthKey: string): { start: string; end: string } {
  const [yearStr, monthStr] = monthKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const lastDay = new Date(year, month, 0).getDate();
  const day = String(lastDay).padStart(2, "0");

  return {
    start: `${monthKey}-01`,
    end: `${monthKey}-${day}`,
  };
}

export function shiftMonthKey(monthKey: string, delta: number): string {
  const [yearStr, monthStr] = monthKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const date = new Date(year, month - 1 + delta, 1);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonthLabel(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split("-");
  const date = new Date(Number(yearStr), Number(monthStr) - 1, 1);

  return new Intl.DateTimeFormat("it-IT", {
    month: "long",
    year: "numeric",
  }).format(date);
}
