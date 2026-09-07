import { formatEuro } from "@/lib/cashflow/format";
import { ZERO_THRESHOLD } from "@/lib/saldi/balances";
import type { PersonNet, Transfer } from "@/lib/saldi/types";

export type TransferLineTone = "debit" | "credit";

export type TransferLineParts = {
  before: string;
  amount: string;
  after: string;
  tone: TransferLineTone;
};

export function transferLineParts(
  transfer: Transfer,
  currentUserId: string,
  nameById: Map<string, string>,
): TransferLineParts {
  const amount = formatEuro(transfer.amount);

  if (transfer.fromUserId === currentUserId) {
    const name = nameById.get(transfer.toUserId) ?? "—";
    return {
      before: "Devi pagare ",
      amount,
      after: ` a ${name}`,
      tone: "debit",
    };
  }

  const name = nameById.get(transfer.fromUserId) ?? "—";
  return {
    before: `${name} ti deve `,
    amount,
    after: "",
    tone: "credit",
  };
}

export function transferLine(
  transfer: Transfer,
  currentUserId: string,
  nameById: Map<string, string>,
): string {
  const parts = transferLineParts(transfer, currentUserId, nameById);
  return `${parts.before}${parts.amount}${parts.after}`;
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
  myTransfers: Transfer[],
  currentUserId: string,
  currentMemberIdsByName: string[],
): { fromUserId: string; toUserId: string; amount: number | null } {
  let best: Transfer | null = null;

  for (const transfer of myTransfers) {
    const involvesUser =
      transfer.fromUserId === currentUserId ||
      transfer.toUserId === currentUserId;

    if (!involvesUser) {
      continue;
    }

    if (!best || transfer.amount > best.amount) {
      best = transfer;
    }
  }

  if (best) {
    if (best.fromUserId === currentUserId) {
      return {
        fromUserId: currentUserId,
        toUserId: best.toUserId,
        amount: best.amount,
      };
    }

    return {
      fromUserId: best.fromUserId,
      toUserId: currentUserId,
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

export function reimbursementLine(
  fromName: string,
  amount: number,
  toName: string,
): string {
  return `${fromName} ha rimborsato ${formatEuro(amount)} a ${toName}`;
}

export function reimbursementFormDefaults(input: {
  mode: "create" | "edit";
  today: string;
  createDefaults: {
    fromUserId: string;
    toUserId: string;
    amount: number | null;
  };
  editing: {
    fromUserId: string;
    toUserId: string;
    amount: number;
    occurredOn: string;
  } | null;
}): {
  fromUserId: string;
  toUserId: string;
  amount: number | null;
  occurredOn: string;
} {
  if (input.mode === "edit" && input.editing) {
    return {
      fromUserId: input.editing.fromUserId,
      toUserId: input.editing.toUserId,
      amount: input.editing.amount,
      occurredOn: input.editing.occurredOn,
    };
  }

  return {
    fromUserId: input.createDefaults.fromUserId,
    toUserId: input.createDefaults.toUserId,
    amount: input.createDefaults.amount,
    occurredOn: input.today,
  };
}
