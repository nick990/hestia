import { formatEuro } from "@/lib/cashflow/format";
import { ZERO_THRESHOLD } from "@/lib/saldi/balances";
import type { PersonNet, Transfer } from "@/lib/saldi/types";

export function transferLine(
  transfer: Transfer,
  currentUserId: string,
  nameById: Map<string, string>,
): string {
  if (transfer.fromUserId === currentUserId) {
    const name = nameById.get(transfer.toUserId) ?? "—";
    return `Devi pagare ${formatEuro(transfer.amount)} a ${name}`;
  }

  const name = nameById.get(transfer.fromUserId) ?? "—";
  return `${name} ti deve ${formatEuro(transfer.amount)}`;
}

export function sortPersonNets(
  people: PersonNet[],
  currentUserId: string,
): PersonNet[] {
  return people
    .filter(
      (person) =>
        person.isCurrentMember || Math.abs(person.net) >= ZERO_THRESHOLD,
    )
    .sort((a, b) => {
      if (a.userId === currentUserId) {
        return -1;
      }

      if (b.userId === currentUserId) {
        return 1;
      }

      if (a.isCurrentMember !== b.isCurrentMember) {
        return a.isCurrentMember ? -1 : 1;
      }

      return a.name.localeCompare(b.name, "it");
    });
}

export function defaultReimbursement(
  myDebitTransfers: Transfer[],
  currentUserId: string,
  currentMemberIdsByName: string[],
): { fromUserId: string; toUserId: string; amount: number | null } {
  let best: Transfer | null = null;

  for (const transfer of myDebitTransfers) {
    if (transfer.fromUserId !== currentUserId) {
      continue;
    }

    if (!best || transfer.amount > best.amount) {
      best = transfer;
    }
  }

  if (best) {
    return {
      fromUserId: currentUserId,
      toUserId: best.toUserId,
      amount: best.amount,
    };
  }

  const other =
    currentMemberIdsByName.find((id) => id !== currentUserId) ?? "";

  return {
    fromUserId: currentUserId,
    toUserId: other,
    amount: null,
  };
}
