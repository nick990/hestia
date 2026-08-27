"use client";

type NoteTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

export function NoteTextEditor({ value, onChange }: NoteTextEditorProps) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      rows={6}
      className="min-h-24 w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      placeholder="Scrivi qui…"
    />
  );
}
