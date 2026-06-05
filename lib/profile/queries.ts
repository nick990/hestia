import type { UserProfile } from "@/lib/profile/types";
import { createClient } from "@/lib/supabase/server";

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as UserProfile | null;
}
