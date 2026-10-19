// Transcribes a voice note from private storage. Optional: requires TRANSCRIPTION_PROVIDER=openai
// and OPENAI_API_KEY. If not configured, the entry is marked "unavailable" and the
// user can type their own notes — the audio is still saved.
import { z } from "zod";
import { HttpError, json, readJson, serve } from "../_shared/http.ts";
import { adminClient, requireUser } from "../_shared/supabase.ts";

const body = z.object({ entry_id: z.string().uuid() });

serve(async (req) => {
  const db = adminClient();
  const user = await requireUser(req, db);
  const parsed = body.safeParse(await readJson(req));
  if (!parsed.success) throw new HttpError(400, "invalid_request", "entry_id is required");
  const { data: entry } = await db.from("proof_entries").select("id,audio_path,user_id").eq("id", parsed.data.entry_id).eq("user_id", user.id).maybeSingle();
  if (!entry?.audio_path) throw new HttpError(404, "not_found", "Voice note not found");
  if (!entry.audio_path.startsWith(`${user.id}/`)) throw new HttpError(403, "forbidden", "Not your file");

  const provider = Deno.env.get("TRANSCRIPTION_PROVIDER");
  const key = Deno.env.get("OPENAI_API_KEY");
  if (provider !== "openai" || !key) {
    await db.from("proof_entries").update({ transcription_status: "unavailable" }).eq("id", entry.id);
    return json(req, { available: false, message: "Transcription isn't enabled yet. Your recording is saved — add a quick summary in your own words." });
  }

  const { data: audio, error } = await db.storage.from("voice-notes").download(entry.audio_path);
  if (error || !audio) throw new HttpError(404, "not_found", "Recording not found");
  if (audio.size > 25 * 1024 * 1024) throw new HttpError(413, "too_large", "Recording is too long to transcribe");

  const form = new FormData();
  form.append("file", new File([audio], entry.audio_path.split("/").pop() ?? "note.m4a", { type: audio.type || "audio/m4a" }));
  form.append("model", Deno.env.get("TRANSCRIPTION_MODEL") ?? "gpt-4o-mini-transcribe");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) {
    await db.from("proof_entries").update({ transcription_status: "failed" }).eq("id", entry.id);
    throw new HttpError(502, "transcription_failed", "Transcription failed. You can try again or type a summary.");
  }
  const { text } = (await res.json()) as { text: string };
  const { data: updated } = await db
    .from("proof_entries")
    .update({ transcript: String(text ?? "").slice(0, 20000), transcription_status: "done" })
    .eq("id", entry.id)
    .select()
    .single();
  return json(req, { available: true, entry: updated });
});
