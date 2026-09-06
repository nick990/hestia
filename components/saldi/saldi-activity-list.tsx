"use client";

import { formatEuro, formatOccurredOn, formatPayerLine } from "@/lib/cashflow/format";
import {
  normalizeCategoryDisplay,
  normalizeDescriptionDisplay,
} from "@/lib/cashflow/table-filter";
import { reimbursementLine } from "@/lib/saldi/presentation";
import type { SaldiActivityItem } from "@/lib/saldi/types";
import { useEffect, useRef } from "react";

type SaldiActivityListProps = {
  items: SaldiActivityItem[];
  nameById: Record<string, string>;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onOpenSplit: (id: string) => void;
  onOpenReimbursement: (
    item: Extract<SaldiActivityItem, { kind: "reimbursement" }>,
  ) => void;
};

function SplitRow({
  item,
}: {
  item: Extract<SaldiActivityItem, { kind: "split" }>;
}) {
  const description = normalizeDescriptionDisplay(item.description);
  const hasDescription = description !== "—";
  const payerLine = formatPayerLine(item.payerName);

  return (
    <div className="flex items-start justify-between gap-3 px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {normalizeCategoryDisplay(item.categoryName)}
        </p>
        {hasDescription ? (
          <p className="truncate text-xs leading-4 text-muted-foreground">
            {description}
          </p>
        ) : null}
        <p className="text-xs leading-4 text-muted-foreground">
          {formatOccurredOn(item.occurredOn)}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <p className="text-sm font-medium tabular-nums text-destructive">
          {formatEuro(item.amount)}
        </p>
        {payerLine ? (
          <p className="text-xs leading-4 text-muted-foreground">{payerLine}</p>
        ) : null}
      </div>
    </div>
  );
}

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
  hasMore,
  loadingMore,
  onLoadMore,
  onOpenSplit,
  onOpenReimbursement,
}: SaldiActivityListProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const blockedRef = useRef(false);

  useEffect(() => {
    const node = sentinelRef.current;

    if (!node) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];

      if (!entry) {
        return;
      }

      if (!entry.isIntersecting) {
        blockedRef.current = false;
        return;
      }

      if (!hasMore || loadingMore || blockedRef.current) {
        return;
      }

      blockedRef.current = true;
      onLoadMore();
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, onLoadMore]);

  if (items.length === 0) {
    return null;
  }

  return (
    <section>
      <ul className="divide-y rounded-lg border">
        {items.map((item) => (
          <li key={`${item.kind}-${item.id}`}>
            <button
              type="button"
              className="block w-full text-left"
              onClick={() => {
                if (item.kind === "split") {
                  onOpenSplit(item.id);
                  return;
                }

                onOpenReimbursement(item);
              }}
            >
              {item.kind === "split" ? (
                <SplitRow item={item} />
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
