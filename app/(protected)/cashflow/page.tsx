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
import { parseShareParam } from "@/lib/cashflow/share";
import { parseCashflowViewParam } from "@/lib/cashflow/view";
import { getCurrentUserFamily, getFamilyMemberCount } from "@/lib/families/queries";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{
    from?: string;
    to?: string;
    year?: string;
    view?: string;
    share?: string;
  }>;
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
  const share = parseShareParam(params.share);
  const family = await getCurrentUserFamily();
  const memberCount = family ? await getFamilyMemberCount(family.family_id) : 0;
  const shareOptions = {
    shareEnabled: share,
    memberCount,
    view,
    currentUserId: user.id,
  };

  const [movements, rawMovements, summary, yearSummary, categories] =
    await Promise.all([
      listMovementsForRange(from, to, view, shareOptions),
      listMovementsForRange(from, to, view, { ...shareOptions, shareEnabled: false }),
      getRangeSummary(from, to, view, shareOptions),
      getYearMonthlySummaries(year, view, shareOptions),
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
            share={share}
            memberCount={memberCount}
            hasFamily={family !== null}
            currentUserId={user.id}
            defaultOccurredOn={getTodayIsoDate()}
            movements={movements}
            rawMovements={rawMovements}
            summary={summary}
            yearSummary={yearSummary}
            categories={categories}
          />
        </CardContent>
      </Card>
    </div>
  );
}
