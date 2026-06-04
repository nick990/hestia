import { MovementsManager } from "@/components/cashflow/movements-manager";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatMonthLabel, parseMonthParam } from "@/lib/cashflow/month";
import { listCategoryOptions } from "@/lib/categories/queries";
import { getMonthSummary, listMovementsForMonth } from "@/lib/cashflow/queries";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ month?: string }>;
};

export default async function CashflowPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const monthKey = parseMonthParam(params.month);
  const [movements, summary, categories] = await Promise.all([
    listMovementsForMonth(monthKey),
    getMonthSummary(monthKey),
    listCategoryOptions(),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Cashflow</CardTitle>
          <CardDescription>
            Registra entrate e uscite e consulta i movimenti del mese.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MovementsManager
            monthKey={monthKey}
            monthLabel={formatMonthLabel(monthKey)}
            movements={movements}
            summary={summary}
            categories={categories}
          />
        </CardContent>
      </Card>
    </div>
  );
}
