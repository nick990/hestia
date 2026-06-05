"use client";

import { updateProfileName } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserProfile } from "@/lib/profile/types";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

type AccountManagerProps = {
  profile: UserProfile;
};

export function AccountManager({ profile }: AccountManagerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fullName, setFullName] = useState(profile.full_name ?? "");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const result = await updateProfileName(fullName);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Nome aggiornato.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={profile.email} disabled />
      </div>

      <div className="space-y-2">
        <Label htmlFor="full-name">Nome</Label>
        <Input
          id="full-name"
          value={fullName}
          maxLength={100}
          required
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Il tuo nome"
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Salvataggio…" : "Salva"}
      </Button>
    </form>
  );
}
