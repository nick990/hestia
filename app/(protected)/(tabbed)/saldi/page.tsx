import { getCurrentUserFamily } from "@/lib/families/queries";
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

  return (
    <div className="p-4">
      <h1 className="text-lg font-medium">Saldi</h1>
    </div>
  );
}
