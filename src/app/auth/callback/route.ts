import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url);
  // Graceful fallback for any residual OAuth callback redirects
  return NextResponse.redirect(`${origin}/app`);
}
