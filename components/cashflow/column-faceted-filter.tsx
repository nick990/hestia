"use client";

import { useFacetedFilterOpen } from "@/components/cashflow/faceted-filter-open-context";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import type { Column } from "@tanstack/react-table";
import { ListFilterIcon } from "lucide-react";
import { useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  facetedFilterFromSelection,
  initialFacetedSelection,
  isFacetedFilterActive,
  type FacetedColumnFilterValue,
} from "@/lib/cashflow/table-filter";
import { cn } from "@/lib/utils";

type ColumnFacetedFilterProps<TData, TValue> = {
  column: Column<TData, TValue>;
  title: string;
};

function getCommittedValue(
  column: Column<unknown, unknown>,
): FacetedColumnFilterValue | undefined {
  return column.getFilterValue() as FacetedColumnFilterValue | undefined;
}

export function ColumnFacetedFilter<TData, TValue>({
  column,
  title,
}: ColumnFacetedFilterProps<TData, TValue>) {
  const {
    openColumnId,
    setOpenForColumn,
    closeAll,
    getSearch,
    setSearchForColumn,
    clearSearchForColumn,
    getPendingSelection,
    setPendingSelection,
    clearPendingSelection,
    setBaselineForColumn,
    clearBaselineForColumn,
    applyFacetedFilter,
  } = useFacetedFilterOpen();

  const skipDismissOnCloseRef = useRef(false);
  const columnId = column.id;
  const open = openColumnId === columnId;
  const search = getSearch(columnId);

  const committed = getCommittedValue(column as Column<unknown, unknown>);
  const active = isFacetedFilterActive(committed);

  const facets = column.getFacetedUniqueValues();
  const options = useMemo(() => {
    return Array.from(facets.keys())
      .map((value) => String(value ?? "—"))
      .sort((a, b) => a.localeCompare(b, "it"));
  }, [facets]);

  const selectedValues =
    open && getPendingSelection(columnId) != null
      ? getPendingSelection(columnId)!
      : initialFacetedSelection(committed, options);

  const visibleOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return options;
    }
    return options.filter((option) => option.toLowerCase().includes(query));
  }, [options, search]);

  function endSession() {
    clearSearchForColumn(columnId);
    clearPendingSelection(columnId);
    clearBaselineForColumn(columnId);
  }

  function openWithExcelDefaults() {
    const initial = initialFacetedSelection(committed, options);
    setPendingSelection(columnId, initial);
    setBaselineForColumn(columnId, [...initial]);
    clearSearchForColumn(columnId);
    setOpenForColumn(columnId, true);
  }

  function handleOpenChange(
    nextOpen: boolean,
    eventDetails?: PopoverPrimitive.Root.ChangeEventDetails,
  ) {
    if (!nextOpen && eventDetails?.reason === "focus-out") {
      eventDetails.cancel();
      return;
    }

    if (nextOpen) {
      openWithExcelDefaults();
      return;
    }

    if (skipDismissOnCloseRef.current) {
      skipDismissOnCloseRef.current = false;
      endSession();
      return;
    }

    endSession();
    closeAll();
  }

  function setSelection(nextValues: string[]) {
    setPendingSelection(columnId, nextValues);
  }

  function toggleValue(option: string, checked: boolean) {
    const next = checked
      ? [...selectedValues, option]
      : selectedValues.filter((value) => value !== option);
    setSelection(next);
  }

  function toggleAllVisible(checked: boolean) {
    if (!checked) {
      setSelection(
        selectedValues.filter((value) => !visibleOptions.includes(value)),
      );
      return;
    }
    const merged = new Set([...selectedValues, ...visibleOptions]);
    setSelection(Array.from(merged));
  }

  function handleOk() {
    const value = facetedFilterFromSelection(selectedValues, options);
    applyFacetedFilter(columnId, value);
    skipDismissOnCloseRef.current = true;
    closeAll();
    endSession();
  }

  function handleAnnulla() {
    closeAll();
    endSession();
  }

  const allVisibleSelected =
    visibleOptions.length > 0 &&
    visibleOptions.every((option) => selectedValues.includes(option));

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={`Filtra ${title}`}
            aria-expanded={open}
            className={cn(active && "bg-muted text-foreground")}
          />
        }
      >
        <ListFilterIcon />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-64 space-y-3 p-3"
        initialFocus={false}
        finalFocus={false}
      >
        <div className="space-y-2">
          <Label htmlFor={`filter-search-${columnId}`} className="text-xs">
            Cerca in {title}
          </Label>
          <Input
            id={`filter-search-${columnId}`}
            placeholder="Cerca…"
            value={search}
            onChange={(event) =>
              setSearchForColumn(columnId, event.target.value)
            }
          />
        </div>

        <div className="max-h-48 space-y-2 overflow-y-auto">
          {visibleOptions.length > 0 ? (
            <div
              className="flex items-center gap-2"
              onMouseDown={(event) => event.preventDefault()}
            >
              <Checkbox
                id={`filter-all-${columnId}`}
                checked={allVisibleSelected}
                onCheckedChange={(checked) =>
                  toggleAllVisible(checked === true)
                }
              />
              <Label
                htmlFor={`filter-all-${columnId}`}
                className="text-sm font-normal"
              >
                Seleziona tutto
              </Label>
            </div>
          ) : null}

          {visibleOptions.map((option) => {
            const optionId = `filter-${columnId}-${option}`;
            return (
              <div
                key={option}
                className="flex items-center gap-2"
                onMouseDown={(event) => event.preventDefault()}
              >
                <Checkbox
                  id={optionId}
                  checked={selectedValues.includes(option)}
                  onCheckedChange={(checked) =>
                    toggleValue(option, checked === true)
                  }
                />
                <Label htmlFor={optionId} className="truncate text-sm font-normal">
                  {option}
                </Label>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleAnnulla}
          >
            Annulla
          </Button>
          <Button type="button" size="sm" className="flex-1" onClick={handleOk}>
            OK
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
