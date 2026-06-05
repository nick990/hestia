import { AccountManager } from "@/components/settings/account-manager";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUserProfile } from "@/lib/profile/queries";
import { redirect } from "next/navigation";

export default async function AccountSettingsPage() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>
          Aggiorna il nome visualizzato nell&apos;app.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AccountManager profile={profile} />
      </CardContent>
    </Card>
  );
}
