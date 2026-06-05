# Cashflow table sort & filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere ordinamento client-side e filtri colonna stile Excel (testo + checkbox) sulla tabella movimenti Cashflow, con totali filtrati separati dai totali periodo.

**Architecture:** Logica pura testabile in `lib/cashflow/table-filter.ts`; UI tabella con `@tanstack/react-table` v8 e componenti shadcn (`popover`, `checkbox`); estrazione da `movements-manager.tsx` in `MovementsTable` + colonne dedicate. Nessuna modifica a query server o `page.tsx`.

**Tech Stack:** Next.js 16, React 19, @tanstack/react-table v8, shadcn/ui (base-nova), Vitest, lucide-react.

**Spec:** [`docs/superpowers/specs/2026-06-05-cashflow-table-sort-filter-design.md`](../specs/2026-06-05-cashflow-table-sort-filter-design.md)

---

## File map

| File | Responsabilità |
|------|----------------|
| `package.json` | Dipendenza `@tanstack/react-table` |
| `components/ui/popover.tsx` | Aggiunto via shadcn CLI |
| `components/ui/checkbox.tsx` | Aggiunto via shadcn CLI |
| `lib/cashflow/table-filter.ts` | Tipo filtro, normalizzazione, `matchesFacetedFilter`, `summarizeMovements` |
| `lib/cashflow/table-filter.test.ts` | Unit test logica filtro e totali |
| `components/cashflow/column-faceted-filter.tsx` | Popover filtro Excel-style |
| `components/cashflow/movements-table-columns.tsx` | `ColumnDef<Movement>[]`, header sort/filter |
| `components/cashflow/movements-table.tsx` | `useReactTable`, totali filtrati, empty state, reset periodo |
| `components/cashflow/movements-manager.tsx` | Rimuove tabella inline; compone `MovementsTable` |
| `docs/MANUAL_TEST.md` | Checklist sort/filter |

---

### Task 1: Dipendenze e componenti shadcn

**Files:**
- Modify: `package.json`
- Create: `components/ui/popover.tsx` (via CLI)
- Create: `components/ui/checkbox.tsx` (via CLI)

- [ ] **Step 1: Installare TanStack Table**

Run:

```bash
npm install @tanstack/react-table
```

Expected: `package.json` e `package-lock.json` aggiornati con `@tanstack/react-table`.

- [ ] **Step 2: Aggiungere popover e checkbox**

Run:

```bash
npx shadcn@latest add popover checkbox
```

Expected: creati `components/ui/popover.tsx` e `components/ui/checkbox.tsx`.

- [ ] **Step 3: Verificare build**

Run: `npm run build`

Expected: PASS (nessun errore TypeScript).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json components/ui/popover.tsx components/ui/checkbox.tsx
git commit -m "chore: add tanstack table and shadcn popover/checkbox"
```

---

### Task 2: Utility filtro e totali (TDD)

**Files:**
- Create: `lib/cashflow/table-filter.ts`
- Create: `lib/cashflow/table-filter.test.ts`

- [ ] **Step 1: Scrivere i test (falliscono — modulo assente)**

Create `lib/cashflow/table-filter.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Movement } from "@/lib/cashflow/types";
import {
  hasActiveColumnFilters,
  isFacetedFilterActive,
  matchesFacetedFilter,
  normalizeCategoryDisplay,
  normalizeDescriptionDisplay,
  summarizeMovements,
  type FacetedColumnFilterValue,
} from "@/lib/cashflow/table-filter";

const movement = (overrides: Partial<Movement> = {}): Movement => ({
  id: "1",
  type: "expense",
  amount: 10,
  occurred_on: "2026-06-01",
  description: "",
  created_at: "2026-06-01T00:00:00Z",
  category_id: null,
  category_name: null,
  ...overrides,
});

describe("normalizeCategoryDisplay", () => {
  it("maps null to em dash", () => {
    expect(normalizeCategoryDisplay(null)).toBe("—");
  });

  it("keeps name", () => {
    expect(normalizeCategoryDisplay("Spesa")).toBe("Spesa");
  });
});

describe("normalizeDescriptionDisplay", () => {
  it("maps empty to em dash", () => {
    expect(normalizeDescriptionDisplay("   ")).toBe("—");
  });

  it("trims description", () => {
    expect(normalizeDescriptionDisplay(" bolletta ")).toBe("bolletta");
  });
});

