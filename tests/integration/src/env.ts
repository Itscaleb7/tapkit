import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Local Supabase stack defaults (`supabase start`). These are the public,
 * well-known local development keys — not secrets. Override via env for CI.
 */
export const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
export const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
export const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
export const admin = () => createClient(SUPABASE_URL, SERVICE_KEY, opts);
export const anon = () => createClient(SUPABASE_URL, ANON_KEY, opts);

export interface TestUser {
  id: string;
  email: string;
  password: string;
  client: SupabaseClient;
  accessToken: string;
}

export async function createUser(label: string): Promise<TestUser> {
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.tapkit.dev`;
  const password = "Passw0rd!123";
  const client = createClient(SUPABASE_URL, ANON_KEY, opts);
  const { data, error } = await client.auth.signUp({ email, password, options: { data: { display_name: label } } });
  if (error || !data.user || !data.session) throw error ?? new Error("signup failed (is email confirmation disabled locally?)");
  return { id: data.user.id, email, password, client, accessToken: data.session.access_token };
}

export async function deleteUser(u: TestUser | undefined) {
  if (u) await admin().auth.admin.deleteUser(u.id);
}

export async function makePro(userId: string, expiresInMs = 30 * 86_400_000) {
  const { error } = await admin()
    .from("subscriptions")
    .upsert({ user_id: userId, entitlement: "pro", is_active: true, product_id: "tapkit_pro_monthly", expires_at: new Date(Date.now() + expiresInMs).toISOString(), environment: "SANDBOX", store: "APP_STORE" });
  if (error) throw error;
}
