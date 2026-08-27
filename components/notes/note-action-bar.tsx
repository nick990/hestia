"use client";

import { Button } from "@/components/ui/button";
import type { NoteKind } from "@/lib/notes/types";
import { cn } from "@/lib/utils";
import {
  ListChecksIcon,
  Share2Icon,
  TextIcon,
  Trash2Icon,
  UserRoundIcon,
} from "lucide-react";
import type { ReactNode } from "react";

type NoteActionBarProps = {
  kind: NoteKind;
  shareVisible: boolean;
  unshareVisible: boolean;
  actionPending: boolean;
  onKindChange: (kind: NoteKind) => void;
  onShare: () => void;
  onUnshare: () => void;
  onDelete: () => void;
  children?: ReactNode;
  className?: string;
};

export function NoteActionBar({
  kind,
  shareVisible,
  unshareVisible,
  actionPending,
  onKindChange,
  onShare,
  onUnshare,
  onDelete,
  children,
  className,
}: NoteActionBarProps) {
  return (
    <div
      className={cn(
        "flex min-h-10 items-center justify-between gap-2",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-0.5">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={cn(kind === "text" && "bg-muted")}
          aria-label="Passa a nota di testo"
          title="Nota di testo"
          onClick={() => onKindChange("text")}
        >
          <TextIcon />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={cn(kind === "checklist" && "bg-muted")}
          aria-label="Passa a checklist"
          title="Checklist"
          onClick={() => onKindChange("checklist")}
        >
          <ListChecksIcon />
        </Button>
        {shareVisible ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={actionPending}
            aria-label="Condividi con la famiglia"
            title="Condividi con la famiglia"
            onClick={onShare}
          >
            <Share2Icon />
          </Button>
        ) : null}
        {unshareVisible ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={actionPending}
            aria-label="Togli condivisione"
            title="Togli condivisione"
            onClick={onUnshare}
          >
            <UserRoundIcon />
          </Button>
        ) : null}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="text-muted-foreground hover:text-destructive"
          aria-label="Elimina nota"
          title="Elimina nota"
          onClick={onDelete}
        >
          <Trash2Icon />
        </Button>
      </div>
      {children}
    </div>
  );
}
