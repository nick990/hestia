"use client";

import { MovementListRow } from "@/components/cashflow/movement-list-row";
import { formatOccurredOn } from "@/lib/cashflow/format";
import { reimbursementLine } from "@/lib/saldi/presentation";
import type { SaldiActivityItem } from "@/lib/saldi/types";
import { useEffect, useRef } from "react";

type SaldiActivityListProps = {
  items: SaldiActivityItem[];
  nameById: Record<string, string>;
  hasFamily: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onOpenSplit: (id: string) => void;
  onOpenReimbursement: (
    item: Extract<SaldiActivityItem, { kind: "reimbursement" }>,
  ) => void;
};

function ReimbursementRow({
  item,
  nameById,
}: {
  item: Extract<SaldiActivityItem, { kind: "reimbursement" }>;
  nameById: Record<string, string>;
}) {
  return (
    <div className="px-3 py-2">
      <p>
        {reimbursementLine(
          nameById[item.fromUserId] ?? "—",
          item.amount,
          nameById[item.toUserId] ?? "—",
        )}
      </p>
      <p className="text-xs text-muted-foreground">
        {formatOccurredOn(item.occurredOn)}
      </p>
    </div>
  );
}

export function SaldiActivityList({
  items,
  nameById,
  hasFamily,
  hasMore,
  loadingMore,
  onLoadMore,
  onOpenSplit,
  onOpenReimbursement,
}: SaldiActivityListProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(loadingMore);
  const onLoadMoreRef = useRef(onLoadMore);

  loadingMoreRef.current = loadingMore;
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    const node = sentinelRef.current;

    if (!node || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (!entry?.isIntersecting || loadingMoreRef.current) {
          return;
        }

        onLoadMoreRef.current();
      },
      { rootMargin: "120px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, items.length]);

  if (items.length === 0) {
    return null;
  }

  return (
    <section>
      <ul className="divide-y rounded-lg border">
        {items.map((item) => (
          <li
            key={`${item.kind}-${item.kind === "split" ? item.movement.id : item.id}`}
          >
            <button
              type="button"
              className="block w-full text-left"
              onClick={() => {
                if (item.kind === "split") {
                  onOpenSplit(item.movement.id);
                  return;
                }

                onOpenReimbursement(item);
              }}
            >
              {item.kind === "split" ? (
                <div className="flex items-start justify-between gap-3 px-3 py-2">
                  <MovementListRow
                    movement={item.movement}
                    hasFamily={hasFamily}
                  />
                </div>
              ) : (
                <ReimbursementRow item={item} nameById={nameById} />
              )}
            </button>
          </li>
        ))}
      </ul>
      <div ref={sentinelRef} className="h-4" aria-hidden />
    </section>
  );
}
