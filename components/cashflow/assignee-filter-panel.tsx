"use client";

import { Button } from "@/components/ui/button";
import {
  createDefaultFilters,
  loadFilters,
  saveFilters,
  type AssigneeFiltersState,
  type TypeFilterState,
} from "@/lib/cashflow/assignee-filters";
import type { FamilyMemberOption } from "@/lib/families/types";
import { useEffect, useState } from "react";

type AssigneeFilterPanelProps = {
  filters: AssigneeFiltersState;
  members: FamilyMemberOption[];
  currentUserId: string;
  onChange: (filters: AssigneeFiltersState) => void;
};

function FilterChip({
  pressed,
  children,
  onPressedChange,
}: {
  pressed: boolean;
  children: React.ReactNode;
  onPressedChange: (pressed: boolean) => void;
}) {
  return (
    <Button
      type="button"
      size="xs"
      variant={pressed ? "default" : "outline"}
      aria-pressed={pressed}
      onClick={() => onPressedChange(!pressed)}
    >
      {children}
    </Button>
  );
}

function TypeFilterRow({
  title,
  typeFilter,
  members,
  currentUserId,
  onChange,
}: {
  title: string;
  typeFilter: TypeFilterState;
  members: FamilyMemberOption[];
  currentUserId: string;
  onChange: (next: TypeFilterState) => void;
}) {
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
    <div className="flex min-w-0 items-start gap-2">
      <p className="w-14 shrink-0 pt-1 text-xs font-medium text-muted-foreground">
        {title}
      </p>
      <div className="flex min-w-0 flex-wrap gap-1.5">
        <FilterChip
          pressed={typeFilter.family}
          onPressedChange={(family) => onChange({ ...typeFilter, family })}
        >
          Famiglia
        </FilterChip>
        {members.map((member) => (
          <FilterChip
            key={member.user_id}
            pressed={typeFilter.members[member.user_id] ?? false}
            onPressedChange={(checked) =>
              toggleMember(member.user_id, checked)
            }
          >
            {member.display_name}
          </FilterChip>
        ))}
        {typeFilter.members[currentUserId] ? (
          <FilterChip
            pressed={typeFilter.showPrivate}
            onPressedChange={(showPrivate) =>
              onChange({ ...typeFilter, showPrivate })
            }
          >
            Privati
          </FilterChip>
        ) : null}
      </div>
    </div>
  );
}

function FilterSections({
  filters,
  members,
  currentUserId,
  onUpdate,
}: {
  filters: AssigneeFiltersState;
  members: FamilyMemberOption[];
  currentUserId: string;
  onUpdate: (next: AssigneeFiltersState) => void;
}) {
  return (
    <>
      <TypeFilterRow
        title="Entrate"
        typeFilter={filters.income}
        members={members}
        currentUserId={currentUserId}
        onChange={(income) => onUpdate({ ...filters, income })}
      />
      <TypeFilterRow
        title="Uscite"
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
  onChange,
}: AssigneeFilterPanelProps) {
  function updateFilters(next: AssigneeFiltersState) {
    if (typeof window !== "undefined") {
      saveFilters(next, window.localStorage);
    }
    onChange(next);
  }

  return (
    <section
      aria-label="Filtri movimenti"
      className="space-y-2 border-y py-2.5"
    >
      <FilterSections
        filters={filters}
        members={members}
        currentUserId={currentUserId}
        onUpdate={updateFilters}
      />
    </section>
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