describe("matchesFacetedFilter", () => {
  const normalize = normalizeCategoryDisplay;

  it("passes when filter inactive", () => {
    expect(matchesFacetedFilter("Spesa", undefined, normalize)).toBe(true);
    expect(
      matchesFacetedFilter("Spesa", { search: "", selectedValues: [] }, normalize),
    ).toBe(true);
  });

  it("filters by selected values", () => {
    const filter: FacetedColumnFilterValue = {
      search: "",
      selectedValues: ["Spesa"],
    };
    expect(matchesFacetedFilter("Spesa", filter, normalize)).toBe(true);
    expect(matchesFacetedFilter("Stipendio", filter, normalize)).toBe(false);
    expect(matchesFacetedFilter(null, { search: "", selectedValues: ["—"] }, normalize)).toBe(
      true,
    );
  });

  it("filters by search case-insensitive", () => {
    const filter: FacetedColumnFilterValue = {
      search: "bol",
      selectedValues: [],
    };
    expect(
      matchesFacetedFilter("Bolletta gas", filter, normalizeDescriptionDisplay),
    ).toBe(true);
    expect(
      matchesFacetedFilter("Affitto", filter, normalizeDescriptionDisplay),
    ).toBe(false);
  });

  it("applies AND between search and selected values", () => {
    const filter: FacetedColumnFilterValue = {
      search: "bol",
      selectedValues: ["Bolletta gas"],
    };
    expect(
      matchesFacetedFilter("Bolletta gas", filter, normalizeDescriptionDisplay),
    ).toBe(true);
    expect(
      matchesFacetedFilter("Bolletta luce", filter, normalizeDescriptionDisplay),
    ).toBe(false);
  });
});

describe("isFacetedFilterActive", () => {
  it("detects active search or selections", () => {
    expect(isFacetedFilterActive({ search: "x", selectedValues: [] })).toBe(true);
    expect(isFacetedFilterActive({ search: "", selectedValues: ["A"] })).toBe(true);
    expect(isFacetedFilterActive({ search: "", selectedValues: [] })).toBe(false);
    expect(isFacetedFilterActive(undefined)).toBe(false);
  });
});

describe("hasActiveColumnFilters", () => {
  it("returns true when any column filter is active", () => {
    expect(
      hasActiveColumnFilters([
        { id: "category_name", value: { search: "", selectedValues: ["Spesa"] } },
      ]),
    ).toBe(true);
    expect(hasActiveColumnFilters([])).toBe(false);
  });
});

describe("summarizeMovements", () => {
  it("sums income, expense and net", () => {
    const result = summarizeMovements([
      movement({ type: "income", amount: 100 }),
      movement({ id: "2", type: "expense", amount: 40 }),
      movement({ id: "3", type: "expense", amount: 10 }),
    ]);
    expect(result).toEqual({
      totalIncome: 100,
      totalExpense: 50,
      net: 50,
    });
  });

  it("returns zeros for empty list", () => {
    expect(summarizeMovements([])).toEqual({
      totalIncome: 0,
      totalExpense: 0,
      net: 0,
    });
  });
});
```

- [ ] **Step 2: Eseguire test — devono fallire**

Run: `npm run test -- lib/cashflow/table-filter.test.ts`

Expected: FAIL — modulo `@/lib/cashflow/table-filter` non trovato.

- [ ] **Step 3: Implementare `table-filter.ts`**

Create `lib/cashflow/table-filter.ts`:

```ts
import type { ColumnFiltersState } from "@tanstack/react-table";
import type { Movement, MonthSummary } from "@/lib/cashflow/types";

export type FacetedColumnFilterValue = {
  search: string;
  selectedValues: string[];
};

export function normalizeCategoryDisplay(
  value: string | null | undefined,
): string {
  return value ?? "—";
}

export function normalizeDescriptionDisplay(
  value: string | null | undefined,
): string {
  return value?.trim() ? value.trim() : "—";
}

export function isFacetedFilterActive(
  value: FacetedColumnFilterValue | undefined,
): boolean {
  if (!value) {
    return false;
  }
  return value.search.trim().length > 0 || value.selectedValues.length > 0;
}

export function matchesFacetedFilter(
  rawValue: string | null | undefined,
  filterValue: FacetedColumnFilterValue | undefined,
  normalize: (value: string | null | undefined) => string,
): boolean {
  if (!isFacetedFilterActive(filterValue)) {
    return true;
  }

  const display = normalize(rawValue);
  const { search, selectedValues } = filterValue!;

  if (selectedValues.length > 0 && !selectedValues.includes(display)) {
    return false;
  }

  const query = search.trim().toLowerCase();
  if (query && !display.toLowerCase().includes(query)) {
    return false;
  }

  return true;
}

export function hasActiveColumnFilters(
  columnFilters: ColumnFiltersState,
): boolean {
  return columnFilters.some((filter) =>
    isFacetedFilterActive(filter.value as FacetedColumnFilterValue),
  );
}

