import { createServerClient } from "@supabase/ssr";
import { isMobileUserAgent } from "@/lib/device/is-mobile-user-agent";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/auth/callback", "/account-disabled"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

type MemberStatus = {
  role: string;
  disabled_at: string | null;
};

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) => {
            supabaseResponse.headers.set(key, value);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    if (pathname !== "/") {
      loginUrl.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === "/login") {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = isMobileUserAgent(request) ? "/" : "/cashflow";
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  if (user && pathname === "/" && !isMobileUserAgent(request)) {
    const cashflowUrl = request.nextUrl.clone();
    cashflowUrl.pathname = "/cashflow";
    return NextResponse.redirect(cashflowUrl);
  }

  if (pathname === "/dashboard") {
    const cashflowUrl = request.nextUrl.clone();
    cashflowUrl.pathname = "/cashflow";
    cashflowUrl.search = "";
    return NextResponse.redirect(cashflowUrl);
  }

  if (pathname === "/users" || pathname.startsWith("/users/")) {
    const usersUrl = request.nextUrl.clone();
    usersUrl.pathname = "/settings/users";
    return NextResponse.redirect(usersUrl);
  }

  if (user && !isPublicPath(pathname)) {
    const { data: member } = await supabase
      .from("members")
      .select("role, disabled_at")
      .eq("auth_user_id", user.id)
      .maybeSingle<MemberStatus>();

    if (!member || member.disabled_at) {
      await supabase.auth.signOut();
      const disabledUrl = request.nextUrl.clone();
      disabledUrl.pathname = "/account-disabled";
      disabledUrl.search = "";
      return NextResponse.redirect(disabledUrl);
    }

    if (
      (pathname === "/settings/users" || pathname.startsWith("/settings/users/")) &&
      member.role !== "admin"
    ) {
      const categoriesUrl = request.nextUrl.clone();
      categoriesUrl.pathname = "/settings/categories";
      categoriesUrl.search = "";
      return NextResponse.redirect(categoriesUrl);
    }
  }

  return supabaseResponse;
}
