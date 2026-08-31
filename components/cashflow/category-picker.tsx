"use client";

import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useMinMd } from "@/hooks/use-min-md";
import {
  buildCategoryGroups,
  categoryTriggerLabel,
  filterCategoryGroups,
  selectedGroupRoot,
  showNoneOption,
  type CategoryChildRow,
  type CategoryGroup,
} from "@/lib/categories/tree";
import type { MovementCategoryOption } from "@/lib/categories/types";
import { cn } from "@/lib/utils";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { useMemo, useState } from "react";

const triggerClassName =
  "flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

const panelCollisionAvoidance = {
  side: "none",
  align: "none",
  fallbackAxisSide: "none",
} as const;

type CategoryPickerProps = {
  id?: string;
  categories: MovementCategoryOption[];
  value: string;
  onChange: (value: string) => void;
};

type VisibleRow =
  | { key: string; kind: "none" }
  | {
      key: string;
      kind: "group";
      group: CategoryGroup;
      expandable: boolean;
      open: boolean;
    }
  | { key: string; kind: "child"; child: CategoryChildRow }
  | { key: string; kind: "empty" };

export function CategoryPicker({
  id,
  categories,
  value,
  onChange,
}: CategoryPickerProps) {
  const minMd = useMinMd();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [expandedBeforeSearch, setExpandedBeforeSearch] =
    useState<Set<string> | null>(null);

  const groups = useMemo(
    () => buildCategoryGroups(categories),
    [categories],
  );
  const visibleGroups = useMemo(
    () => filterCategoryGroups(groups, query),
    [groups, query],
  );
  const noneVisible = showNoneOption(query);
  const isSearching = query.trim().length > 0;
  const empty = !noneVisible && visibleGroups.length === 0;
  const label = categoryTriggerLabel(categories, value);

  function handleOpenChange(next: boolean) {
    if (next) {
      setQuery("");
      setExpandedBeforeSearch(null);
      const root = selectedGroupRoot(categories, value);
      setExpanded(root ? new Set([root]) : new Set());
    }

    setOpen(next);
  }

  function handleQueryChange(next: string) {
    const wasSearching = query.trim().length > 0;
    const nowSearching = next.trim().length > 0;

    if (!wasSearching && nowSearching) {
      setExpandedBeforeSearch(new Set(expanded));
    }

    if (wasSearching && !nowSearching) {
      setExpanded(expandedBeforeSearch ?? new Set());
      setExpandedBeforeSearch(null);
    }

    setQuery(next);
  }

  function selectValue(next: string) {
    onChange(next);
    handleOpenChange(false);
  }

  function toggleGroup(root: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(root)) {
        next.delete(root);
      } else {
        next.add(root);
      }
      return next;
    });
  }

  const trigger = (
    <button
      type="button"
      id={id}
      aria-haspopup="dialog"
      aria-expanded={open}
      className={triggerClassName}
    />
  );

  const triggerLabel = (
    <>
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      <ChevronDownIcon className="size-4 text-muted-foreground" />
    </>
  );

  const panel = (
    <CategoryPickerPanel
      autoFocusSearch={minMd}
      empty={empty}
      isSearching={isSearching}
      noneVisible={noneVisible}
      query={query}
      value={value}
      visibleGroups={visibleGroups}
      expanded={expanded}
      onQueryChange={handleQueryChange}
      onSelect={selectValue}
      onToggleGroup={toggleGroup}
    />
  );

  if (minMd) {
    return (
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger render={trigger}>{triggerLabel}</PopoverTrigger>
        <PopoverContent
          align="start"
          collisionAvoidance={panelCollisionAvoidance}
          className="h-72 w-80 max-w-[calc(100vw-2rem)] gap-0 p-1.5"
        >
          {panel}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger render={trigger}>{triggerLabel}</SheetTrigger>
      <SheetContent
        side="bottom"
        initialFocus={false}
        className="z-60 h-[min(28rem,70dvh)] gap-0 data-[side=bottom]:h-[min(28rem,70dvh)]"
      >
        <SheetHeader className="px-3 py-2">
          <SheetTitle>Categoria</SheetTitle>
        </SheetHeader>
        <div className="min-h-0 flex-1 px-3 pb-3">{panel}</div>
      </SheetContent>
    </Sheet>
  );
}

