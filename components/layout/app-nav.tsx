import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { getCurrentMember } from "@/lib/auth/member";
import { getCurrentUserProfile } from "@/lib/profile/queries";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/cashflow", label: "Cashflow", adminOnly: false },
  { href: "/settings", label: "Impostazioni", adminOnly: false },
] as const;

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
          <Link href="/cashflow" className="text-sm font-semibold tracking-tight">
            Hestia
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              if (item.adminOnly && !isAdmin) {
                return null;
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
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
