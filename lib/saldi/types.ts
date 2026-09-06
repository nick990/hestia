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
