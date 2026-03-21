import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

/**
 * Supabase Browser Client
 *
 * Used for REAL-TIME SUBSCRIPTIONS only (Support Chat, Order Status).
 * Auth is handled exclusively via the API.
 */
export const createClient = () => {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};

export const supabase = createClient();
