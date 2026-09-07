import { splitEqual } from "@/lib/saldi/split";
import type {
  MaterializedShare,
  MovementSplitInput,
  PayerKind,
  SplitMode,
} from "@/lib/saldi/types";

export type SplitPersistResult =
  | { action: "delete" }
  | {
      action: "upsert";
      payerKind: PayerKind;
      payerUserId: string | null;
      splitMode: SplitMode;
      shares: MaterializedShare[];
    }
  | { action: "error"; error: string };

type ResolveSplitPersistenceInput = {
  type: "income" | "expense";
  isPrivate: boolean;
  amount: number;
  split: MovementSplitInput | undefined;
};

export type InferCustomSplitInput = {
  payerKind: PayerKind;
  payerUserId: string | null;
  splitMode: SplitMode;
  shares: MaterializedShare[];
  movementAmount: number;
};

function cents(value: number): number {
  return Math.round(value * 100);
}

export function inferCustomSplit(input: InferCustomSplitInput): boolean {
  if (input.payerKind === "family") {
    return false;
  }

  if (input.shares.length !== 1) {
    return true;
  }

  const [share] = input.shares;

  if (!share || !input.payerUserId) {
    return true;
  }

  if (share.userId !== input.payerUserId) {
    return true;
  }

  return cents(share.amount) !== cents(input.movementAmount);
}

export function resolveSplitPersistence(
  input: ResolveSplitPersistenceInput,
): SplitPersistResult {
  const split = input.split;

  if (
    input.type !== "expense" ||
    input.isPrivate ||
    input.amount <= 0 ||
    !split
  ) {
    return { action: "delete" };
  }

  if (split.payerKind === "family") {
    return {
      action: "upsert",
      payerKind: "family",
      payerUserId: null,
      splitMode: "equal",
      shares: [],
    };
  }

  if (!split.payerUserId) {
    return { action: "error", error: "Chi ha pagato non è valido." };
  }

  if (!split.customSplit) {
    return {
      action: "upsert",
      payerKind: "member",
      payerUserId: split.payerUserId,
      splitMode: "equal",
      shares: [{ userId: split.payerUserId, amount: input.amount }],
    };
  }

  if (split.shares.length === 0) {
    return {
      action: "error",
      error: "Ripartisci spesa richiede almeno un membro.",
    };
  }

  if (split.splitMode === "equal") {
    return {
      action: "upsert",
      payerKind: "member",
      payerUserId: split.payerUserId,
      splitMode: "equal",
      shares: splitEqual(
        input.amount,
        split.shares.map((share) => share.userId),
        split.payerUserId,
      ),
    };
  }

  const shares: MaterializedShare[] = [];

  for (const share of split.shares) {
    const amount = share.amount;

    if (amount === undefined || !Number.isFinite(amount) || amount <= 0) {
      return {
        action: "error",
        error: "Ogni quota deve essere maggiore di zero.",
      };
    }

    shares.push({ userId: share.userId, amount });
  }

  const sumCents = shares.reduce((total, share) => total + cents(share.amount), 0);

  if (sumCents !== cents(input.amount)) {
    return {
      action: "error",
      error: "La somma delle quote deve coincidere con l'importo.",
    };
  }

  return {
    action: "upsert",
    payerKind: "member",
    payerUserId: split.payerUserId,
    splitMode: "amount",
    shares,
  };
}