export function summarizeMovements(movements: Movement[]): MonthSummary {
  const totalIncome = movements
    .filter((movement) => movement.type === "income")
    .reduce((sum, movement) => sum + movement.amount, 0);

  const totalExpense = movements
    .filter((movement) => movement.type === "expense")
    .reduce((sum, movement) => sum + movement.amount, 0);

  return {
    totalIncome,
    totalExpense,
    net: totalIncome - totalExpense,
  };
}
```

- [ ] **Step 4: Eseguire test — devono passare**

Run: `npm run test -- lib/cashflow/table-filter.test.ts`

Expected: PASS (tutti i test verdi).

- [ ] **Step 5: Commit**

```bash
git add lib/cashflow/table-filter.ts lib/cashflow/table-filter.test.ts
git commit -m "feat(cashflow): add table filter utilities with tests"
```

---

### Task 3: Popover filtro colonna

**Files:**
- Create: `components/cashflow/column-faceted-filter.tsx`

- [ ] **Step 1: Creare `column-faceted-filter.tsx`**

Create `components/cashflow/column-faceted-filter.tsx`:

```tsx
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
      search: "",
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
      setSearch(getFilterValue(column as Column<unknown, unknown>).search);
    }
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    const current = getFilterValue(column as Column<unknown, unknown>);
    commit({ ...current, search: value });
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
```

> **Nota implementatore:** se `PopoverTrigger` o `Checkbox` generati da shadcn usano API leggermente diverse (es. `asChild` invece di `render`), adatta solo il wiring mantenendo il comportamento descritto nella spec.

- [ ] **Step 2: Verificare build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/cashflow/column-faceted-filter.tsx
git commit -m "feat(cashflow): add faceted column filter popover"
```

---

### Task 4: Definizioni colonne

**Files:**
- Create: `components/cashflow/movements-table-columns.tsx`

- [ ] **Step 1: Creare `movements-table-columns.tsx`**

Create `components/cashflow/movements-table-columns.tsx`:

```tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  MoreHorizontalIcon,
} from "lucide-react";
import { ColumnFacetedFilter } from "@/components/cashflow/column-faceted-filter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  formatOccurredOn,
  formatSignedAmount,
} from "@/lib/cashflow/format";
import {
  matchesFacetedFilter,
  normalizeCategoryDisplay,
  normalizeDescriptionDisplay,
  type FacetedColumnFilterValue,
} from "@/lib/cashflow/table-filter";
import type { Movement } from "@/lib/cashflow/types";
import { cn } from "@/lib/utils";

type MovementColumnActions = {
  pending: boolean;
  onEdit: (movement: Movement) => void;
  onDelete: (movement: Movement) => void;
};

function SortableHeader({
  label,
  onClick,
  sorted,
}: {
  label: string;
  onClick: () => void;
  sorted: false | "asc" | "desc";
}) {
  const Icon =
    sorted === "asc"
      ? ArrowUpIcon
      : sorted === "desc"
        ? ArrowDownIcon
        : ArrowUpDownIcon;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-2 h-8"
      onClick={onClick}
    >
      {label}
      <Icon className="ml-1 size-3.5" />
    </Button>
  );
}

export function createMovementColumns({
  pending,
  onEdit,
  onDelete,
}: MovementColumnActions): ColumnDef<Movement>[] {
  return [
    {
      accessorKey: "occurred_on",
      header: ({ column }) => (
        <SortableHeader
          label="Data"
          sorted={column.getIsSorted()}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        />
      ),
      cell: ({ row }) => (
        <span className="whitespace-nowrap">
          {formatOccurredOn(row.original.occurred_on)}
        </span>
      ),
    },
    {
      accessorKey: "category_name",
      accessorFn: (row) => normalizeCategoryDisplay(row.category_name),
      header: ({ column }) => (
        <div className="flex items-center gap-1">
          <SortableHeader
            label="Categoria"
            sorted={column.getIsSorted()}
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
          <ColumnFacetedFilter column={column} title="categoria" />
        </div>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {normalizeCategoryDisplay(row.original.category_name)}
        </span>
      ),
      sortingFn: (rowA, rowB, columnId) => {
        const a = String(rowA.getValue(columnId));
        const b = String(rowB.getValue(columnId));
        return a.localeCompare(b, "it");
      },
      filterFn: (row, columnId, filterValue) =>
        matchesFacetedFilter(
          row.original.category_name,
          filterValue as FacetedColumnFilterValue,
          normalizeCategoryDisplay,
        ),
    },
    {
      accessorKey: "description",
      accessorFn: (row) => normalizeDescriptionDisplay(row.description),
      header: ({ column }) => (
        <div className="flex items-center gap-1">
          <SortableHeader
            label="Descrizione"
            sorted={column.getIsSorted()}
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
          <ColumnFacetedFilter column={column} title="descrizione" />
        </div>
      ),
      cell: ({ row }) => (
        <span className="max-w-xs truncate font-medium">
          {normalizeDescriptionDisplay(row.original.description)}
        </span>
      ),
      sortingFn: (rowA, rowB, columnId) => {
        const a = String(rowA.getValue(columnId));
        const b = String(rowB.getValue(columnId));
        return a.localeCompare(b, "it");
      },
      filterFn: (row, columnId, filterValue) =>
        matchesFacetedFilter(
          row.original.description,
          filterValue as FacetedColumnFilterValue,
          normalizeDescriptionDisplay,
        ),
    },
    {
      accessorKey: "amount",
      header: ({ column }) => (
        <div className="flex justify-end">
          <SortableHeader
            label="Importo"
            sorted={column.getIsSorted()}
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        </div>
      ),
      cell: ({ row }) => (
        <span
          className={cn(
            "text-right font-medium whitespace-nowrap",
            row.original.type === "income"
              ? "text-emerald-600 dark:text-emerald-500"
              : "text-destructive",
          )}
        >
          {formatSignedAmount(row.original.type, row.original.amount)}
        </span>
      ),
    },
    {
      id: "actions",
      enableSorting: false,
      enableColumnFilter: false,
      header: () => <span className="sr-only">Azioni</span>,
      cell: ({ row }) => (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={pending}
                  aria-label="Azioni movimento"
                />
              }
            >
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(row.original)}>
                Modifica
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(row.original)}
              >
                Elimina
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];
}
```

