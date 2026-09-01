import type { Movement } from "@/lib/cashflow/types";

/** Spesa effettiva del ramo: uscite − entrate, minimo 0. */
export function computeBranchSpend(movements: Movement[]): number {
  let expenses = 0;
  let income = 0;

  for (const movement of movements) {
    if (movement.type === "expense") {
      expenses += movement.amount;
    } else {
      income += movement.amount;
    }
  }

  return Math.max(0, expenses - income);
}

export type BudgetStatus =
  | { kind: "within"; remaining: number }
  | { kind: "at_limit" }
  | { kind: "over"; overBy: number };

export function compareSpendToBudget(
  spent: number,
  budget: number,
): BudgetStatus {
  const remaining = budget - spent;

  if (remaining > 0) {
    return { kind: "within", remaining };
  }

  if (remaining === 0) {
    return { kind: "at_limit" };
  }

  return { kind: "over", overBy: Math.abs(remaining) };
}
