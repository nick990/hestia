"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronDownIcon, type LucideIcon } from "lucide-react";
import { useId, type ReactNode } from "react";

type NotesSectionProps = {
  title: string;
  icon: LucideIcon;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  emptyLabel: string;
  children: ReactNode;
};

export function NotesSection({
  title,
  icon: Icon,
  count,
  collapsed,
  onToggle,
  emptyLabel,
  children,
}: NotesSectionProps) {
  const contentId = useId();

  return (
    <section className="space-y-3">
      <Button
        type="button"
        variant="ghost"
        className="-ml-2 h-10 justify-start gap-2 px-2"
        aria-expanded={!collapsed}
        aria-controls={contentId}
        onClick={onToggle}
      >
        <ChevronDownIcon
          className={cn(
            "size-4 shrink-0 motion-reduce:transition-none transition-transform",
            collapsed && "-rotate-90",
          )}
        />
        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="text-base font-semibold">{title}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {count}
        </span>
      </Button>
      <div id={contentId}>
        {collapsed ? null : count === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
            <p className="mx-auto max-w-md text-sm leading-6 text-muted-foreground">
              {emptyLabel}
            </p>
          </div>
        ) : (
          <div className="columns-1 gap-3 sm:columns-2 lg:columns-3">
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
