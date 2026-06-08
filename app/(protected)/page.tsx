import { MobileHome } from "@/components/home/mobile-home";
import {
  getCurrentYear,
  getTodayIsoDate,
  getCurrentMonthBounds,
} from "@/lib/cashflow/date-range";
import { getCurrentMonthKey } from "@/lib/cashflow/month";
import {
  getRangeSummary,
  listMovementsForRange,
} from "@/lib/cashflow/queries";
import { parseShareParam } from "@/lib/cashflow/share";
import { parseCashflowViewParam } from "@/lib/cashflow/view";
import { listCategoryOptions } from "@/lib/categories/queries";
import { getCurrentUserFamily, getFamilyMemberCount } from "@/lib/families/queries";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{
    view?: string;
    share?: string;
  }>;
};

export default async function HomePage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const { from, to } = getCurrentMonthBounds();
  const monthKey = getCurrentMonthKey();
  const year = getCurrentYear();
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

  const [movements, summary, categories] = await Promise.all([
    listMovementsForRange(from, to, view, shareOptions),
    getRangeSummary(from, to, view, shareOptions),
    listCategoryOptions(),
  ]);

  const cashflowParams = new URLSearchParams({ from, to });
  if (view !== "all") {
    cashflowParams.set("view", view);
  }
  if (share) {
    cashflowParams.set("share", "1");
  }
  const cashflowHref = `/cashflow?${cashflowParams.toString()}`;

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 p-6">
      <MobileHome
        monthKey={monthKey}
        from={from}
        to={to}
        year={year}
        view={view}
        share={share}
        memberCount={memberCount}
        summary={summary}
        movements={movements}
        hasFamily={family !== null}
        currentUserId={user.id}
        defaultOccurredOn={getTodayIsoDate()}
        categories={categories}
        cashflowHref={cashflowHref}
      />
    </div>
  );
}
