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
import { branchInteraction } from "@/lib/categories/interaction";
import {
  buildCategoryGroups,
  categoryTriggerLabel,
  filterCategoryGroups,
  selectedExpandPaths,
  showNoneOption,
  type CategoryGroup,
  type CategoryLevel2,
} from "@/lib/categories/tree";
import type { MovementCategoryOption } from "@/lib/categories/types";
import { cn } from "@/lib/utils";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CircleDotIcon,
  CircleIcon,
} from "lucide-react";
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
      const selected = categories.find((category) => category.id === value);
      setExpanded(
        selected ? new Set(selectedExpandPaths(selected.name)) : new Set(),
      );
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
      mobile={!minMd}
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

function CategoryPickerPanel({
  autoFocusSearch,
  empty,
  isSearching,
  mobile,
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
  mobile: boolean;
  noneVisible: boolean;
  query: string;
  value: string;
  visibleGroups: CategoryGroup[];
  expanded: Set<string>;
  onQueryChange: (query: string) => void;
  onSelect: (value: string) => void;
  onToggleGroup: (root: string) => void;
}) {
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
        {noneVisible ? (
          <button
            type="button"
            onClick={() => onSelect("none")}
            className={rowClass(value === "none")}
          >
            Nessuna
          </button>
        ) : null}
        {visibleGroups.map((group) => {
          const expandable = group.children.length > 0;
          const open = expandable && (isSearching || expanded.has(group.root));
          const rootCategory = group.rootCategory;
          const selected = rootCategory ? value === rootCategory.id : false;

          return (
            <div key={group.root}>
              <BranchRow
                expandable={expandable}
                label={group.root}
                mobile={mobile}
                open={open}
                selected={selected}
                weight="parent"
                onSelect={
                  rootCategory ? () => onSelect(rootCategory.id) : undefined
                }
                onToggle={() => onToggleGroup(group.root)}
              />
              {open ? (
                <div className={nestClass}>
                  {group.children.map((level, index) => (
                    <Level2Branch
                      key={level.path}
                      expanded={expanded}
                      isSearching={isSearching}
                      level={level}
                      mobile={mobile}
                      stripe={index % 2 === 1}
                      value={value}
                      onSelect={onSelect}
                      onToggleGroup={onToggleGroup}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
        {empty ? (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">
            Nessuna categoria trovata
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Level2Branch({
  expanded,
  isSearching,
  level,
  mobile,
  stripe,
  value,
  onSelect,
  onToggleGroup,
}: {
  expanded: Set<string>;
  isSearching: boolean;
  level: CategoryLevel2;
  mobile: boolean;
  stripe: boolean;
  value: string;
  onSelect: (value: string) => void;
  onToggleGroup: (path: string) => void;
}) {
  const expandable = level.children.length > 0;
  const open = expandable && (isSearching || expanded.has(level.path));
  const levelCategory = level.category;
  const selected = levelCategory ? value === levelCategory.id : false;

  return (
    <div>
      <BranchRow
        expandable={expandable}
        label={level.segment}
        mobile={mobile}
        open={open}
        selected={selected}
        stripe={stripe}
        weight={expandable ? "parent" : undefined}
        onSelect={levelCategory ? () => onSelect(levelCategory.id) : undefined}
        onToggle={() => onToggleGroup(level.path)}
      />
      {open ? (
        <div className={nestClass}>
          {level.children.map((child, index) => (
            <button
              key={child.id}
              type="button"
              onClick={() => onSelect(child.id)}
              className={rowClass(value === child.id, index % 2 === 1)}
            >
              {child.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function BranchRow({
  expandable,
  label,
  mobile,
  open,
  selected,
  stripe = false,
  weight,
  onSelect,
  onToggle,
}: {
  expandable: boolean;
  label: string;
  mobile: boolean;
  open: boolean;
  selected: boolean;
  stripe?: boolean;
  weight?: "parent";
  onSelect?: () => void;
  onToggle: () => void;
}) {
  const { nameAction, showRadio } = branchInteraction({
    mobile,
    expandable,
    selectable: Boolean(onSelect),
  });
  const hit = mobile ? "size-11" : "size-7";

  return (
    <div className={cn(rowClass(selected, stripe), "flex items-center")}>
      {showRadio && onSelect ? (
        <button
          type="button"
          aria-label={`Scegli ${label}`}
          onClick={onSelect}
          className={cn(
            "flex shrink-0 items-center justify-center text-muted-foreground",
            hit,
          )}
        >
          {selected ? (
            <CircleDotIcon className="size-4 text-primary" />
          ) : (
            <CircleIcon className="size-4" />
          )}
        </button>
      ) : null}
      {nameAction === "select" && onSelect ? (
        <button
          type="button"
          onClick={onSelect}
          className={cn(
            "min-w-0 flex-1 truncate py-0 text-left",
            weight === "parent" && "font-medium",
          )}
        >
          {label}
        </button>
      ) : null}
      {nameAction === "toggle" ? (
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? `Chiudi ${label}` : `Apri ${label}`}
          onClick={onToggle}
          className={cn(
            "min-w-0 flex-1 truncate py-0 text-left",
            weight === "parent" && "font-medium",
            !onSelect && "text-muted-foreground",
          )}
        >
          {label}
        </button>
      ) : null}
      {nameAction === "none" ? (
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-muted-foreground",
            weight === "parent" && "font-medium",
          )}
        >
          {label}
        </span>
      ) : null}
      {expandable ? (
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? `Chiudi ${label}` : `Apri ${label}`}
          onClick={onToggle}
          className={cn(
            "flex shrink-0 items-center justify-center text-muted-foreground",
            hit,
          )}
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
}

const nestClass =
  "ml-2.5 border-l-2 border-primary/25 bg-muted/25";

function rowClass(selected: boolean, stripe = false) {
  return cn(
    "w-full px-2 py-1 text-left text-sm",
    stripe && !selected && "bg-muted/40",
    selected ? "bg-accent text-accent-foreground" : "hover:bg-muted/70",
  );
}
