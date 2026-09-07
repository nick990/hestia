import type { SaldiActivityItem } from "@/lib/saldi/types";

export const ACTIVITY_PAGE_SIZE = 20;

export function isSplitVisibleInActivity(
  payerUserId: string,
  shareUserIds: string[],
  currentUserId: string,
): boolean {
  const involved = new Set([payerUserId, ...shareUserIds]);

  if (involved.size < 2) {
    return false;
  }

  return involved.has(currentUserId);
}

export function isReimbursementVisibleInActivity(
  fromUserId: string,
  toUserId: string,
  currentUserId: string,
): boolean {
  return fromUserId === currentUserId || toUserId === currentUserId;
}

export function activitySortFields(
  item: SaldiActivityItem,
): { occurredOn: string; createdAt: string; id: string } {
  if (item.kind === "split") {
    return {
      occurredOn: item.movement.occurred_on,
      createdAt: item.createdAt,
      id: item.movement.id,
    };
  }

  return {
    occurredOn: item.occurredOn,
    createdAt: item.createdAt,
    id: item.id,
  };
}

export function compareSaldiActivityDesc(
  a: SaldiActivityItem,
  b: SaldiActivityItem,
): number {
  const left = activitySortFields(a);
  const right = activitySortFields(b);

  if (left.occurredOn !== right.occurredOn) {
    return left.occurredOn < right.occurredOn ? 1 : -1;
  }

  if (left.createdAt !== right.createdAt) {
    return left.createdAt < right.createdAt ? 1 : -1;
  }

  if (left.id !== right.id) {
    return left.id < right.id ? 1 : -1;
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
