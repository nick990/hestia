import type { MovementType } from "@/lib/cashflow/types";

export function formatEuro(amount: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
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
  return type === "income" ? `+${formatted}` : `−${formatted}`;
}

export function formatCompactEuro(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "−" : "";

  if (abs >= 1000) {
    const compact = new Intl.NumberFormat("it-IT", {
      maximumFractionDigits: 1,
      notation: "compact",
    }).format(abs);
    return `${sign}${compact} €`;
  }

  return `${sign}${new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(abs)}`;
}
