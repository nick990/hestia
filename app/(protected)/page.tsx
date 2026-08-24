import { MobileHome } from "@/components/home/mobile-home";
import {
  getCurrentYear,
  getTodayIsoDate,
  getCurrentMonthBounds,
} from "@/lib/cashflow/date-range";
import { getCurrentMonthKey } from "@/lib/cashflow/month";
import { listAllMovementsForRange } from "@/lib/cashflow/queries";
import { listCategoryOptions } from "@/lib/categories/queries";
import {
  getCurrentUserFamily,
  listFamilyMembersForViewer,
} from "@/lib/families/queries";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { from, to } = getCurrentMonthBounds();
  const monthKey = getCurrentMonthKey();
  const year = getCurrentYear();
  const family = await getCurrentUserFamily();

  const [allMovements, familyMembers, categories] = await Promise.all([
    listAllMovementsForRange(from, to),
    listFamilyMembersForViewer(),
    listCategoryOptions(),
  ]);

  const cashflowParams = new URLSearchParams({ from, to });
  const cashflowHref = `/cashflow?${cashflowParams.toString()}`;

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 p-6">
      <MobileHome
        monthKey={monthKey}
        from={from}
        to={to}
        year={year}
        allMovements={allMovements}
        hasFamily={family !== null}
        currentUserId={user.id}
        defaultOccurredOn={getTodayIsoDate()}
        familyMembers={familyMembers}
        categories={categories}
        cashflowHref={cashflowHref}
      />
    </div>
  );
}
