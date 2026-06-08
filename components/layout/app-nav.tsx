import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { AppNavLinks } from "@/components/layout/app-nav-links";
import { getCurrentMember } from "@/lib/auth/member";
import { getCurrentUserProfile } from "@/lib/profile/queries";

export async function AppNav() {
  const [member, profile] = await Promise.all([
    getCurrentMember(),
    getCurrentUserProfile(),
  ]);
  const isAdmin = member?.role === "admin" && !member.disabled_at;
  const displayName =
    profile?.full_name?.trim() || profile?.email || member?.email || "Utente";

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/cashflow"
            className="text-sm font-semibold tracking-tight text-primary"
          >
            Hestia
          </Link>
          <AppNavLinks isAdmin={isAdmin} />
        </div>
        <div className="flex items-center gap-3">
          <span className="max-w-48 truncate text-sm text-muted-foreground">
            {displayName}
          </span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
