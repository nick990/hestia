"use client";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { MenuIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { isNavItemActive, navItems } from "@/components/layout/app-nav-links";

type AppMobileMenuProps = {
  displayName: string;
  isAdmin: boolean;
};

export function AppMobileMenu({ displayName, isAdmin }: AppMobileMenuProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Apri menu"
            />
          }
        >
          <MenuIcon />
        </SheetTrigger>
        <SheetContent side="right" className="w-72 max-w-[80vw]">
          <SheetHeader>
            <SheetTitle className="truncate pr-8 text-left">
              {displayName}
            </SheetTitle>
            <SheetDescription className="sr-only">
              Menu di navigazione
            </SheetDescription>
          </SheetHeader>
          <nav className="flex flex-col gap-1 px-4">
            {navItems.map((item) => {
              if (item.adminOnly && !isAdmin) {
                return null;
              }

              const active = isNavItemActive(item.href, pathname);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
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
          <SheetFooter>
            <SignOutButton className="w-full" />
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
