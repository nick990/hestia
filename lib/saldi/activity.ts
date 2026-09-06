import type { SaldiActivityItem } from "@/lib/saldi/types";

export const ACTIVITY_PAGE_SIZE = 20;

export function compareSaldiActivityDesc(
  a: Pick<SaldiActivityItem, "occurredOn" | "createdAt" | "id">,
  b: Pick<SaldiActivityItem, "occurredOn" | "createdAt" | "id">,
): number {
  if (a.occurredOn !== b.occurredOn) {
    return a.occurredOn < b.occurredOn ? 1 : -1;
  }

  if (a.createdAt !== b.createdAt) {
    return a.createdAt < b.createdAt ? 1 : -1;
  }

  if (a.id !== b.id) {
    return a.id < b.id ? 1 : -1;
  }

  return 0;
}

export function mergeSaldiActivity(
  splits: SaldiActivityItem[],
  reimbursements: SaldiActivityItem[],
  offset: number,
  limit: number = ACTIVITY_PAGE_SIZE,
): { items: SaldiActivityItem[]; hasMore: boolean } {
  const merged = [...splits, ...reimbursements].sort(compareSaldiActivityDesc);
  const end = offset + limit;

  return {
    items: merged.slice(offset, end),
    hasMore: merged.length > end,
  };
}
