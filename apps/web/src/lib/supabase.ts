import { createClient } from "@supabase/supabase-js";
import type { Database } from "@tapkit/core";
import { site } from "./config";

/** Anonymous client. It can only call the public RPCs; RLS blocks every private table. */
export function publicClient() {
  if (!site.supabaseUrl || !site.supabaseAnonKey) throw new Error("Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)");
  return createClient<Database>(site.supabaseUrl, site.supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
