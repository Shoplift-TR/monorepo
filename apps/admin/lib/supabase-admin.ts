import { createBrowserClient } from "@supabase/ssr";

export const supabaseAdmin = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "your_anon_key",
);
