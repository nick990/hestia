"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/settings/categories", label: "Categorie", adminOnly: false },
  { href: "/settings/users", label: "Utenti", adminOnly: true },
] as const;

type SettingsNavProps = {
  isAdmin: boolean;
};

export function SettingsNav({ isAdmin }: SettingsNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 sm:w-48">
      {items.map((item) => {
        if (item.adminOnly && !isAdmin) {
          return null;
        }

        const active = pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-lg px-3 py-2 text-sm transition-colors",
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
