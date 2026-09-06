import { AppTabBar } from "@/components/layout/app-tab-bar";
import {
  TabNavigationProvider,
  TabbedMain,
} from "@/components/layout/tab-navigation";
import { getCurrentUserFamily } from "@/lib/families/queries";

export default async function TabbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const family = await getCurrentUserFamily();

  return (
    <TabNavigationProvider>
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
        <AppTabBar hasFamily={family !== null} />
        <TabbedMain>{children}</TabbedMain>
      </div>
    </TabNavigationProvider>
  );
}
