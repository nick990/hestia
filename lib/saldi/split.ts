import type { MaterializedShare } from "@/lib/saldi/types";

export function splitEqual(
  total: number,
  participantUserIds: string[],
  payerUserId: string,
): MaterializedShare[] {
  if (participantUserIds.length === 0) {
    return [];
  }

  const cents = Math.round(total * 100);
  const n = participantUserIds.length;
  const base = Math.floor(cents / n);
  const remainder = cents - base * n;
  const remainderIndex = participantUserIds.includes(payerUserId)
    ? participantUserIds.indexOf(payerUserId)
    : 0;

  return participantUserIds.map((userId, index) => ({
    userId,
    amount: (base + (index === remainderIndex ? remainder : 0)) / 100,
  }));
}
