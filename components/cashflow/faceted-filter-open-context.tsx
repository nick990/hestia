"use client";

import type { FacetedColumnFilterValue } from "@/lib/cashflow/table-filter";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type FacetedFilterCommitHandler = (
  columnId: string,
  value: FacetedColumnFilterValue | undefined,
) => void;

export type FacetedFilterOpenContextValue = {
  openColumnId: string | null;
  setOpenForColumn: (columnId: string, open: boolean) => void;
  closeAll: () => void;
  getSearch: (columnId: string) => string;
  setSearchForColumn: (columnId: string, value: string) => void;
  clearSearchForColumn: (columnId: string) => void;
  getPendingSelection: (columnId: string) => string[] | null;
  setPendingSelection: (columnId: string, selectedValues: string[]) => void;
  clearPendingSelection: (columnId: string) => void;
  setBaselineForColumn: (columnId: string, selectedValues: string[]) => void;
  getBaselineForColumn: (columnId: string) => string[] | null;
  clearBaselineForColumn: (columnId: string) => void;
  applyFacetedFilter: (
    columnId: string,
    value: FacetedColumnFilterValue | undefined,
  ) => void;
  registerCommitHandler: (handler: FacetedFilterCommitHandler) => () => void;
};

const FacetedFilterOpenContext =
  createContext<FacetedFilterOpenContextValue | null>(null);

export function useFacetedFilterOpenController() {
  const [openColumnId, setOpenColumnId] = useState<string | null>(null);
  const [searchByColumn, setSearchByColumn] = useState<Record<string, string>>(
    {},
  );
  const [pendingByColumn, setPendingByColumn] = useState<
    Record<string, string[]>
  >({});
  const [baselineByColumn, setBaselineByColumn] = useState<
    Record<string, string[]>
  >({});
  const commitHandlerRef = useRef<FacetedFilterCommitHandler | null>(null);

  const closeAll = useCallback(() => {
    setOpenColumnId(null);
  }, []);

  const setOpenForColumn = useCallback((columnId: string, open: boolean) => {
    setOpenColumnId((current) => {
      if (open) {
        return columnId;
      }
      return current === columnId ? null : current;
    });
  }, []);

  const getSearch = useCallback(
    (columnId: string) => searchByColumn[columnId] ?? "",
    [searchByColumn],
  );

  const setSearchForColumn = useCallback((columnId: string, value: string) => {
    setSearchByColumn((current) => ({ ...current, [columnId]: value }));
  }, []);

  const clearSearchForColumn = useCallback((columnId: string) => {
    setSearchByColumn((current) => {
      const next = { ...current };
      delete next[columnId];
      return next;
    });
  }, []);

  const getPendingSelection = useCallback(
    (columnId: string) => pendingByColumn[columnId] ?? null,
    [pendingByColumn],
  );

  const setPendingSelection = useCallback(
    (columnId: string, selectedValues: string[]) => {
      setPendingByColumn((current) => ({
        ...current,
        [columnId]: selectedValues,
      }));
    },
    [],
  );

  const clearPendingSelection = useCallback((columnId: string) => {
    setPendingByColumn((current) => {
      const next = { ...current };
      delete next[columnId];
      return next;
    });
  }, []);

  const setBaselineForColumn = useCallback(
    (columnId: string, selectedValues: string[]) => {
      setBaselineByColumn((current) => ({
        ...current,
        [columnId]: selectedValues,
      }));
    },
    [],
  );

  const getBaselineForColumn = useCallback(
    (columnId: string) => baselineByColumn[columnId] ?? null,
    [baselineByColumn],
  );

  const clearBaselineForColumn = useCallback((columnId: string) => {
    setBaselineByColumn((current) => {
      const next = { ...current };
      delete next[columnId];
      return next;
    });
  }, []);

  const applyFacetedFilter = useCallback(
    (columnId: string, value: FacetedColumnFilterValue | undefined) => {
      commitHandlerRef.current?.(columnId, value);
    },
    [],
  );

  const registerCommitHandler = useCallback(
    (handler: FacetedFilterCommitHandler) => {
      commitHandlerRef.current = handler;
      return () => {
        if (commitHandlerRef.current === handler) {
          commitHandlerRef.current = null;
        }
      };
    },
    [],
  );

  const value = useMemo(
    () => ({
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
      getBaselineForColumn,
      clearBaselineForColumn,
      applyFacetedFilter,
      registerCommitHandler,
    }),
    [
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
      getBaselineForColumn,
      clearBaselineForColumn,
      applyFacetedFilter,
      registerCommitHandler,
    ],
  );

  return { value, closeAll };
}

export function FacetedFilterOpenProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: FacetedFilterOpenContextValue;
}) {
  return (
    <FacetedFilterOpenContext value={value}>{children}</FacetedFilterOpenContext>
  );
}

export function useFacetedFilterOpen() {
  const context = useContext(FacetedFilterOpenContext);

  if (!context) {
    throw new Error(
      "useFacetedFilterOpen must be used within FacetedFilterOpenProvider",
    );
  }

  return context;
}
