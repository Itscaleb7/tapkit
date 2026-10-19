// Permanently deletes the signed-in user's account and all associated data.
// Database rows cascade from auth.users; storage objects are removed explicitly.
import { z } from "zod";
import { HttpError, json, readJson, serve } from "../_shared/http.ts";
import { deleteSubscriber } from "../_shared/revenuecat.ts";
import { adminClient, requireUser } from "../_shared/supabase.ts";

const body = z.object({ confirm: z.literal("DELETE") });

async function removeFolder(db: ReturnType<typeof adminClient>, bucket: string, prefix: string) {
  for (let i = 0; i < 50; i++) {
    const { data, error } = await db.storage.from(bucket).list(prefix, { limit: 100 });
    if (error || !data?.length) return;
    const paths = data.map((f) => `${prefix}/${f.name}`);
    const { error: rmErr } = await db.storage.from(bucket).remove(paths);
    if (rmErr) throw rmErr;
  }
}

serve(async (req) => {
  const db = adminClient();
  const user = await requireUser(req, db);
  const parsed = body.safeParse(await readJson(req));
  if (!parsed.success) throw new HttpError(400, "confirmation_required", 'Type "DELETE" to confirm.');

  await removeFolder(db, "voice-notes", user.id);
  await removeFolder(db, "portfolio-media", user.id);
  // Removes the customer's purchase history from RevenueCat. The App Store subscription
  // itself must be cancelled by the user in iOS Settings (Apple does not allow apps to cancel it).
  await deleteSubscriber(user.id);
  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) throw new HttpError(500, "delete_failed", "We couldn't delete your account. Please contact support.");
  return json(req, { ok: true });
});
