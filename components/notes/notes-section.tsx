"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "lucide-react";
import type { ReactNode } from "react";

type NotesSectionProps = {
  title: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  emptyLabel: string;
  children: ReactNode;
};

export function NotesSection({
  title,
  count,
  collapsed,
  onToggle,
  emptyLabel,
  children,
}: NotesSectionProps) {
  return (
    <section className="space-y-2">
      <Button
        type="button"
        variant="ghost"
        className="h-auto w-full justify-start gap-2 px-2 py-1.5"
        aria-expanded={!collapsed}
        onClick={onToggle}
      >
        <ChevronDownIcon
          className={cn(
            "size-4 shrink-0 motion-reduce:transition-none transition-transform",
            collapsed && "-rotate-90",
          )}
        />
        <span className="font-medium">{title}</span>
        <span className="text-muted-foreground">({count})</span>
      </Button>
      {collapsed ? null : count === 0 ? (
        <p className="px-2 text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </section>
  );
}
