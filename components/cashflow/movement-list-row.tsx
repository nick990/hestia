import { Badge } from "@/components/ui/badge";
import { assigneeDisplayName } from "@/lib/cashflow/assignee-filters";
import {
  formatOccurredOn,
  formatPayerLine,
  formatSignedAmount,
} from "@/lib/cashflow/format";
import {
  normalizeCategoryDisplay,
  normalizeDescriptionDisplay,
} from "@/lib/cashflow/table-filter";
import type { Movement } from "@/lib/cashflow/types";
import { cn } from "@/lib/utils";

type MovementListRowProps = {
  movement: Movement;
  hasFamily: boolean;
};

export function MovementListRow({ movement, hasFamily }: MovementListRowProps) {
  const description = normalizeDescriptionDisplay(movement.description);
  const hasDescription = description !== "—";
  const payerLine = formatPayerLine(movement.payer_name);

  return (
    <>
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
              <span className="truncate">{assigneeDisplayName(movement)}</span>
            </>
          ) : null}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <p
          className={cn(
            "text-sm font-medium tabular-nums",
            movement.type === "income" ? "text-income" : "text-destructive",
          )}
        >
          {formatSignedAmount(movement.type, movement.amount)}
        </p>
        {hasFamily && payerLine ? (
          <p className="text-xs leading-4 text-muted-foreground">{payerLine}</p>
        ) : null}
        {hasFamily && movement.is_private ? (
          <Badge variant="outline" className="h-4 px-1 text-xs leading-none">
            Privato
          </Badge>
        ) : null}
      </div>
    </>
  );
}
