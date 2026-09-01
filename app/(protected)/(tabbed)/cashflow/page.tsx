import { MobileHome } from "@/components/home/mobile-home";
import { listCategoryOptions } from "@/lib/categories/queries";
import {
  getTodayIsoDate,
  parseDateRangeParams,
} from "@/lib/cashflow/date-range";
import { listAllMovementsForRange } from "@/lib/cashflow/queries";
import {
  getCurrentUserFamily,
  listFamilyMembersForViewer,
} from "@/lib/families/queries";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type CashflowPageProps = {
  searchParams: Promise<{ from?: string; to?: string }>;
};

export default async function CashflowPage({ searchParams }: CashflowPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const { from, to } = parseDateRangeParams(params.from, params.to);
  const monthKey = from.slice(0, 7);
  const family = await getCurrentUserFamily();

  const [allMovements, familyMembers, categories] = await Promise.all([
    listAllMovementsForRange(from, to),
    listFamilyMembersForViewer(),
    listCategoryOptions(),
  ]);

  return (
    <MobileHome
      monthKey={monthKey}
      from={from}
      to={to}
      allMovements={allMovements}
      hasFamily={family !== null}
      currentUserId={user.id}
      defaultOccurredOn={getTodayIsoDate()}
      familyMembers={familyMembers}
      categories={categories}
    />
  );
}
