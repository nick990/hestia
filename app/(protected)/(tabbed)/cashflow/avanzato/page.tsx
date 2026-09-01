import { MovementsManager } from "@/components/cashflow/movements-manager";
import { listCategoryOptions } from "@/lib/categories/queries";
import {
  getTodayIsoDate,
  parseDateRangeParams,
  parseYearParam,
} from "@/lib/cashflow/date-range";
import { listAllMovementsForRange } from "@/lib/cashflow/queries";
import {
  getCurrentUserFamily,
  listFamilyMembersForViewer,
} from "@/lib/families/queries";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type AdvancedCashflowPageProps = {
  searchParams: Promise<{
    from?: string;
    to?: string;
    year?: string;
  }>;
};

export default async function AdvancedCashflowPage({
  searchParams,
}: AdvancedCashflowPageProps) {
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
    <div className="flex-1 p-6">
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
    </div>
  );
}
