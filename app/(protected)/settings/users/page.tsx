import { listMembers } from "@/app/actions/members";
import { MembersManager } from "@/components/users/members-manager";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/member";

export default async function SettingsUsersPage() {
  await requireAdmin();
  const members = await listMembers();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Utenti</CardTitle>
        <CardDescription>
          Gestisci gli utenti autorizzati ad accedere all&apos;applicazione.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <MembersManager members={members} />
      </CardContent>
    </Card>
  );
}
