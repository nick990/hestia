import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

function getRedirectBaseUrl(request: NextRequest, origin: string) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";

  if (isLocalEnv) {
    return origin;
  }

  if (forwardedHost) {
    return `https://${forwardedHost}`;
  }

  return origin;
}

function missingEnvRedirect(origin: string) {
  return NextResponse.redirect(
    `${origin}/login?error=auth_callback_error&reason=${encodeURIComponent("Configurazione Supabase mancante su Vercel")}`,
  );
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  let next = searchParams.get("next") ?? "/";
  if (!next.startsWith("/")) {
    next = "/";
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return missingEnvRedirect(origin);
  }

  const redirectBase = getRedirectBaseUrl(request, origin);

  if (code) {
    const redirectUrl = `${redirectBase}${next}`;
    const supabaseResponse = NextResponse.redirect(redirectUrl);
    const cookieStore = await cookies();

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return supabaseResponse;
    }

    return NextResponse.redirect(
      `${redirectBase}/login?error=auth_callback_error&reason=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(`${redirectBase}/login?error=auth_callback_error`);
}
