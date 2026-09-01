"use client";

import { useTabNavigation } from "@/components/layout/tab-navigation";
import { cn } from "@/lib/utils";
import {
  LoaderCircleIcon,
  ParasolIcon,
  StickyNoteIcon,
  WalletIcon,
} from "lucide-react";
import Link from "next/link";

const items = [
  {
    id: "cashflow" as const,
    href: "/cashflow",
    label: "Cashflow",
    icon: WalletIcon,
    colorClass: "text-primary",
    selectedClass: "bg-primary/15 text-primary",
  },
  {
    id: "notes" as const,
    href: "/notes",
    label: "Notes",
    icon: StickyNoteIcon,
    colorClass: "text-home-tab-notes",
    selectedClass: "bg-home-tab-notes/15 text-home-tab-notes",
  },
  {
    id: "evidenza" as const,
    href: "/evidenza",
    label: "In evidenza",
    icon: ParasolIcon,
    colorClass: "text-home-tab-evidenza",
    selectedClass: "bg-home-tab-evidenza/15 text-home-tab-evidenza",
  },
];

export function AppTabBar() {
  const { isPending, displayTab, selectTab } = useTabNavigation();

  return (
    <nav
      aria-label="Sezioni principali"
      aria-busy={isPending}
      className={cn(
        "sticky top-0 z-20 flex justify-center gap-1 border-b bg-background px-3 py-1",
        isPending && "pointer-events-none select-none",
      )}
      inert={isPending ? true : undefined}
    >
      {items.map((item) => {
        const selected = displayTab === item.id;
        const loading = isPending && selected;
        const Icon = item.icon;
        const href = item.href;

        return (
          <Link
            key={item.id}
            href={href}
            aria-current={selected ? "page" : undefined}
            aria-busy={loading || undefined}
            aria-disabled={isPending || undefined}
            tabIndex={isPending ? -1 : undefined}
            className={cn(
              "flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              isPending && "cursor-wait",
            )}
            onClick={(event) => {
              if (
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey ||
                event.button !== 0
              ) {
                return;
              }

              event.preventDefault();
              selectTab(item.id, href);
            }}
          >
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-full transition-colors duration-150 motion-reduce:transition-none",
                selected ? item.selectedClass : item.colorClass,
              )}
            >
              {loading ? (
                <LoaderCircleIcon className="size-3.5 animate-spin motion-reduce:animate-none" />
              ) : (
                <Icon className="size-3.5" />
              )}
            </span>
            <span
              className={cn(
                "text-xs font-medium",
                selected ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
