import { SaldiPage } from "@/components/saldi/saldi-page";
import { listCategoryOptions } from "@/lib/categories/queries";
import { getTodayIsoDate } from "@/lib/cashflow/date-range";
import { getCurrentUserFamily } from "@/lib/families/queries";
import { listFamilyNets, listSaldiActivity } from "@/lib/saldi/queries";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function SaldiRoutePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const family = await getCurrentUserFamily();

  if (!family) {
    redirect("/");
  }

  const [data, activity, categories] = await Promise.all([
    listFamilyNets(),
    listSaldiActivity(0),
    listCategoryOptions(),
  ]);

  if (!data) {
    redirect("/");
  }

  return (
    <SaldiPage
      currentUserId={user.id}
      data={data}
      initialActivity={activity.items}
      initialHasMore={activity.hasMore}
      categories={categories}
      defaultOccurredOn={getTodayIsoDate()}
    />
  );
}
