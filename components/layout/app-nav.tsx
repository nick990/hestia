import { SignOutButton } from "@/components/auth/sign-out-button";
import { AppMobileMenu } from "@/components/layout/app-mobile-menu";
import { AppNavLinks } from "@/components/layout/app-nav-links";
import { getCurrentMember } from "@/lib/auth/member";
import { getCurrentUserProfile } from "@/lib/profile/queries";
import Link from "next/link";

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
        <div className="flex min-w-0 items-center gap-6">
          <Link
            href="/"
            className="text-sm font-semibold tracking-tight text-primary"
          >
            Hestia
          </Link>
          <AppNavLinks isAdmin={isAdmin} className="hidden sm:flex" />
        </div>
        <div className="hidden items-center gap-3 sm:flex">
          <span className="max-w-48 truncate text-sm text-muted-foreground">
            {displayName}
          </span>
          <SignOutButton />
        </div>
        <AppMobileMenu displayName={displayName} isAdmin={isAdmin} />
      </div>
    </header>
  );
}
