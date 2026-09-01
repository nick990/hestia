import { FeaturedCategoryView } from "@/components/featured/featured-category-view";
import { HomeVistaError } from "@/components/home/home-vista-error";
import { listCategoryOptions } from "@/lib/categories/queries";
import { getTodayIsoDate } from "@/lib/cashflow/date-range";
import { getFeaturedTabData } from "@/lib/featured/queries";
import {
  getCurrentUserFamily,
  listFamilyMembersForViewer,
} from "@/lib/families/queries";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function EvidenzaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const family = await getCurrentUserFamily();
  const hasFamily = family !== null;

  const [featuredResult, membersResult, categoriesResult] = await Promise.all([
    settled(getFeaturedTabData()),
    settled(listFamilyMembersForViewer()),
    settled(listCategoryOptions()),
  ]);

  const ready =
    featuredResult.ok && membersResult.ok && categoriesResult.ok;

  if (!ready) {
    return (
      <HomeVistaError
        message={
          !featuredResult.ok
            ? featuredResult.error
            : !membersResult.ok
              ? membersResult.error
              : !categoriesResult.ok
                ? categoriesResult.error
                : "Qualcosa è andato storto."
        }
      />
    );
  }

  return (
    <FeaturedCategoryView
      hasFamily={hasFamily}
      settings={featuredResult.value.settings}
      movements={featuredResult.value.movements}
      currentUserId={user.id}
      defaultOccurredOn={getTodayIsoDate()}
      familyMembers={membersResult.value}
      categories={categoriesResult.value}
    />
  );
}

async function settled<T>(
  promise: Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  try {
    return { ok: true, value: await promise };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Qualcosa è andato storto.",
    };
  }
}
