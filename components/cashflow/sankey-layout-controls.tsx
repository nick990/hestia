"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  clampColumnGapX,
  clampColumnGapY,
  SANKEY_COLUMN_GAP_X_MIN,
  SANKEY_COLUMN_GAP_X_STEP,
  SANKEY_COLUMN_GAP_Y_MIN,
  SANKEY_COLUMN_GAP_Y_STEP,
} from "@/lib/cashflow/sankey-layout-config";

type SankeyLayoutControlsProps = {
  columnGapY: number;
  columnGapX: number;
  onColumnGapYChange: (value: number) => void;
  onColumnGapXChange: (value: number) => void;
};

function StepControl({
  label,
  valueLabel,
  ariaLabel,
  canDecrease,
  canIncrease,
  onDecrease,
  onIncrease,
}: {
  label: string;
  valueLabel: string;
  ariaLabel: string;
  canDecrease: boolean;
  canIncrease: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex items-center gap-0.5 rounded-md border bg-background/90 p-0.5"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7"
        aria-label={`Diminuisci ${label}`}
        disabled={!canDecrease}
        onClick={onDecrease}
      >
        <Minus className="size-3.5" />
      </Button>
      <span className="min-w-13 px-1 text-center text-[11px] font-medium tabular-nums">
        {label}:{valueLabel}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7"
        aria-label={`Aumenta ${label}`}
        disabled={!canIncrease}
        onClick={onIncrease}
      >
        <Plus className="size-3.5" />
      </Button>
    </div>
  );
}

export function SankeyLayoutControls({
  columnGapY,
  columnGapX,
  onColumnGapYChange,
  onColumnGapXChange,
}: SankeyLayoutControlsProps) {
  const canDecreaseV = columnGapY > SANKEY_COLUMN_GAP_Y_MIN;
  const canIncreaseV = true;
  const canDecreaseH = columnGapX > SANKEY_COLUMN_GAP_X_MIN;
  const canIncreaseH = true;

  return (
    <div className="flex items-center gap-1">
      <StepControl
        label="V"
        valueLabel={String(columnGapY)}
        ariaLabel="Spaziatura verticale tra nodi in pixel"
        canDecrease={canDecreaseV}
        canIncrease={canIncreaseV}
        onDecrease={() =>
          onColumnGapYChange(
            clampColumnGapY(columnGapY - SANKEY_COLUMN_GAP_Y_STEP),
          )
        }
        onIncrease={() =>
          onColumnGapYChange(
            clampColumnGapY(columnGapY + SANKEY_COLUMN_GAP_Y_STEP),
          )
        }
      />
      <StepControl
        label="H"
        valueLabel={String(columnGapX)}
        ariaLabel="Spaziatura orizzontale tra colonne in pixel"
        canDecrease={canDecreaseH}
        canIncrease={canIncreaseH}
        onDecrease={() =>
          onColumnGapXChange(
            clampColumnGapX(columnGapX - SANKEY_COLUMN_GAP_X_STEP),
          )
        }
        onIncrease={() =>
          onColumnGapXChange(
            clampColumnGapX(columnGapX + SANKEY_COLUMN_GAP_X_STEP),
          )
        }
      />
    </div>
  );
}
