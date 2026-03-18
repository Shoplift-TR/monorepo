import { createClient } from "@supabase/supabase-js";

// Uses SEPARATE env vars from apps/web — never share service role keys
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_ADMIN_SUPABASE_URL || "http://localhost:54321",
  process.env.NEXT_PUBLIC_ADMIN_SUPABASE_ANON_KEY || "your_anon_key",
);
