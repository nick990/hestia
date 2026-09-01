"use client";

import { TabbedLoadingSkeleton } from "@/components/layout/tabbed-loading";
import { resolveAppTab, type AppTab } from "@/lib/nav/tab-bar";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useOptimistic,
  useTransition,
  type ComponentProps,
  type ReactNode,
} from "react";

type TabNavigationContextValue = {
  isPending: boolean;
  displayTab: AppTab;
  navigate: (href: string) => void;
  selectTab: (nextTab: AppTab, href: string) => void;
};

const TabNavigationContext = createContext<TabNavigationContextValue | null>(
  null,
);

export function TabNavigationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const activeTab = resolveAppTab(pathname);
  const [optimisticTab, setOptimisticTab] = useOptimistic(activeTab);
  const displayTab = isPending ? optimisticTab : activeTab;

  const navigate = useCallback(
    (href: string) => {
      if (isPending) {
        return;
      }

      startTransition(() => {
        router.push(href);
      });
    },
    [isPending, router],
  );

  const selectTab = useCallback(
    (nextTab: AppTab, href: string) => {
      if (isPending || nextTab === activeTab) {
        return;
      }

      startTransition(() => {
        setOptimisticTab(nextTab);
        router.push(href);
      });
    },
    [activeTab, isPending, router, setOptimisticTab],
  );

  return (
    <TabNavigationContext value={{ isPending, displayTab, navigate, selectTab }}>
      {children}
      <span className="sr-only" aria-live="polite">
        {isPending ? "Caricamento…" : ""}
      </span>
    </TabNavigationContext>
  );
}

export function useTabNavigation() {
  const context = useContext(TabNavigationContext);

  if (!context) {
    throw new Error("useTabNavigation must be used within TabNavigationProvider");
  }

  return context;
}

export function TabbedMain({ children }: { children: ReactNode }) {
  const { isPending } = useTabNavigation();

  return (
    <div className="flex min-h-0 flex-1 flex-col" aria-busy={isPending}>
      {isPending ? <TabbedLoadingSkeleton /> : children}
    </div>
  );
}

type TabbedNavLinkProps = ComponentProps<typeof Link>;

export function TabbedNavLink({
  href,
  onClick,
  ...props
}: TabbedNavLinkProps) {
  const { isPending, navigate } = useTabNavigation();

  return (
    <Link
      href={href}
      aria-disabled={isPending || undefined}
      tabIndex={isPending ? -1 : undefined}
      onClick={(event) => {
        onClick?.(event);

        if (event.defaultPrevented || typeof href !== "string") {
          return;
        }

        if (
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        ) {
          return;
        }

        event.preventDefault();
        navigate(href);
      }}
      {...props}
    />
  );
}
