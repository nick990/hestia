import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  formatOccurredOn,
  formatSignedAmount,
} from "@/lib/cashflow/format";
import { normalizeDescriptionDisplay } from "@/lib/cashflow/table-filter";
import type { Movement } from "@/lib/cashflow/types";
import { cn } from "@/lib/utils";

type RecentMovementsProps = {
  movements: Movement[];
  hasFamily: boolean;
  cashflowHref: string;
};

export function RecentMovements({
  movements,
  hasFamily,
  cashflowHref,
}: RecentMovementsProps) {
  const recent = movements.slice(0, 5);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">Ultimi movimenti</h2>
        <Link
          href={cashflowHref}
          className="text-xs font-medium text-primary hover:underline"
        >
          Apri Cashflow
        </Link>
      </div>

      {recent.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Nessun movimento questo mese.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tocca + in basso a destra per registrare la prima spesa o entrata.
          </p>
        </div>
      ) : (
        <ul className="divide-y rounded-lg border bg-background">
          {recent.map((movement) => {
            const label =
              normalizeDescriptionDisplay(movement.description) === "—"
                ? movement.category_name ?? "Movimento"
                : normalizeDescriptionDisplay(movement.description);

            return (
              <li
                key={movement.id}
                className="flex items-start justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm font-medium">{label}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatOccurredOn(movement.occurred_on)}</span>
                    {hasFamily && movement.scope === "private" ? (
                      <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                        Privato
                      </Badge>
                    ) : null}
                    {hasFamily && movement.author_name ? (
                      <span className="truncate">{movement.author_name}</span>
                    ) : null}
                  </div>
                </div>
                <p
                  className={cn(
                    "shrink-0 text-sm font-medium tabular-nums",
                    movement.type === "income"
                      ? "text-income"
                      : "text-destructive",
                  )}
                >
                  {formatSignedAmount(movement.type, movement.amount)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
