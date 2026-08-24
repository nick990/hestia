"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  createDefaultFilters,
  loadFilters,
  saveFilters,
  type AssigneeFiltersState,
  type TypeFilterState,
} from "@/lib/cashflow/assignee-filters";
import type { FamilyMemberOption } from "@/lib/families/types";
import { Button } from "@/components/ui/button";
import { FilterIcon } from "lucide-react";
import { useEffect, useState } from "react";

type AssigneeFilterPanelProps = {
  filters: AssigneeFiltersState;
  members: FamilyMemberOption[];
  currentUserId: string;
  /** `popover` (default) for Cashflow toolbar; `inline` keeps filters always visible (home). */
  variant?: "popover" | "inline";
  compact?: boolean;
  onChange: (filters: AssigneeFiltersState) => void;
};

function TypeFilterSection({
  title,
  idPrefix,
  typeFilter,
  members,
  currentUserId,
  onChange,
}: {
  title: string;
  idPrefix: string;
  typeFilter: TypeFilterState;
  members: FamilyMemberOption[];
  currentUserId: string;
  onChange: (next: TypeFilterState) => void;
}) {
  const sectionId = `${idPrefix}-${title.toLowerCase()}`;

  function toggleMember(userId: string, checked: boolean) {
    onChange({
      ...typeFilter,
      members: {
        ...typeFilter.members,
        [userId]: checked,
      },
    });
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id={`${sectionId}-family`}
            checked={typeFilter.family}
            onCheckedChange={(checked) =>
              onChange({ ...typeFilter, family: checked === true })
            }
          />
          <Label htmlFor={`${sectionId}-family`} className="font-normal">
            Famiglia
          </Label>
        </div>
        {members.map((member) => (
          <div key={`${sectionId}-${member.user_id}`} className="space-y-1">
            <div className="flex items-center gap-2">
              <Checkbox
                id={`${sectionId}-${member.user_id}`}
                checked={typeFilter.members[member.user_id] ?? false}
                onCheckedChange={(checked) =>
                  toggleMember(member.user_id, checked === true)
                }
              />
              <Label
                htmlFor={`${sectionId}-${member.user_id}`}
                className="font-normal"
              >
                {member.display_name}
              </Label>
            </div>
            {member.user_id === currentUserId &&
            typeFilter.members[member.user_id] ? (
              <div className="ml-6 flex items-center gap-2">
                <Checkbox
                  id={`${sectionId}-${member.user_id}-private`}
                  checked={typeFilter.showPrivate}
                  onCheckedChange={(checked) =>
                    onChange({
                      ...typeFilter,
                      showPrivate: checked === true,
                    })
                  }
                />
                <Label
                  htmlFor={`${sectionId}-${member.user_id}-private`}
                  className="font-normal text-muted-foreground"
                >
                  Mostra privati
                </Label>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function FilterSections({
  idPrefix,
  filters,
  members,
  currentUserId,
  onUpdate,
}: {
  idPrefix: string;
  filters: AssigneeFiltersState;
  members: FamilyMemberOption[];
  currentUserId: string;
  onUpdate: (next: AssigneeFiltersState) => void;
}) {
  return (
    <>
      <TypeFilterSection
        title="Entrate"
        idPrefix={idPrefix}
        typeFilter={filters.income}
        members={members}
        currentUserId={currentUserId}
        onChange={(income) => onUpdate({ ...filters, income })}
      />
      <TypeFilterSection
        title="Uscite"
        idPrefix={idPrefix}
        typeFilter={filters.expense}
        members={members}
        currentUserId={currentUserId}
        onChange={(expense) => onUpdate({ ...filters, expense })}
      />
    </>
  );
}

export function AssigneeFilterPanel({
  filters,
  members,
  currentUserId,
  variant = "popover",
  compact = false,
  onChange,
}: AssigneeFilterPanelProps) {
  function updateFilters(next: AssigneeFiltersState) {
    if (typeof window !== "undefined") {
      saveFilters(next, window.localStorage);
    }
    onChange(next);
  }

  if (variant === "inline") {
    return (
      <section
        aria-label="Filtri movimenti"
        className="rounded-lg border bg-muted/30 p-3 space-y-3"
      >
        <div className="grid grid-cols-2 gap-4 sm:gap-6">
          <FilterSections
            idPrefix={compact ? "home" : "cashflow"}
            filters={filters}
            members={members}
            currentUserId={currentUserId}
            onUpdate={updateFilters}
          />
        </div>
      </section>
    );
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size={compact ? "sm" : "default"}
            className="gap-2"
          />
        }
      >
        <FilterIcon className="size-4" />
        Filtri
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 space-y-4">
        <PopoverHeader>
          <PopoverTitle>Filtri movimenti</PopoverTitle>
        </PopoverHeader>
        <div className="space-y-4">
          <FilterSections
            idPrefix="cashflow"
            filters={filters}
            members={members}
            currentUserId={currentUserId}
            onUpdate={updateFilters}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function useAssigneeFilters(
  members: FamilyMemberOption[],
  currentUserId: string,
  hasFamily: boolean,
) {
  const [filters, setFilters] = useState<AssigneeFiltersState>(() =>
    createDefaultFilters(members, currentUserId),
  );
  const [hydrated, setHydrated] = useState(!hasFamily);

  useEffect(() => {
    if (!hasFamily) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only localStorage hydration
    setFilters(loadFilters(members, currentUserId, window.localStorage));
    setHydrated(true);
  }, [members, currentUserId, hasFamily]);

  function updateFilters(next: AssigneeFiltersState) {
    setFilters(next);
  }

  return { filters, updateFilters, hydrated };
}
