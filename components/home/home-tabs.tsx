import { buildHomeHref, type HomeTab } from "@/lib/home/tab";
import { cn } from "@/lib/utils";
import { StickyNoteIcon, WalletIcon } from "lucide-react";
import Link from "next/link";

type HomeTabsProps = {
  tab: HomeTab;
  from: string;
  to: string;
};

const items = [
  {
    id: "cashflow" as const,
    hrefTab: "cashflow" as const,
    label: "Cashflow",
    icon: WalletIcon,
    colorClass: "text-primary",
    selectedClass: "bg-primary/15 text-primary",
  },
  {
    id: "notes" as const,
    hrefTab: "notes" as const,
    label: "Notes",
    icon: StickyNoteIcon,
    colorClass: "text-home-tab-notes",
    selectedClass: "bg-home-tab-notes/15 text-home-tab-notes",
  },
];

export function HomeTabs({ tab, from, to }: HomeTabsProps) {
  return (
    <nav
      aria-label="Sezioni home"
      className="sticky top-0 z-20 flex justify-center gap-8 border-b bg-background px-4 py-2"
    >
      {items.map((item) => {
        const selected = tab === item.id;
        const Icon = item.icon;

        return (
          <Link
            key={item.id}
            href={buildHomeHref({ tab: item.hrefTab, from, to })}
            aria-current={selected ? "page" : undefined}
            className="flex min-h-11 min-w-11 flex-col items-center gap-1 rounded-lg px-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span
              className={cn(
                "flex size-10 items-center justify-center rounded-full transition-colors duration-150 motion-reduce:transition-none",
                selected ? item.selectedClass : item.colorClass,
              )}
            >
              <Icon className="size-5" />
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
