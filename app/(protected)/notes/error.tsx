"use client";

import { Button } from "@/components/ui/button";
import { TriangleAlertIcon } from "lucide-react";
import { useEffect } from "react";

export default function NotesError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 items-start px-4 py-12 sm:px-6">
      <div className="w-full rounded-xl border border-border bg-card p-6 text-center shadow-sm">
        <TriangleAlertIcon
          className="mx-auto size-6 text-destructive"
          aria-hidden="true"
        />
        <h1 className="mt-3 text-lg font-semibold">
          Non riusciamo a caricare le note
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Controlla la connessione e riprova. Le note già salvate non vengono
          modificate.
        </p>
        <Button type="button" className="mt-5" onClick={unstable_retry}>
          Riprova a caricare
        </Button>
      </div>
    </main>
  );
}
