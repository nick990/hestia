"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  clampColumnGapX,
  clampColumnGapY,
  SANKEY_COLUMN_GAP_X_MIN,
  SANKEY_COLUMN_GAP_X_STEP,
  SANKEY_COLUMN_GAP_Y_MIN,
  SANKEY_COLUMN_GAP_Y_STEP,
} from "@/lib/cashflow/sankey-layout-config";
import { type SankeyLinkPathMode } from "@/lib/cashflow/sankey-link-path";
import { cn } from "@/lib/utils";

const LINK_PATH_OPTIONS: Array<{
  value: SankeyLinkPathMode;
  label: string;
}> = [
  { value: "curved", label: "Curvo" },
  { value: "straight", label: "Dritto" },
];

type SankeyLayoutControlsProps = {
  columnGapY: number;
  columnGapX: number;
  linkPathMode: SankeyLinkPathMode;
  onColumnGapYChange: (value: number) => void;
  onColumnGapXChange: (value: number) => void;
  onLinkPathModeChange: (value: SankeyLinkPathMode) => void;
};

function EditableValueControl({
  label,
  value,
  min,
  step,
  ariaLabel,
  clamp,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  step: number;
  ariaLabel: string;
  clamp: (value: number) => number;
  onChange: (value: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  function handleChange(next: string) {
    setDraft(next);
    const parsed = Number.parseInt(next, 10);
    if (!Number.isNaN(parsed)) {
      onChange(clamp(parsed));
    }
  }

  function handleBlur() {
    const parsed = Number.parseInt(draft, 10);
    if (Number.isNaN(parsed)) {
      setDraft(String(value));
    } else {
      const clamped = clamp(parsed);
      onChange(clamped);
      setDraft(String(clamped));
    }
    setIsEditing(false);
  }

  return (
    <label
      aria-label={ariaLabel}
      className="flex items-center gap-1 rounded-md border bg-background/90 px-1.5 py-0.5"
    >
      <span className="text-[11px] font-medium text-muted-foreground">
        {label}:
      </span>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        step={step}
        value={isEditing ? draft : String(value)}
        aria-label={`${label} in pixel`}
        className={cn(
          "h-7 w-11 rounded-sm border border-transparent bg-transparent",
          "text-center text-[11px] font-medium tabular-nums",
          "focus:border-ring focus:bg-background focus:outline-none",
        )}
        onFocus={() => {
          setDraft(String(value));
          setIsEditing(true);
        }}
        onChange={(event) => handleChange(event.target.value)}
        onBlur={handleBlur}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            handleBlur();
            event.currentTarget.blur();
          }
          if (event.key === "Escape") {
            setDraft(String(value));
            setIsEditing(false);
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}

export function SankeyLayoutControls({
  columnGapY,
  columnGapX,
  linkPathMode,
  onColumnGapYChange,
  onColumnGapXChange,
  onLinkPathModeChange,
}: SankeyLayoutControlsProps) {
  return (
    <div className="flex items-center gap-1">
      <div
        role="radiogroup"
        aria-label="Forma flussi Sankey"
        className="flex items-center rounded-md border bg-background/90 p-0.5"
      >
        {LINK_PATH_OPTIONS.map((option) => {
          const selected = linkPathMode === option.value;
          return (
            <Button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              variant={selected ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                "h-7 px-2 text-[11px] shadow-none",
                !selected && "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => onLinkPathModeChange(option.value)}
            >
              {option.label}
            </Button>
          );
        })}
      </div>
      <EditableValueControl
        label="V"
        value={columnGapY}
        min={SANKEY_COLUMN_GAP_Y_MIN}
        step={SANKEY_COLUMN_GAP_Y_STEP}
        ariaLabel="Spaziatura verticale tra nodi in pixel"
        clamp={clampColumnGapY}
        onChange={onColumnGapYChange}
      />
      <EditableValueControl
        label="H"
        value={columnGapX}
        min={SANKEY_COLUMN_GAP_X_MIN}
        step={SANKEY_COLUMN_GAP_X_STEP}
        ariaLabel="Spaziatura orizzontale tra colonne in pixel"
        clamp={clampColumnGapX}
        onChange={onColumnGapXChange}
      />
    </div>
  );
}
