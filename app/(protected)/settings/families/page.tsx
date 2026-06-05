import {
  listAssignableMembers,
  listFamiliesForAdmin,
} from "@/app/actions/families";
import { FamiliesManager } from "@/components/settings/families-manager";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/member";

export default async function SettingsFamiliesPage() {
  await requireAdmin();
  const [families, assignableMembers] = await Promise.all([
    listFamiliesForAdmin(),
    listAssignableMembers(),
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Famiglie</CardTitle>
        <CardDescription>
          Raggruppa gli utenti per condividere i movimenti cashflow.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FamiliesManager
          families={families}
          assignableMembers={assignableMembers}
        />
      </CardContent>
    </Card>
  );
}
