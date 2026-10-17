import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app";
  const errorParam = searchParams.get("error_description") || searchParams.get("error");

  console.log("➡️ /auth/callback received:", {
    code: code ? `${code.substring(0, 8)}...` : null,
    error: errorParam,
    next,
  });

  if (errorParam) {
    console.error("❌ OAuth Error from Provider:", errorParam);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorParam)}`);
  }

  if (code) {
    const supabase = await createClient();
    if (supabase) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data?.session) {
        console.log("✅ Code exchanged successfully for user:", data.session.user.id);
        const cookieStore = await cookies();
        cookieStore.delete("fyza_demo_session");

        const forwardedHost = request.headers.get("x-forwarded-host");
        const isLocal = process.env.NODE_ENV === "development";
        if (isLocal) {
          return NextResponse.redirect(`${origin}${next}`);
        } else if (forwardedHost) {
          return NextResponse.redirect(`https://${forwardedHost}${next}`);
        } else {
          return NextResponse.redirect(`${origin}${next}`);
        }
      } else {
        console.error("❌ exchangeCodeForSession failed:", error?.message);
        const msg = error?.message || "Session exchange failed";
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(msg)}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=no_authorization_code_found`);
}
