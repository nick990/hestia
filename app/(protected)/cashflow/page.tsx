import { MovementsManager } from "@/components/cashflow/movements-manager";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getTodayIsoDate, parseDateRangeParams, parseYearParam } from "@/lib/cashflow/date-range";
import { listCategoryOptions } from "@/lib/categories/queries";
import {
  getRangeSummary,
  getYearMonthlySummaries,
  listMovementsForRange,
} from "@/lib/cashflow/queries";
import { parseCashflowViewParam } from "@/lib/cashflow/view";
import { getCurrentUserFamily } from "@/lib/families/queries";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ from?: string; to?: string; year?: string; view?: string }>;
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
  const view = parseCashflowViewParam(params.view);
  const family = await getCurrentUserFamily();
  const [movements, summary, yearSummary, categories] = await Promise.all([
    listMovementsForRange(from, to, view),
    getRangeSummary(from, to, view),
    getYearMonthlySummaries(year, view),
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
            view={view}
            hasFamily={family !== null}
            familyName={family?.family_name}
            defaultOccurredOn={getTodayIsoDate()}
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
