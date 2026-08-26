"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  MoreHorizontalIcon,
} from "lucide-react";
import { ColumnFacetedFilter } from "@/components/cashflow/column-faceted-filter";
import { Badge } from "@/components/ui/badge";
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
  hasFamily: boolean;
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
  hasFamily,
  onEdit,
  onDelete,
}: MovementColumnActions): ColumnDef<Movement>[] {
  const columns: ColumnDef<Movement>[] = [
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
      filterFn: (row, _columnId, filterValue) =>
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
          {row.original.is_private ? (
            <Badge variant="secondary" className="ml-2 align-middle">
              Privato
            </Badge>
          ) : null}
        </span>
      ),
      sortingFn: (rowA, rowB, columnId) => {
        const a = String(rowA.getValue(columnId));
        const b = String(rowB.getValue(columnId));
        return a.localeCompare(b, "it");
      },
      filterFn: (row, _columnId, filterValue) =>
        matchesFacetedFilter(
          row.original.description,
          filterValue as FacetedColumnFilterValue,
          normalizeDescriptionDisplay,
        ),
    },
  ];

  if (hasFamily) {
    columns.push(
      {
        accessorKey: "assignee_name",
        header: "Assegnatario",
        enableSorting: false,
        enableColumnFilter: false,
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap">
            {row.original.assignee_name ?? "—"}
          </span>
        ),
      },
    );
  }

  columns.push(
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
            row.original.type === "income" ? "text-income" : "text-destructive",
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
  );

  return columns;
}
