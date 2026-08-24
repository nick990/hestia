import { MovementsManager } from "@/components/cashflow/movements-manager";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getTodayIsoDate, parseDateRangeParams, parseYearParam } from "@/lib/cashflow/date-range";
import { listAllMovementsForRange } from "@/lib/cashflow/queries";
import { listCategoryOptions } from "@/lib/categories/queries";
import {
  getCurrentUserFamily,
  listFamilyMembersForViewer,
} from "@/lib/families/queries";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{
    from?: string;
    to?: string;
    year?: string;
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
  const yearFrom = `${year}-01-01`;
  const yearTo = `${year}-12-31`;
  const family = await getCurrentUserFamily();

  const [allMovements, yearMovements, familyMembers, categories] =
    await Promise.all([
      listAllMovementsForRange(from, to),
      listAllMovementsForRange(yearFrom, yearTo),
      listFamilyMembersForViewer(),
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
            hasFamily={family !== null}
            currentUserId={user.id}
            defaultOccurredOn={getTodayIsoDate()}
            allMovements={allMovements}
            yearMovements={yearMovements}
            familyMembers={familyMembers}
            categories={categories}
          />
        </CardContent>
      </Card>
    </div>
  );
}
