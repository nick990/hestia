export type MovementType = "income" | "expense";

export type Movement = {
  id: string;
  type: MovementType;
  amount: number;
  occurred_on: string;
  description: string;
  created_at: string;
  category_id: string | null;
  category_name: string | null;
};

export type MonthSummary = {
  totalIncome: number;
  totalExpense: number;
  net: number;
};

export type MonthSummaryEntry = MonthSummary & {
  month: number;
  monthKey: string;
};

export type YearSummary = {
  year: number;
  months: MonthSummaryEntry[];
  totalIncome: number;
  totalExpense: number;
  net: number;
};
