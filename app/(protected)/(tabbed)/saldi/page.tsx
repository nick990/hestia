import { SaldiPage } from "@/components/saldi/saldi-page";
import { getCurrentUserFamily } from "@/lib/families/queries";
import { listFamilySaldiData } from "@/lib/saldi/queries";
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

  const data = await listFamilySaldiData();

  if (!data) {
    redirect("/");
  }

  return <SaldiPage currentUserId={user.id} data={data} />;
}
