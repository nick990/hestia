import { HomeTabs } from "@/components/home/home-tabs";
import type { HomeTab } from "@/lib/home/tab";
import type { ReactNode } from "react";

type HomeShellProps = {
  tab: HomeTab;
  from: string;
  to: string;
  children: ReactNode;
};

export function HomeShell({ tab, from, to, children }: HomeShellProps) {
  return (
    <div className="flex h-[calc(100dvh-3.5rem-1px)] min-h-0 flex-col">
      <HomeTabs tab={tab} from={from} to={to} />
      <div className="min-h-0 flex-1 overflow-y-auto" key={tab}>
        {children}
      </div>
    </div>
  );
}
