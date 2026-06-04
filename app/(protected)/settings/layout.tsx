import { SettingsNav } from "@/components/settings/settings-nav";
import { getCurrentMember } from "@/lib/auth/member";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const member = await getCurrentMember();
  const isAdmin = member?.role === "admin" && !member.disabled_at;

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 p-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Impostazioni</h1>
      <div className="flex flex-col gap-8 sm:flex-row">
        <SettingsNav isAdmin={isAdmin} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
