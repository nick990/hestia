import { AppNav } from "@/components/layout/app-nav";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppNav />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
