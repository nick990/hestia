const TIMEZONE = "Europe/Rome";

const MONTH_NAMES_IT = [
  "Gennaio",
  "Febbraio",
  "Marzo",
  "Aprile",
  "Maggio",
  "Giugno",
  "Luglio",
  "Agosto",
  "Settembre",
  "Ottobre",
  "Novembre",
  "Dicembre",
] as const;

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

export function formatMonthYearLabel(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split("-");
  const monthIndex = Number(monthStr) - 1;

  if (monthIndex < 0 || monthIndex >= MONTH_NAMES_IT.length) {
    return monthKey;
  }

  return `${MONTH_NAMES_IT[monthIndex]} ${yearStr}`;
}

export function shiftMonthKey(monthKey: string, delta: number): string {
  const [yearStr, monthStr] = monthKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const date = new Date(year, month - 1 + delta, 1);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
