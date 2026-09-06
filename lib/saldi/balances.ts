import type { MaterializedShare, Transfer } from "@/lib/saldi/types";

export const ZERO_THRESHOLD = 0.01;

export type ExpenseForNets = {
  payerUserId: string;
  movementAmount: number;
  shares: MaterializedShare[];
};

export type ReimbursementForNets = {
  fromUserId: string;
  toUserId: string;
  amount: number;
};

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

function add(nets: Map<string, number>, userId: string, delta: number) {
  nets.set(userId, roundCents((nets.get(userId) ?? 0) + delta));
}

export function applyExpenseToNets(
  nets: Map<string, number>,
  payerUserId: string,
  movementAmount: number,
  shares: MaterializedShare[],
) {
  add(nets, payerUserId, movementAmount);

  for (const share of shares) {
    add(nets, share.userId, -share.amount);
  }
}

export function applyReimbursementToNets(
  nets: Map<string, number>,
  fromUserId: string,
  toUserId: string,
  amount: number,
) {
  add(nets, fromUserId, amount);
  add(nets, toUserId, -amount);
}

export function computeNets(
  expenses: ExpenseForNets[],
  reimbursements: ReimbursementForNets[],
): Map<string, number> {
  const nets = new Map<string, number>();

  for (const expense of expenses) {
    applyExpenseToNets(
      nets,
      expense.payerUserId,
      expense.movementAmount,
      expense.shares,
    );
  }

  for (const reimbursement of reimbursements) {
    applyReimbursementToNets(
      nets,
      reimbursement.fromUserId,
      reimbursement.toUserId,
      reimbursement.amount,
    );
  }

  for (const [userId, net] of nets) {
    if (Math.abs(net) < ZERO_THRESHOLD) {
      nets.set(userId, 0);
    }
  }

  return nets;
}

export function simplifyTransfers(nets: Map<string, number>): Transfer[] {
  const working = new Map(nets);
  const transfers: Transfer[] = [];

  while (true) {
    let creditorId: string | null = null;
    let creditorNet = 0;
    let debtorId: string | null = null;
    let debtorNet = 0;

    for (const [userId, net] of working) {
      if (net >= ZERO_THRESHOLD && net > creditorNet) {
        creditorId = userId;
        creditorNet = net;
      }

      if (net <= -ZERO_THRESHOLD && net < debtorNet) {
        debtorId = userId;
        debtorNet = net;
      }
    }

    if (!creditorId || !debtorId) {
      break;
    }

    const amount = roundCents(Math.min(creditorNet, -debtorNet));

    if (amount < ZERO_THRESHOLD) {
      break;
    }

    transfers.push({
      fromUserId: debtorId,
      toUserId: creditorId,
      amount,
    });
    working.set(creditorId, roundCents(creditorNet - amount));
    working.set(debtorId, roundCents(debtorNet + amount));
  }

  return transfers;
}

export function transfersForUser(
  transfers: Transfer[],
  currentUserId: string,
): Transfer[] {
  return transfers.filter(
    (transfer) =>
      transfer.fromUserId === currentUserId ||
      transfer.toUserId === currentUserId,
  );
}
