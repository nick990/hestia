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

export type FamilySaldiReimbursement = {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  createdAt: string;
};

export type FamilySaldiMember = {
  userId: string;
  name: string;
};

export type FamilySaldiExpense = {
  movementId: string;
  payerUserId: string;
  movementAmount: number;
  shares: MaterializedShare[];
  occurredOn: string;
  description: string;
  categoryName: string | null;
};

export type FamilySaldiData = {
  familyId: string;
  expenses: FamilySaldiExpense[];
  reimbursements: FamilySaldiReimbursement[];
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
