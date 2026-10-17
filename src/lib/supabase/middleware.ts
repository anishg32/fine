import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "./server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const configured = isSupabaseConfigured();

  // If Supabase is not configured, check for demo session cookie or permit access
  if (!configured) {
    const isDemo = request.cookies.get("fyza_demo_session")?.value === "true";
    const isAppRoute = request.nextUrl.pathname.startsWith("/app");
    const isAuthRoute =
      request.nextUrl.pathname === "/login" ||
      request.nextUrl.pathname === "/signup";

    // If authenticated via demo session and on auth route, redirect to app
    if (isDemo && isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/app";
      return NextResponse.redirect(url);
    }

    // If not authenticated via demo session and on app route, redirect to login
    if (!isDemo && isAppRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  // When Supabase is configured, handle real Supabase session
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check demo session cookie as well
  const isDemo = request.cookies.get("fyza_demo_session")?.value === "true";
  const isAuthenticated = Boolean(user || isDemo);

  // Protect /app routes
  if (!isAuthenticated && request.nextUrl.pathname.startsWith("/app")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users from auth pages to app
  if (
    isAuthenticated &&
    (request.nextUrl.pathname === "/login" ||
      request.nextUrl.pathname === "/signup")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
