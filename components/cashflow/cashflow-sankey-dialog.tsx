"use client";

import { useMemo } from "react";
import { CashflowSankeyChart } from "@/components/cashflow/cashflow-sankey-chart";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatOccurredOn } from "@/lib/cashflow/format";
import { buildSankeyGraph } from "@/lib/cashflow/sankey";
import type { Movement } from "@/lib/cashflow/types";

type CashflowSankeyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movements: Movement[];
  from: string;
  to: string;
  filtersActive: boolean;
};

export function CashflowSankeyDialog({
  open,
  onOpenChange,
  movements,
  from,
  to,
  filtersActive,
}: CashflowSankeyDialogProps) {
  const graph = useMemo(() => buildSankeyGraph(movements), [movements]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[calc(100dvh-2rem)] max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] flex-col overflow-hidden sm:max-w-[calc(100vw-2rem)]">
        <DialogHeader className="shrink-0">
          <DialogTitle>Grafico Sankey</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2">
            <span>
              Periodo {formatOccurredOn(from)} – {formatOccurredOn(to)}
            </span>
            {filtersActive ? (
              <Badge variant="secondary">Filtri colonna attivi</Badge>
            ) : null}
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col">
          <CashflowSankeyChart graph={graph} className="h-full min-h-0" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
