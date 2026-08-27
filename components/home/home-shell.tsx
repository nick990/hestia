"use client";

import { HomeTabs } from "@/components/home/home-tabs";
import { buildHomeHref, type HomeTab } from "@/lib/home/tab";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type ReactNode } from "react";

type HomeShellProps = {
  tab: HomeTab;
  from: string;
  to: string;
  children: ReactNode;
};

export function HomeShell({ tab, from, to, children }: HomeShellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState(tab);

  useEffect(() => {
    setActiveTab(tab);
  }, [tab]);

  function selectTab(next: HomeTab) {
    if (next === activeTab) {
      return;
    }

    setActiveTab(next);
    startTransition(() => {
      router.push(buildHomeHref({ tab: next, from, to }));
    });
  }

  return (
    <div
      className="flex h-[calc(100dvh-3.5rem-1px)] min-h-0 flex-col"
      aria-busy={isPending}
    >
      <HomeTabs
        tab={activeTab}
        from={from}
        to={to}
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
  );
}
