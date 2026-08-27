import { buildHomeHref, type HomeTab } from "@/lib/home/tab";
import { cn } from "@/lib/utils";
import { LoaderCircleIcon, StickyNoteIcon, WalletIcon } from "lucide-react";
import Link from "next/link";

type HomeTabsProps = {
  tab: HomeTab;
  from: string;
  to: string;
  pending: boolean;
  onSelect: (tab: HomeTab) => void;
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

export function HomeTabs({
  tab,
  from,
  to,
  pending,
  onSelect,
}: HomeTabsProps) {
  return (
    <nav
      aria-label="Sezioni home"
      className="sticky top-0 z-20 flex justify-center gap-1 border-b bg-background px-3 py-1"
    >
      {items.map((item) => {
        const selected = tab === item.id;
        const loading = pending && selected;
        const Icon = item.icon;
        const href = buildHomeHref({ tab: item.hrefTab, from, to });

        return (
          <Link
            key={item.id}
            href={href}
            aria-current={selected ? "page" : undefined}
            aria-busy={loading || undefined}
            className="flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
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
              onSelect(item.id);
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
      <span className="sr-only" aria-live="polite">
        {pending ? "Caricamento…" : ""}
      </span>
    </nav>
  );
}
