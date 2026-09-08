"use client";

import { signInAsMember } from "@/app/actions/mock-auth";
import type { MockAuthCandidate } from "@/lib/auth/mock-auth";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type MockUserSwitcherProps = {
  candidates: MockAuthCandidate[];
  currentMemberId: string | null;
};

export function MockUserSwitcher({
  candidates,
  currentMemberId,
}: MockUserSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const current = candidates.find((c) => c.id === currentMemberId);

  function handleSwitch(memberId: string) {
    if (memberId === currentMemberId) return;
    setPendingId(memberId);
    startTransition(async () => {
      const result = await signInAsMember(memberId, pathname || "/");
      if (result?.ok === false) {
        setPendingId(null);
        router.refresh();
      }
    });
  }

  return (
    <div
      className="border-border/80 bg-background/95 supports-[backdrop-filter]:bg-background/80 fixed inset-x-0 bottom-0 z-50 border-t px-3 py-2 backdrop-blur"
      aria-label="Switcher utente dev"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2">
        <span className="text-muted-foreground shrink-0 text-xs">
          Dev
          {current ? `: ${current.full_name ?? current.email}` : ""}
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap gap-1">
          {candidates.map((candidate) => {
            const active = candidate.id === currentMemberId;
            const loading = isPending && pendingId === candidate.id;
            return (
              <Button
                key={candidate.id}
                type="button"
                size="sm"
                variant={active ? "default" : "outline"}
                disabled={isPending || active}
                className="h-7 max-w-40 truncate text-xs"
                onClick={() => handleSwitch(candidate.id)}
              >
                {loading
                  ? "…"
                  : (candidate.full_name ?? candidate.email.split("@")[0])}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
