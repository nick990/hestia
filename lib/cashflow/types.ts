export type MovementType = "income" | "expense";

export type Movement = {
  id: string;
  type: MovementType;
  amount: number;
  occurred_on: string;
  description: string;
  created_at: string;
};

export type MonthSummary = {
  totalIncome: number;
  totalExpense: number;
  net: number;
};
