"use client";

import { Button } from "@/components/ui/button";
import { signOut } from "@/app/actions/auth";
import { useTransition } from "react";

export function SignOutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() => startTransition(() => signOut())}
    >
      {pending ? "Uscita…" : "Esci"}
    </Button>
  );
}
