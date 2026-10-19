// Called by the app after a purchase/restore. Re-reads entitlement state from
// RevenueCat with the server secret and stores it — the client's own claim is never trusted.
import { HttpError, json, serve } from "../_shared/http.ts";
import { revenueCatConfigured, syncSubscription } from "../_shared/revenuecat.ts";
import { adminClient, requireUser } from "../_shared/supabase.ts";

serve(async (req) => {
  const db = adminClient();
  const user = await requireUser(req, db);
  if (!revenueCatConfigured()) throw new HttpError(503, "billing_not_configured", "Subscriptions are not configured on the server yet.");
  try {
    const row = await syncSubscription(db, user.id, "client_sync");
    return json(req, { plan: row.is_active ? "pro" : "free", subscription: row });
  } catch (err) {
    console.error("subscription sync failed", err instanceof Error ? err.message : String(err));
    throw new HttpError(502, "billing_unavailable", "We couldn't verify your subscription right now. Please try again.");
  }
});
