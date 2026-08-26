import type { Movement } from "@/lib/cashflow/types";

export function compareMovementsNewestFirst(a: Movement, b: Movement): number {
  if (a.occurred_on !== b.occurred_on) {
    return a.occurred_on < b.occurred_on ? 1 : -1;
  }

  if (a.created_at !== b.created_at) {
    return a.created_at < b.created_at ? 1 : -1;
  }

  return 0;
}

export function sortMovementsNewestFirst(movements: Movement[]): Movement[] {
  return [...movements].sort(compareMovementsNewestFirst);
}
