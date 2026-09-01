import { AppTabBar } from "@/components/layout/app-tab-bar";
import {
  TabNavigationProvider,
  TabbedMain,
} from "@/components/layout/tab-navigation";

export default function TabbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TabNavigationProvider>
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
        <AppTabBar />
        <TabbedMain>{children}</TabbedMain>
      </div>
    </TabNavigationProvider>
  );
}
