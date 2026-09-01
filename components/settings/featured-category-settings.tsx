"use client";

import { updateFeaturedCategorySettings } from "@/app/actions/featured-category";
import { CategoryPicker } from "@/components/cashflow/category-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MovementCategoryOption } from "@/lib/categories/types";
import type { FeaturedCategorySettings } from "@/lib/featured/types";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

type FeaturedCategorySettingsProps = {
  hasFamily: boolean;
  settings: FeaturedCategorySettings | null;
  categories: MovementCategoryOption[];
};

export function FeaturedCategorySettingsBlock({
  hasFamily,
  settings,
  categories,
}: FeaturedCategorySettingsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const initialCategoryId = useMemo(() => {
    if (!settings?.category_name) {
      return "none";
    }

    const match = categories.find(
      (category) => category.name === settings.category_name,
    );

    return match?.id ?? "none";
  }, [categories, settings?.category_name]);

  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [budgetRaw, setBudgetRaw] = useState(
    settings?.budget !== null && settings?.budget !== undefined
      ? String(settings.budget)
      : "",
  );

  if (!hasFamily) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6">
        <h3 className="text-sm font-medium">Categoria in evidenza</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          La categoria in evidenza è condivisa in famiglia. Quando farai parte di
          una famiglia potrai configurarla qui.
        </p>
      </div>
    );
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateFeaturedCategorySettings({
        categoryId: categoryId === "none" ? null : categoryId,
        budgetRaw,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Categoria in evidenza aggiornata");
      router.refresh();
    });
  }

  return (
    <div className="mb-8 rounded-lg border bg-muted/10 px-4 py-4">
      <h3 className="text-sm font-medium">Categoria in evidenza</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Scegli una categoria da seguire nella tab In evidenza in home. Tutti i
        membri della famiglia possono modificarla.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="featured-category">Categoria</Label>
          <CategoryPicker
            id="featured-category"
            categories={categories}
            value={categoryId}
            onChange={setCategoryId}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="featured-budget">Limite di spesa (opzionale)</Label>
          <Input
            id="featured-budget"
            inputMode="decimal"
            placeholder="Es. 1500 — tetto massimo"
            value={budgetRaw}
            onChange={(event) => setBudgetRaw(event.target.value)}
          />
        </div>
      </div>

      <div className="mt-4">
        <Button type="button" disabled={pending} onClick={handleSave}>
          {pending ? "Salvataggio…" : "Salva categoria in evidenza"}
        </Button>
      </div>
    </div>
  );
}
