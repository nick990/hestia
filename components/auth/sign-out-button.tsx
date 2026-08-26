"use client";

import { Button } from "@/components/ui/button";
import { signOut } from "@/app/actions/auth";
import { cn } from "@/lib/utils";
import { useTransition } from "react";

type SignOutButtonProps = {
  className?: string;
};

export function SignOutButton({ className }: SignOutButtonProps) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      className={cn(className)}
      disabled={pending}
      onClick={() => startTransition(() => signOut())}
    >
      {pending ? "Uscita…" : "Esci"}
    </Button>
  );
}
