"use client";

import { HomeNavContext } from "@/components/home/home-nav-context";
import { HomeTabs } from "@/components/home/home-tabs";
import { buildHomeHref, type HomeTab } from "@/lib/home/tab";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";

type HomeRange = {
  from: string;
  to: string;
};

type HomeShellProps = {
  tab: HomeTab;
  from: string;
  to: string;
  children: ReactNode;
};

export function HomeShell({ tab, from, to, children }: HomeShellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setOptimisticTab] = useOptimistic(tab);
  const [rangeOverride, setRangeOverride] = useState<HomeRange | null>(null);
  const rangeOverrideRef = useRef<HomeRange | null>(null);
  const navGeneration = useRef(0);

  const range = useMemo((): HomeRange => {
    if (
      rangeOverride &&
      (rangeOverride.from !== from || rangeOverride.to !== to)
    ) {
      return rangeOverride;
    }

    return { from, to };
  }, [from, to, rangeOverride]);

  const nav = useMemo(
    () => ({
      range,
      setRange: (next: HomeRange) => {
        rangeOverrideRef.current = next;
        setRangeOverride(next);
      },
      beginNav: () => {
        navGeneration.current += 1;
        return navGeneration.current;
      },
      isCurrentNav: (generation: number) =>
        generation === navGeneration.current,
    }),
    [range],
  );

  function resolveRange(): HomeRange {
    const override = rangeOverrideRef.current;

    if (override && (override.from !== from || override.to !== to)) {
      return override;
    }

    return range;
  }

  function selectTab(next: HomeTab) {
    if (next === activeTab) {
      return;
    }

    const generation = nav.beginNav();
    const { from: nextFrom, to: nextTo } = resolveRange();
    startTransition(() => {
      setOptimisticTab(next);

      if (!nav.isCurrentNav(generation)) {
        return;
      }

      router.push(
        buildHomeHref({
          tab: next,
          from: nextFrom,
          to: nextTo,
        }),
      );
    });
  }

  return (
    <HomeNavContext.Provider value={nav}>
      <div
        className="flex h-[calc(100dvh-3.5rem-1px)] min-h-0 flex-col"
        aria-busy={isPending}
      >
        <HomeTabs
          tab={activeTab}
          from={range.from}
          to={range.to}
          pending={isPending}
          onSelect={selectTab}
        />
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto motion-reduce:transition-none transition-opacity duration-200",
            isPending && "pointer-events-none opacity-60",
          )}
          key={tab}
        >
          {children}
        </div>
      </div>
    </HomeNavContext.Provider>
  );
}
