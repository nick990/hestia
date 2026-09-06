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

export type FamilySaldiData = {
  familyId: string;
  expenses: {
    payerUserId: string;
    movementAmount: number;
    shares: MaterializedShare[];
  }[];
  reimbursements: FamilySaldiReimbursement[];
  currentMembers: FamilySaldiMember[];
  nameById: Record<string, string>;
};
