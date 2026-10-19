import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const isDemo = request.cookies.get("fyza_demo_session")?.value === "true";
  const isAuth = request.cookies.get("fyza_session")?.value === "true";
  const isAuthenticated = isAuth || isDemo;

  const isAppRoute = request.nextUrl.pathname.startsWith("/app");
  const isAuthRoute =
    request.nextUrl.pathname === "/login" ||
    request.nextUrl.pathname === "/signup";

  // Redirect unauthenticated visitors attempting to access /app to /login
  if (!isAuthenticated && isAppRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated visitors from /login or /signup to /app
  if (isAuthenticated && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
