import { listMockAuthCandidates } from "@/app/actions/mock-auth";
import { MockUserSwitcher } from "@/components/auth/mock-user-switcher";
import { AppNav } from "@/components/layout/app-nav";
import { getCurrentMember } from "@/lib/auth/member";
import { isMockAuthEnabled } from "@/lib/auth/env";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const mockEnabled = isMockAuthEnabled();
  const mockCandidates = mockEnabled ? await listMockAuthCandidates() : null;
  const currentMember = mockEnabled ? await getCurrentMember() : null;

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppNav />
      <main className={`flex flex-1 flex-col ${mockEnabled ? "pb-14" : ""}`}>
        {children}
      </main>
      {mockEnabled && mockCandidates ? (
        <MockUserSwitcher
          candidates={mockCandidates}
          currentMemberId={currentMember?.id ?? null}
        />
      ) : null}
    </div>
  );
}
