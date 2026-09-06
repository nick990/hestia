export type SplitMode = "equal" | "amount";

export type MovementSplitShareInput = {
  userId: string;
  amount?: number;
};

export type MovementSplitInput =
  | { enabled: false }
  | {
      enabled: true;
      payerUserId: string;
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
  payerUserId: string;
  splitMode: SplitMode;
  shares: MaterializedShare[];
};

export type FamilySaldiMember = {
  userId: string;
  name: string;
};

export type FamilySaldiNetsData = {
  familyId: string;
  expenses: {
    payerUserId: string;
    movementAmount: number;
    shares: MaterializedShare[];
  }[];
  reimbursements: {
    fromUserId: string;
    toUserId: string;
    amount: number;
  }[];
  currentMembers: FamilySaldiMember[];
  nameById: Record<string, string>;
};

export type SaldiActivityItem =
  | {
      kind: "split";
      id: string;
      occurredOn: string;
      createdAt: string;
      amount: number;
      categoryName: string | null;
      description: string;
      payerName: string;
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
