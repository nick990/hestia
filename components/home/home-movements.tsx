import { Badge } from "@/components/ui/badge";
import { assigneeDisplayName } from "@/lib/cashflow/assignee-filters";
import {
  formatOccurredOn,
  formatPayerLine,
  formatSignedAmount,
} from "@/lib/cashflow/format";
import { normalizeCategoryDisplay, normalizeDescriptionDisplay } from "@/lib/cashflow/table-filter";
import type { Movement } from "@/lib/cashflow/types";
import { cn } from "@/lib/utils";

type HomeMovementsProps = {
  movements: Movement[];
  hasFamily: boolean;
  onSelect: (movement: Movement) => void;
  emptyTitle?: string;
  emptyHint?: string;
};

export function HomeMovements({
  movements,
  hasFamily,
  onSelect,
  emptyTitle = "Nessun movimento in questo mese.",
  emptyHint = "Tocca + in basso a destra per registrare una spesa o un'entrata.",
}: HomeMovementsProps) {
  return (
    <section className="flex min-h-0 flex-col gap-2">
      <h2 className="text-sm font-medium">Movimenti</h2>

      {movements.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">{emptyTitle}</p>
          <p className="mt-1 text-xs text-muted-foreground">{emptyHint}</p>
        </div>
      ) : (
        <div className="max-h-[min(40dvh,18rem)] overflow-y-auto overscroll-contain rounded-lg border">
          <ul className="divide-y">
            {movements.map((movement) => {
              const description = normalizeDescriptionDisplay(
                movement.description,
              );
              const hasDescription = description !== "—";
              const payerLine = formatPayerLine(movement.payer_name);

              return (
                <li key={movement.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(movement)}
                    aria-label="Modifica movimento"
                    className="flex w-full items-start justify-between gap-3 px-3 py-2 text-left active:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {normalizeCategoryDisplay(movement.category_name)}
                      </p>
                      {hasDescription ? (
                        <p className="truncate text-xs leading-4 text-muted-foreground">
                          {description}
                        </p>
                      ) : null}
                      <p className="flex min-w-0 items-center gap-1 text-xs leading-4 text-muted-foreground">
                        <span>{formatOccurredOn(movement.occurred_on)}</span>
                        {hasFamily ? (
                          <>
                            <span aria-hidden>·</span>
                            <span className="truncate">
                              {assigneeDisplayName(movement)}
                            </span>
                          </>
                        ) : null}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <p
                        className={cn(
                          "text-sm font-medium tabular-nums",
                          movement.type === "income"
                            ? "text-income"
                            : "text-destructive",
                        )}
                      >
                        {formatSignedAmount(movement.type, movement.amount)}
                      </p>
                      {hasFamily && payerLine ? (
                        <p className="text-xs leading-4 text-muted-foreground">
                          {payerLine}
                        </p>
                      ) : null}
                      {hasFamily && movement.is_private ? (
                        <Badge
                          variant="outline"
                          className="h-4 px-1 text-xs leading-none"
                        >
                          Privato
                        </Badge>
                      ) : null}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
