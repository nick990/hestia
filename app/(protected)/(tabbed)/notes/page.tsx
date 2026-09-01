import { NotesPage } from "@/components/notes/notes-page";
import { getCurrentUserFamily } from "@/lib/families/queries";
import { getNoteUiPrefs, listNotesForCurrentUser } from "@/lib/notes/queries";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function NotesRoutePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [notes, prefs, family] = await Promise.all([
    listNotesForCurrentUser(),
    getNoteUiPrefs(),
    getCurrentUserFamily(),
  ]);

  return (
    <NotesPage
      currentUserId={user.id}
      notes={notes}
      prefs={prefs}
      hasFamily={family !== null}
      hideTitle
    />
  );
}
