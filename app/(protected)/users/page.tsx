import { listMembers } from "@/app/actions/members";
import { MembersManager } from "@/components/users/members-manager";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function UsersPage() {
  const members = await listMembers();

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 p-6">
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
    </div>
  );
}
