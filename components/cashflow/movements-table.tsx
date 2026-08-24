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
import type { FilterSummaryState } from "@/components/cashflow/period-summary-cards";
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
  hasFamily: boolean;
  pending: boolean;
  onEdit: (movement: Movement) => void;
  onDelete: (movement: Movement) => void;
  onCreate: () => void;
  onFilterSummaryChange: (state: FilterSummaryState) => void;
  onFilteredMovementsChange: (movements: Movement[]) => void;
};

export function MovementsTable({
  movements,
  from,
  to,
  hasFamily,
  pending,
  onEdit,
  onDelete,
  onCreate,
  onFilterSummaryChange,
  onFilteredMovementsChange,
}: MovementsTableProps) {
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  useEffect(() => {
    setSorting(DEFAULT_SORTING);
    setColumnFilters([]);
  }, [from, to]);

  const columns = useMemo(
    () =>
      createMovementColumns({
        pending,
        hasFamily,
        onEdit,
        onDelete,
      }),
    [pending, hasFamily, onEdit, onDelete],
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

  const filtersActive = hasActiveColumnFilters(columnFilters);
  const rows = table.getRowModel().rows;
  const periodEmpty = movements.length === 0;
  const filterEmpty = !periodEmpty && rows.length === 0;

  useEffect(() => {
    const summary = summarizeMovements(
      table.getFilteredRowModel().rows.map((row) => row.original),
    );
    onFilterSummaryChange({
      active: filtersActive,
      summary,
    });
  }, [filtersActive, columnFilters, sorting, movements, table, onFilterSummaryChange]);

  useEffect(() => {
    onFilteredMovementsChange(
      table.getFilteredRowModel().rows.map((row) => row.original),
    );
  }, [
    columnFilters,
    sorting,
    movements,
    table,
    onFilteredMovementsChange,
  ]);

  function clearAllFilters() {
    setColumnFilters([]);
  }

  return (
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
  );
}
