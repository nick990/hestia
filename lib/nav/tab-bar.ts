export type AppTab = "cashflow" | "saldi" | "notes" | "evidenza" | null;

export function resolveAppTab(pathname: string): AppTab {
  if (pathname === "/cashflow" || pathname.startsWith("/cashflow/")) {
    return "cashflow";
  }

  if (pathname === "/saldi" || pathname.startsWith("/saldi/")) {
    return "saldi";
  }

  if (pathname === "/notes" || pathname.startsWith("/notes/")) {
    return "notes";
  }

  if (pathname === "/evidenza" || pathname.startsWith("/evidenza/")) {
    return "evidenza";
  }

  return null;
}
