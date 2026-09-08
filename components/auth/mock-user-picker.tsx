"use client";

import { signInAsMember } from "@/app/actions/mock-auth";
import type { MockAuthCandidate } from "@/lib/auth/mock-auth";
import { Button } from "@/components/ui/button";
import { useState, useTransition } from "react";

type MockUserPickerProps = {
  candidates: MockAuthCandidate[];
  next?: string;
};

function roleLabel(role: MockAuthCandidate["role"]) {
  return role === "admin" ? "Admin" : "Utente";
}

export function MockUserPicker({ candidates, next }: MockUserPickerProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (candidates.length === 0) {
    return (
      <p className="text-muted-foreground text-center text-sm">
        Nessun utente disponibile. Esegui il seed (
        <code>npm run db:reset</code>).
      </p>
    );
  }

  function handleSelect(memberId: string) {
    setError(null);
    setPendingId(memberId);
    startTransition(async () => {
      const result = await signInAsMember(memberId, next);
      if (result?.ok === false) {
        setError(result.error);
        setPendingId(null);
      }
    });
  }

  return (
    <div className="space-y-2">
      {error ? (
        <p className="text-destructive text-center text-sm">{error}</p>
      ) : null}
      <ul className="space-y-2">
        {candidates.map((candidate) => {
          const loading = isPending && pendingId === candidate.id;
          const displayName = candidate.full_name ?? candidate.email;
          return (
            <li key={candidate.id}>
              <Button
                type="button"
                variant="outline"
                className="h-auto w-full justify-start px-4 py-3"
                disabled={isPending}
                onClick={() => handleSelect(candidate.id)}
              >
                <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left">
                  <span className="font-medium">{displayName}</span>
                  <span className="text-muted-foreground text-xs">
                    {candidate.email} · {roleLabel(candidate.role)}
                    {!candidate.has_auth_user ? " · nuovo" : ""}
                  </span>
                </span>
                {loading ? (
                  <span className="text-muted-foreground text-xs">…</span>
                ) : null}
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
