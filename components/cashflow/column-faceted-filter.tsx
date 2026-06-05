"use client";

import type { Column } from "@tanstack/react-table";
import { ListFilterIcon } from "lucide-react";
import { useMemo, useState } from "react";
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
  type FacetedColumnFilterValue,
  isFacetedFilterActive,
} from "@/lib/cashflow/table-filter";
import { cn } from "@/lib/utils";

type ColumnFacetedFilterProps<TData, TValue> = {
  column: Column<TData, TValue>;
  title: string;
};

function getFilterValue(
  column: Column<unknown, unknown>,
): FacetedColumnFilterValue {
  return (
    (column.getFilterValue() as FacetedColumnFilterValue | undefined) ?? {
      selectedValues: [],
    }
  );
}

export function ColumnFacetedFilter<TData, TValue>({
  column,
  title,
}: ColumnFacetedFilterProps<TData, TValue>) {
  const facets = column.getFacetedUniqueValues();
  const active = isFacetedFilterActive(
    column.getFilterValue() as FacetedColumnFilterValue | undefined,
  );
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const options = useMemo(() => {
    return Array.from(facets.keys())
      .map((value) => String(value ?? "—"))
      .sort((a, b) => a.localeCompare(b, "it"));
  }, [facets]);

  const visibleOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return options;
    }
    return options.filter((option) => option.toLowerCase().includes(query));
  }, [options, search]);

  function commit(next: FacetedColumnFilterValue) {
    if (!isFacetedFilterActive(next)) {
      column.setFilterValue(undefined);
      return;
    }
    column.setFilterValue(next);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setSearch("");
    }
  }

  function handleSearchChange(value: string) {
    setSearch(value);
  }

  function toggleValue(option: string, checked: boolean) {
    const current = getFilterValue(column as Column<unknown, unknown>);
    const selectedValues = checked
      ? [...current.selectedValues, option]
      : current.selectedValues.filter((value) => value !== option);
    commit({ ...current, selectedValues });
  }

  function toggleAllVisible(checked: boolean) {
    const current = getFilterValue(column as Column<unknown, unknown>);
    if (!checked) {
      const nextSelected = current.selectedValues.filter(
        (value) => !visibleOptions.includes(value),
      );
      commit({ ...current, selectedValues: nextSelected });
      return;
    }

    const merged = new Set([...current.selectedValues, ...visibleOptions]);
    commit({ ...current, selectedValues: Array.from(merged) });
  }

  function clearFilter() {
    setSearch("");
    column.setFilterValue(undefined);
    setOpen(false);
  }

  const current = getFilterValue(column as Column<unknown, unknown>);
  const allVisibleSelected =
    visibleOptions.length > 0 &&
    visibleOptions.every((option) => current.selectedValues.includes(option));

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Filtra ${title}`}
            className={cn(active && "bg-muted text-foreground")}
          />
        }
      >
        <ListFilterIcon />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 space-y-3 p-3">
        <div className="space-y-2">
          <Label htmlFor={`filter-search-${column.id}`} className="text-xs">
            Cerca in {title}
          </Label>
          <Input
            id={`filter-search-${column.id}`}
            placeholder="Cerca…"
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
          />
        </div>

        <div className="max-h-48 space-y-2 overflow-y-auto">
          {visibleOptions.length > 0 ? (
            <div className="flex items-center gap-2">
              <Checkbox
                id={`filter-all-${column.id}`}
                checked={allVisibleSelected}
                onCheckedChange={(checked) => toggleAllVisible(checked === true)}
              />
              <Label
                htmlFor={`filter-all-${column.id}`}
                className="text-sm font-normal"
              >
                Seleziona tutto
              </Label>
            </div>
          ) : null}

          {visibleOptions.map((option) => {
            const optionId = `filter-${column.id}-${option}`;
            return (
              <div key={option} className="flex items-center gap-2">
                <Checkbox
                  id={optionId}
                  checked={current.selectedValues.includes(option)}
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

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={clearFilter}
        >
          Cancella filtro
        </Button>
      </PopoverContent>
    </Popover>
  );
}
