"use client";

import { useFacetedFilterOpen } from "@/components/cashflow/faceted-filter-open-context";
import type { FacetedColumnFilterValue } from "@/lib/cashflow/table-filter";
import { useEffect } from "react";

export function FacetedFilterCommitRegistrar({
  onCommit,
}: {
  onCommit: (
    columnId: string,
    value: FacetedColumnFilterValue | undefined,
  ) => void;
}) {
  const { registerCommitHandler } = useFacetedFilterOpen();

  useEffect(() => {
    return registerCommitHandler(onCommit);
  }, [onCommit, registerCommitHandler]);

  return null;
}
