export type AppTab = "cashflow" | "notes" | "evidenza" | null;

export function resolveAppTab(pathname: string): AppTab {
  if (pathname === "/cashflow" || pathname.startsWith("/cashflow/")) {
    return "cashflow";
  }

  if (pathname === "/notes" || pathname.startsWith("/notes/")) {
    return "notes";
  }

  if (pathname === "/evidenza" || pathname.startsWith("/evidenza/")) {
    return "evidenza";
  }

  return null;
}
