import { MovementsManager } from "@/components/cashflow/movements-manager";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { parseDateRangeParams, parseYearParam } from "@/lib/cashflow/date-range";
import { listCategoryOptions } from "@/lib/categories/queries";
import {
  getRangeSummary,
  getYearMonthlySummaries,
  listMovementsForRange,
} from "@/lib/cashflow/queries";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ from?: string; to?: string; year?: string }>;
};

export default async function CashflowPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const { from, to } = parseDateRangeParams(params.from, params.to);
  const year = parseYearParam(params.year);
  const [movements, summary, yearSummary, categories] = await Promise.all([
    listMovementsForRange(from, to),
    getRangeSummary(from, to),
    getYearMonthlySummaries(year),
    listCategoryOptions(),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Cashflow</CardTitle>
          <CardDescription>
            Registra entrate e uscite e consulta i movimenti del periodo selezionato.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MovementsManager
            from={from}
            to={to}
            year={year}
            movements={movements}
            summary={summary}
            yearSummary={yearSummary}
            categories={categories}
          />
        </CardContent>
      </Card>
    </div>
  );
}
