import { noteScopeLabel } from "@/lib/notes/permissions";
import type { NoteScope } from "@/lib/notes/types";
import { cn } from "@/lib/utils";

type NoteScopeLabelProps = {
  scope: NoteScope;
  className?: string;
};

export function NoteScopeLabel({ scope, className }: NoteScopeLabelProps) {
  return (
    <span
      className={cn(
        "shrink-0 text-[0.6875rem] font-medium leading-4 text-muted-foreground",
        className,
      )}
    >
      {noteScopeLabel(scope)}
    </span>
  );
}
