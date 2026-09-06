import type { MovementType } from "@/lib/cashflow/types";

const MINUS = "−";

function formatDecimalIt(amount: number, fractionDigits: number): string {
  const [integerPart, fractionalPart = ""] = Math.abs(amount)
    .toFixed(fractionDigits)
    .split(".");
  const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return fractionDigits > 0
    ? `${groupedInteger},${fractionalPart}`
    : groupedInteger;
}

export function formatEuro(amount: number): string {
  const sign = amount < 0 ? MINUS : "";
  return `${sign}${formatDecimalIt(amount, 2)} €`;
}

export function movementTypeLabel(type: MovementType): string {
  return type === "income" ? "Entrata" : "Uscita";
}

export function formatOccurredOn(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

export function formatSignedAmount(type: MovementType, amount: number): string {
  const formatted = formatEuro(amount);
  return type === "income" ? `+${formatted}` : `${MINUS}${formatDecimalIt(amount, 2)} €`;
}

export function formatPayerLine(name: string | null | undefined): string | null {
  const trimmed = name?.trim();

  if (!trimmed) {
    return null;
  }

  return `Pagato da ${trimmed}`;
}