- [ ] **Step 2: Verificare build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/cashflow/movements-table-columns.tsx
git commit -m "feat(cashflow): add tanstack column definitions for movements"
```

---

### Task 5: Componente `MovementsTable`

**Files:**
- Create: `components/cashflow/movements-table.tsx`

- [ ] **Step 1: Creare `movements-table.tsx`**

Create `components/cashflow/movements-table.tsx`:

```tsx
"use client";

import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import { createMovementColumns } from "@/components/cashflow/movements-table-columns";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatEuro } from "@/lib/cashflow/format";
import {
  hasActiveColumnFilters,
  summarizeMovements,
} from "@/lib/cashflow/table-filter";
import type { Movement } from "@/lib/cashflow/types";
import { cn } from "@/lib/utils";

const DEFAULT_SORTING: SortingState = [{ id: "occurred_on", desc: true }];

type MovementsTableProps = {
  movements: Movement[];
  from: string;
  to: string;
  pending: boolean;
  onEdit: (movement: Movement) => void;
  onDelete: (movement: Movement) => void;
  onCreate: () => void;
};

export function MovementsTable({
  movements,
  from,
  to,
  pending,
  onEdit,
  onDelete,
  onCreate,
}: MovementsTableProps) {
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  useEffect(() => {
    setSorting(DEFAULT_SORTING);
    setColumnFilters([]);
  }, [from, to]);

  const columns = useMemo(
    () => createMovementColumns({ pending, onEdit, onDelete }),
    [pending, onEdit, onDelete],
  );

  const table = useReactTable({
    data: movements,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    enableSortingRemoval: true,
  });

  const filteredMovements = useMemo(
    () => table.getFilteredRowModel().rows.map((row) => row.original),
    [table, sorting, columnFilters, movements],
  );

  const filteredSummary = useMemo(
    () => summarizeMovements(filteredMovements),
    [filteredMovements],
  );

  const filtersActive = hasActiveColumnFilters(columnFilters);
  const rows = table.getRowModel().rows;
  const periodEmpty = movements.length === 0;
  const filterEmpty = !periodEmpty && rows.length === 0;

  function clearAllFilters() {
    setColumnFilters([]);
  }

  return (
    <div className="space-y-4">
      {filtersActive ? (
        <div className="rounded-lg border border-dashed bg-muted/20 p-4">
          <p className="text-sm font-medium">Totali filtrati</p>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Entrate</p>
              <p className="font-semibold text-emerald-600 dark:text-emerald-500">
                {formatEuro(filteredSummary.totalIncome)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Uscite</p>
              <p className="font-semibold">
                {formatEuro(filteredSummary.totalExpense)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Netto</p>
              <p
                className={cn(
                  "font-semibold",
                  filteredSummary.net >= 0
                    ? "text-emerald-600 dark:text-emerald-500"
                    : "text-destructive",
                )}
              >
                {formatEuro(filteredSummary.net)}
              </p>
              <p className="text-xs text-muted-foreground">entrate − uscite</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      header.column.id === "amount" && "text-right",
                      header.column.id === "actions" && "w-12 text-right",
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {periodEmpty ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="space-y-3 py-8 text-center text-muted-foreground"
                >
                  <p>Nessun movimento nel periodo selezionato.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onCreate}
                  >
                    Aggiungi movimento
                  </Button>
                </TableCell>
              </TableRow>
            ) : filterEmpty ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="space-y-3 py-8 text-center text-muted-foreground"
                >
                  <p>Nessun movimento corrisponde ai filtri.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearAllFilters}
                  >
                    Cancella filtri
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        cell.column.id === "amount" && "text-right",
                        cell.column.id === "actions" && "text-right",
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificare build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/cashflow/movements-table.tsx
git commit -m "feat(cashflow): add movements table with sort and filter"
```

---

### Task 6: Integrazione in `MovementsManager`

**Files:**
- Modify: `components/cashflow/movements-manager.tsx`

- [ ] **Step 1: Sostituire tabella inline con `MovementsTable`**

In `components/cashflow/movements-manager.tsx`:

1. Rimuovi import non più usati: `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow`, `formatOccurredOn`, `formatSignedAmount`, `MoreHorizontalIcon`, `DropdownMenu*`.
2. Aggiungi import:

```tsx
import { MovementsTable } from "@/components/cashflow/movements-table";
```

3. Sostituisci l’intero blocco `<div className="overflow-x-auto rounded-lg border">…</div>` (righe ~359–438) con:

```tsx
      <MovementsTable
        movements={movements}
        from={from}
        to={to}
        pending={pending}
        onEdit={openEditDialog}
        onDelete={setMovementToDelete}
        onCreate={openCreateDialog}
      />
```

- [ ] **Step 2: Verificare lint e build**

Run: `npm run lint && npm run build`

Expected: PASS, nessun import inutilizzato.

- [ ] **Step 3: Commit**

```bash
git add components/cashflow/movements-manager.tsx
git commit -m "feat(cashflow): wire movements table sort and filter into manager"
```

---

### Task 7: Checklist test manuali

**Files:**
- Modify: `docs/MANUAL_TEST.md`

- [ ] **Step 1: Aggiungere sezione sort/filter sotto Cashflow**

In `docs/MANUAL_TEST.md`, dopo la voce «Movimento con/senza categoria», aggiungi:

```markdown
- [ ] Tabella: ordine default per data discendente (più recenti in cima).
- [ ] Tabella: click header Data / Categoria / Descrizione / Importo → ordinamento asc/desc.
- [ ] Filtro categoria: checkbox multipla → sole righe selezionate; icona filtro attiva.
- [ ] Filtro descrizione: testo libero «bol» → righe che contengono il testo.
- [ ] Filtro: testo + checkbox insieme → logica AND.
- [ ] Con filtro attivo → totali periodo invariati; compare riga «Totali filtrati» corretta.
- [ ] Filtro che esclude tutto → «Nessun movimento corrisponde ai filtri» + «Cancella filtri».
- [ ] Cambio periodo (‹ › o click mese) → filtri e ordinamento resettati.
```

- [ ] **Step 2: Commit**

```bash
git add docs/MANUAL_TEST.md
git commit -m "docs: add cashflow table sort/filter manual tests"
```

---

### Task 8: Verifica finale

- [ ] **Step 1: Eseguire tutti i test**

Run: `npm run test`

Expected: PASS (inclusi `date-range` e `table-filter`).

- [ ] **Step 2: Build produzione**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 3: Smoke test manuale rapido**

1. `npm run dev` → `/cashflow`
2. Verifica sort default e filtro categoria
3. Verifica totali filtrati vs totali periodo

---

## Self-review (spec coverage)

| Requisito spec | Task |
|----------------|------|
| R1 Ordinamento client-side, default data desc | Task 4, 5 |
| R2 Filtro Excel categoria/descrizione | Task 2, 3, 4 |
| R3 AND testo + checkbox | Task 2 (`matchesFacetedFilter`) |
| R4 Totali periodo invariati | Task 6 (summary server non toccato) |
| R5 Totali filtrati | Task 5 |
| R6 Reset su cambio periodo | Task 5 (`useEffect` on `from`/`to`) |
| R7 Icona filtro attiva + cancella | Task 3 |
| R8 Empty state filtri | Task 5 |

Nessun placeholder. Tipi `FacetedColumnFilterValue` definiti in Task 2 e riusati coerentemente in Task 3–5.
