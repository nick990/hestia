import { splitEqual } from "@/lib/saldi/split";
import type {
  MaterializedShare,
  MovementSplitInput,
  SplitMode,
} from "@/lib/saldi/types";

export type SplitPersistResult =
  | { action: "delete" }
  | {
      action: "upsert";
      payerUserId: string;
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

function cents(value: number): number {
  return Math.round(value * 100);
}

export function resolveSplitPersistence(
  input: ResolveSplitPersistenceInput,
): SplitPersistResult {
  const split = input.split;

  if (
    input.type !== "expense" ||
    input.isPrivate ||
    input.amount <= 0 ||
    !split ||
    !split.enabled
  ) {
    return { action: "delete" };
  }

  if (!split.payerUserId) {
    return { action: "error", error: "Chi ha pagato non è valido." };
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
    payerUserId: split.payerUserId,
    splitMode: "amount",
    shares,
  };
}
