import { createBrowserClient } from "@supabase/ssr";

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
    url.startsWith("http") &&
    !url.includes("your_supabase_url") &&
    key &&
    key.length > 20 &&
    !key.includes("your_supabase_anon_key")
  );
}

export function createClient() {
  if (!isSupabaseConfigured()) {
    // Return dummy client proxy to prevent initialization crashes when keys are not yet configured
    return null as unknown as ReturnType<typeof createBrowserClient>;
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
