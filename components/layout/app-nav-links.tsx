"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/cashflow", label: "Cashflow", adminOnly: false },
  { href: "/settings", label: "Impostazioni", adminOnly: false },
] as const;

type AppNavLinksProps = {
  isAdmin: boolean;
};

export function AppNavLinks({ isAdmin }: AppNavLinksProps) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {navItems.map((item) => {
        if (item.adminOnly && !isAdmin) {
          return null;
        }

        const active =
          item.href === "/cashflow"
            ? pathname === "/cashflow" || pathname.startsWith("/cashflow/")
            : pathname.startsWith(item.href);

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
