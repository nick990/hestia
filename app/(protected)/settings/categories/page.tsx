import { CategoriesManager } from "@/components/settings/categories-manager";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentMember } from "@/lib/auth/member";
import { listCategoriesWithCounts } from "@/lib/categories/queries";

export default async function CategoriesSettingsPage() {
  const member = await getCurrentMember();
  const canEdit = member?.role === "admin" && !member.disabled_at;
  const categories = await listCategoriesWithCounts();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Categorie</CardTitle>
        <CardDescription>
          {canEdit
            ? "Gestisci le categorie usate nei movimenti."
            : "Elenco categorie disponibili per i movimenti."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CategoriesManager categories={categories} canEdit={canEdit} />
      </CardContent>
    </Card>
  );
}
