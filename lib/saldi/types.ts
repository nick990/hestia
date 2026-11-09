import type { Movement } from "@/lib/cashflow/types";

export type SplitMode = "equal" | "amount";

export type PayerKind = "member" | "family";

export type MovementSplitShareInput = {
  userId: string;
  amount?: number;
};

export type MovementSplitInput =
  | {
      payerKind: "family";
      customSplit: false;
    }
  | {
      payerKind: "member";
      payerUserId: string;
      customSplit: false;
    }
  | {
      payerKind: "member";
      payerUserId: string;
      customSplit: true;
      splitMode: SplitMode;
      shares: MovementSplitShareInput[];
    };

export type MaterializedShare = {
  userId: string;
  amount: number;
};

export type Transfer = {
  fromUserId: string;
  toUserId: string;
  amount: number;
};

export type PersonNet = {
  userId: string;
  name: string;
  net: number;
  isCurrentMember: boolean;
};

export type MovementSplitView = {
  payerKind: PayerKind;
  payerUserId: string | null;
  splitMode: SplitMode;
  shares: MaterializedShare[];
  customSplit: boolean;
};

export type FamilySaldiMember = {
  userId: string;
  name: string;
};

export type FamilySaldiSummary = {
  familyId: string;
  currentMembers: FamilySaldiMember[];
  nameById: Record<string, string>;
  netsByUserId: Record<string, number>;
  transfers: Transfer[];
  personNets: PersonNet[];
};

export type SaldiActivityItem =
  | {
      kind: "split";
      movement: Movement;
      createdAt: string;
    }
  | {
      kind: "reimbursement";
      id: string;
      occurredOn: string;
      createdAt: string;
      amount: number;
      fromUserId: string;
      toUserId: string;
    };