function buildVisibleRows(
  noneVisible: boolean,
  visibleGroups: CategoryGroup[],
  isSearching: boolean,
  expanded: Set<string>,
  empty: boolean,
): VisibleRow[] {
  const rows: VisibleRow[] = [];

  if (noneVisible) {
    rows.push({ key: "none", kind: "none" });
  }

  for (const group of visibleGroups) {
    const expandable = group.children.length > 0;
    const open = expandable && (isSearching || expanded.has(group.root));
    rows.push({
      key: `group-${group.root}`,
      kind: "group",
      group,
      expandable,
      open,
    });

    if (open) {
      for (const child of group.children) {
        rows.push({
          key: `child-${child.id}`,
          kind: "child",
          child,
        });
      }
    }
  }

  if (empty) {
    rows.push({ key: "empty", kind: "empty" });
  }

  return rows;
}

function CategoryPickerPanel({
  autoFocusSearch,
  empty,
  isSearching,
  noneVisible,
  query,
  value,
  visibleGroups,
  expanded,
  onQueryChange,
  onSelect,
  onToggleGroup,
}: {
  autoFocusSearch: boolean;
  empty: boolean;
  isSearching: boolean;
  noneVisible: boolean;
  query: string;
  value: string;
  visibleGroups: CategoryGroup[];
  expanded: Set<string>;
  onQueryChange: (query: string) => void;
  onSelect: (value: string) => void;
  onToggleGroup: (root: string) => void;
}) {
  const rows = buildVisibleRows(
    noneVisible,
    visibleGroups,
    isSearching,
    expanded,
    empty,
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-1.5">
      <Input
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Cerca categoria"
        autoFocus={autoFocusSearch}
        autoComplete="off"
        className="h-7 shrink-0"
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        {rows.map((row, index) => {
          if (row.kind === "empty") {
            return (
              <p
                key={row.key}
                className="px-2 py-1.5 text-sm text-muted-foreground"
              >
                Nessuna categoria trovata
              </p>
            );
          }

          if (row.kind === "none") {
            return (
              <button
                key={row.key}
                type="button"
                onClick={() => onSelect("none")}
                className={rowClass(value === "none", index)}
              >
                Nessuna
              </button>
            );
          }

          if (row.kind === "child") {
            return (
              <button
                key={row.key}
                type="button"
                onClick={() => onSelect(row.child.id)}
                className={cn(rowClass(value === row.child.id, index), "pl-5")}
              >
                {row.child.label}
              </button>
            );
          }

          const { group, expandable, open } = row;
          const rootCategory = group.rootCategory;
          const selected = rootCategory ? value === rootCategory.id : false;

          return (
            <div
              key={row.key}
              className={cn(rowClass(selected, index), "flex items-center")}
            >
              {rootCategory ? (
                <button
                  type="button"
                  onClick={() => onSelect(rootCategory.id)}
                  className="min-w-0 flex-1 truncate py-0 text-left"
                >
                  {group.root}
                </button>
              ) : (
                <span className="min-w-0 flex-1 truncate">{group.root}</span>
              )}
              {expandable ? (
                <button
                  type="button"
                  aria-expanded={open}
                  aria-label={
                    open ? `Chiudi ${group.root}` : `Apri ${group.root}`
                  }
                  onClick={() => onToggleGroup(group.root)}
                  className="flex size-7 shrink-0 items-center justify-center text-muted-foreground"
                >
                  {open ? (
                    <ChevronDownIcon className="size-3.5" />
                  ) : (
                    <ChevronRightIcon className="size-3.5" />
                  )}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function rowClass(selected: boolean, index: number) {
  return cn(
    "w-full px-2 py-1 text-left text-sm",
    index % 2 === 1 && !selected && "bg-muted/40",
    selected
      ? "bg-accent text-accent-foreground"
      : "hover:bg-muted/70",
  );
}
