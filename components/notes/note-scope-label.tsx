import { noteScopeLabel } from "@/lib/notes/permissions";
import { formatNoteUpdatedAt } from "@/lib/notes/presentation";
import type { NoteScope } from "@/lib/notes/types";
import { cn } from "@/lib/utils";

type NoteScopeLabelProps = {
  scope: NoteScope;
  updatedAt?: string;
  className?: string;
};

export function NoteScopeLabel({
  scope,
  updatedAt,
  className,
}: NoteScopeLabelProps) {
  const updatedLabel = updatedAt ? formatNoteUpdatedAt(updatedAt) : "";

  return (
    <span
      className={cn(
        "shrink-0 text-right leading-4 text-muted-foreground",
        className,
      )}
    >
      <span className="block text-[0.6875rem] font-medium">
        {noteScopeLabel(scope)}
      </span>
      {updatedLabel ? (
        <time
          className="block text-[0.625rem] font-normal text-muted-foreground/85"
          dateTime={updatedAt}
        >
          {updatedLabel}
        </time>
      ) : null}
    </span>
  );
}
