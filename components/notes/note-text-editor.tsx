"use client";

import { cn } from "@/lib/utils";

type NoteTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  className?: string;
};

export function NoteTextEditor({
  value,
  onChange,
  rows = 6,
  className,
}: NoteTextEditorProps) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      rows={rows}
      className={cn(
        "min-h-24 w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-base leading-6 outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm field-sizing-fixed",
        className,
      )}
      placeholder="Scrivi qui…"
    />
  );
}
