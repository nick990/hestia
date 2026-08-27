import { HomeShell } from "@/components/home/home-shell";
import { HomeVistaError } from "@/components/home/home-vista-error";
import { MobileHome } from "@/components/home/mobile-home";
import { NotesPage } from "@/components/notes/notes-page";
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
import { parseHomeTab } from "@/lib/home/tab";
import { getNoteUiPrefs, listNotesForCurrentUser } from "@/lib/notes/queries";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type HomePageProps = {
  searchParams: Promise<{ from?: string; to?: string; tab?: string }>;
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
  const tab = parseHomeTab(params.tab);
  const { from, to } = parseDateRangeParams(params.from, params.to);
  const monthKey = from.slice(0, 7);
  const family = await getCurrentUserFamily();
  const hasFamily = family !== null;

  const [
    movementsResult,
    membersResult,
    categoriesResult,
    notesResult,
    prefsResult,
  ] = await Promise.all([
    settled(listAllMovementsForRange(from, to)),
    settled(listFamilyMembersForViewer()),
    settled(listCategoryOptions()),
    settled(listNotesForCurrentUser()),
    settled(getNoteUiPrefs()),
  ]);

  const cashflowReady =
    movementsResult.ok && membersResult.ok && categoriesResult.ok;
  const notesReady = notesResult.ok && prefsResult.ok;

  return (
    <div className="mx-auto w-full max-w-5xl flex-1">
      <HomeShell tab={tab} from={from} to={to}>
        {tab === "notes" ? (
          notesReady ? (
            <NotesPage
              currentUserId={user.id}
              notes={notesResult.value}
              prefs={prefsResult.value}
              hasFamily={hasFamily}
              hideTitle
            />
          ) : (
            <HomeVistaError
              message={
                notesResult.ok
                  ? prefsResult.ok
                    ? "Qualcosa è andato storto."
                    : prefsResult.error
                  : notesResult.error
              }
            />
          )
        ) : cashflowReady ? (
          <MobileHome
            monthKey={monthKey}
            from={from}
            allMovements={movementsResult.value}
            hasFamily={hasFamily}
            currentUserId={user.id}
            defaultOccurredOn={getTodayIsoDate()}
            familyMembers={membersResult.value}
            categories={categoriesResult.value}
          />
        ) : (
          <HomeVistaError
            message={
              !movementsResult.ok
                ? movementsResult.error
                : !membersResult.ok
                  ? membersResult.error
                  : !categoriesResult.ok
                    ? categoriesResult.error
                    : "Qualcosa è andato storto."
            }
          />
        )}
      </HomeShell>
    </div>
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
