"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SettingsIcon } from "lucide-react";

export const navItems = [
  { href: "/settings", label: "Impostazioni", adminOnly: false },
] as const;

export function isNavItemActive(href: string, pathname: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNavSettingsLink({ className }: { className?: string }) {
  const pathname = usePathname();
  const active = isNavItemActive("/settings", pathname);

  return (
    <Link
      href="/settings"
      aria-label="Impostazioni"
      aria-current={active ? "page" : undefined}
      className={cn(
        "hidden size-8 shrink-0 items-center justify-center rounded-lg transition-colors sm:flex",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      <SettingsIcon className="size-4" />
    </Link>
  );
}
