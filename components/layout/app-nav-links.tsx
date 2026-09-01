"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const navItems = [
  { href: "/", label: "Home", adminOnly: false },
  { href: "/cashflow", label: "Cashflow", adminOnly: false },
  { href: "/notes", label: "Notes", adminOnly: false },
  { href: "/settings", label: "Impostazioni", adminOnly: false },
] as const;

export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  if (href === "/cashflow") {
    return pathname === "/cashflow" || pathname.startsWith("/cashflow/");
  }

  if (href === "/notes") {
    return pathname === "/notes" || pathname.startsWith("/notes/");
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

type AppNavLinksProps = {
  isAdmin: boolean;
  className?: string;
};

export function AppNavLinks({ isAdmin, className }: AppNavLinksProps) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex items-center gap-1", className)}>
      {navItems.map((item) => {
        if (item.adminOnly && !isAdmin) {
          return null;
        }

        const active = isNavItemActive(item.href, pathname);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm transition-colors",
              active
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
