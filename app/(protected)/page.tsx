import { MobileHome } from "@/components/home/mobile-home";
import {
  getTodayIsoDate,
  parseDateRangeParams,
} from "@/lib/cashflow/date-range";
import { listAllMovementsForRange } from "@/lib/cashflow/queries";
import { listCategoryOptions } from "@/lib/categories/queries";
import {
  getCurrentUserFamily,
  listFamilyMembersForViewer,
} from "@/lib/families/queries";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type HomePageProps = {
  searchParams: Promise<{ from?: string; to?: string }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
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
    <div className="mx-auto w-full max-w-5xl flex-1">
      <MobileHome
        monthKey={monthKey}
        from={from}
        allMovements={allMovements}
        hasFamily={family !== null}
        currentUserId={user.id}
        defaultOccurredOn={getTodayIsoDate()}
        familyMembers={familyMembers}
        categories={categories}
      />
    </div>
  );
}
