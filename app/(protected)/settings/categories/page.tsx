import { CategoriesManager } from "@/components/settings/categories-manager";
import { FeaturedCategorySettingsBlock } from "@/components/settings/featured-category-settings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentMember } from "@/lib/auth/member";
import { listCategoryOptions, listCategoriesWithCounts } from "@/lib/categories/queries";
import { getFeaturedCategorySettings } from "@/lib/featured/queries";
import { getCurrentUserFamily } from "@/lib/families/queries";

export default async function CategoriesSettingsPage() {
  const member = await getCurrentMember();
  const canEdit = member?.role === "admin" && !member.disabled_at;
  const [categories, categoryOptions, family, featuredSettings] =
    await Promise.all([
      listCategoriesWithCounts(),
      listCategoryOptions(),
      getCurrentUserFamily(),
      getFeaturedCategorySettings(),
    ]);
  const hasFamily = family !== null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Categorie</CardTitle>
        <CardDescription>
          {canEdit
            ? "Gestisci le categorie usate nei movimenti. I nomi col punto si raggruppano al primo livello."
            : "Elenco categorie disponibili per i movimenti. I nomi col punto si raggruppano al primo livello."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FeaturedCategorySettingsBlock
          hasFamily={hasFamily}
          settings={featuredSettings}
          categories={categoryOptions}
        />
        <CategoriesManager categories={categories} canEdit={canEdit} />
      </CardContent>
    </Card>
  );
}
