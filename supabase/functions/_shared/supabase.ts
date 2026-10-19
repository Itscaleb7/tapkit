import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { HttpError } from "./http.ts";

const url = () => Deno.env.get("SUPABASE_URL")!;

/** Service-role client. Server-only; bypasses RLS, so every query must filter by the verified user id. */
export function adminClient(): SupabaseClient {
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return createClient(url(), key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export interface AuthedUser {
  id: string;
  email: string | null;
}

/** Verify the caller's JWT with Supabase Auth. Never trust a user id sent in the body. */
export async function requireUser(req: Request, admin: SupabaseClient): Promise<AuthedUser> {
  const header = req.headers.get("Authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "");
  if (!token) throw new HttpError(401, "unauthenticated", "Sign in to continue");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "unauthenticated", "Your session has expired. Please sign in again.");
  return { id: data.user.id, email: data.user.email ?? null };
}
