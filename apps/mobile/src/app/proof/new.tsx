import { PROOF_KINDS, type ProofKind, proofEntryInputSchema } from "@tapkit/core";
import { File } from "expo-file-system";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Field, Input, SegmentedControl, TagInput } from "@/components/forms";
import { Screen } from "@/components/Screen";
import { Notice } from "@/components/states";
import { Button, ChipGroup, Stack, Text } from "@/components/ui";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { ai, invoke } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { useCreateProof, usePillars } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { colors, space } from "@/theme/tokens";

const PROMPTS: Partial<Record<ProofKind, string>> = {
  lesson: "What did you learn, and what happened that taught you?",
  story: "Set the scene. What happened, how did it feel, how did it end?",
  opinion: "What do you believe that others in your space might disagree with?",
  achievement: "What did you achieve? Include real numbers only if you have them.",
  challenge: "What went wrong, and what would you do differently?",
  idea: "Jot down the idea — rough is fine.",
  project_update: "What did you work on, and what changed?",
  observation: "What did you notice that others might miss?",
  note: "Anything worth remembering.",
};

export default function NewProof() {
  const { session } = useAuth();
  const params = useLocalSearchParams<{ kind?: string }>();
  const [mode, setMode] = useState<"write" | "voice" | "link">(params.kind === "voice" ? "voice" : params.kind === "link" ? "link" : "write");
  const [kind, setKind] = useState<ProofKind>((params.kind as ProofKind) && params.kind !== "voice" && params.kind !== "link" ? (params.kind as ProofKind) : "lesson");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [pillarId, setPillarId] = useState<string | null>(null);
  const [audio, setAudio] = useState<{ uri: string; ms: number } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const pillars = usePillars();
  const create = useCreateProof();

  const writeKinds = PROOF_KINDS.filter((k) => k.id !== "voice" && k.id !== "link");

  const save = async () => {
    setErrors({});
    const effectiveKind: ProofKind = mode === "voice" ? "voice" : mode === "link" ? "link" : kind;
    if (mode === "voice" && !audio) return setErrors({ _form: "Record a voice note first." });
    const parsed = proofEntryInputSchema.safeParse({
      kind: effectiveKind,
      title: title || undefined,
      body: body || (mode === "voice" ? "(voice note)" : undefined),
      link_url: mode === "link" ? link : undefined,
      tags,
      pillar_id: pillarId,
    });
    if (!parsed.success) {
      const out: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (out[String(i.path[0] ?? "_form")] ??= i.message));
      return setErrors(out);
    }
    setBusy(true);
    try {
      let audio_path: string | null = null;
      if (mode === "voice" && audio && session) {
        audio_path = `${session.user.id}/${Date.now()}.m4a`;
        const bytes = await new File(audio.uri).bytes();
        const { error } = await supabase.storage.from("voice-notes").upload(audio_path, bytes, { contentType: "audio/m4a" });
        if (error) throw new AppError("Couldn't upload your recording. Check your connection and try again.", "upload");
      }
      const result = await create.mutateAsync({
        ...parsed.data,
        body: mode === "voice" ? body || null : parsed.data.body,
        audio_path,
        audio_duration_ms: audio?.ms ?? null,
        transcription_status: audio_path ? "pending" : null,
        classification_status: "pending",
      });
      if (result.queued || !result.entry) {
        router.back();
        return;
      }
      const id = result.entry.id;
      // Organise in the background; saving never depends on AI succeeding.
      (async () => {
        if (audio_path) await invoke("transcribe", { entry_id: id }).catch(() => undefined);
        await ai("classify_proof", { entry_id: id }).catch(() => undefined);
      })();
      router.replace(`/proof/${id}`);
    } catch (e) {
      setErrors({ _form: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={["bottom"]} footer={<Button title="Save to Proof Bank" size="lg" icon="archive" loading={busy} onPress={save} />}>
      <Text variant="small" color={colors.muted}>
        Private by default. TapKit never publishes anything from your Proof Bank automatically.
      </Text>
      <SegmentedControl options={[{ id: "write", label: "Write" }, { id: "voice", label: "Voice" }, { id: "link", label: "Link" }]} value={mode} onChange={setMode} />
      {errors._form && <Notice tone="danger" title={errors._form} />}

      {mode === "write" && (
        <Stack>
          <Field label="What is it?">
            <ChipGroup options={writeKinds} value={[kind]} onChange={(v) => v[0] && setKind(v[0] as ProofKind)} />
          </Field>
          <Field label="Your words" error={errors.body}>
            <Input value={body} onChangeText={setBody} multiline multilineHeight={160} maxLength={8000} placeholder={PROMPTS[kind]} autoFocus accessibilityLabel="Entry text" />
          </Field>
        </Stack>
      )}

      {mode === "voice" && (
        <Stack>
          <VoiceRecorder recordedUri={audio?.uri} onRecorded={(uri, ms) => setAudio({ uri, ms })} onDiscard={() => setAudio(null)} />
          <Field label="Quick summary" optional hint="Transcription runs automatically when enabled. You can also type a summary.">
            <Input value={body} onChangeText={setBody} multiline multilineHeight={90} maxLength={8000} />
          </Field>
        </Stack>
      )}

      {mode === "link" && (
        <Stack>
          <Field label="Link" error={errors.link_url}>
            <Input value={link} onChangeText={setLink} autoCapitalize="none" keyboardType="url" placeholder="https://" autoFocus accessibilityLabel="Link URL" />
          </Field>
          <Field label="Why did you save it?" optional>
            <Input value={body} onChangeText={setBody} multiline multilineHeight={100} maxLength={8000} placeholder="What's the takeaway, and do you agree?" />
          </Field>
        </Stack>
      )}

      <Field label="Title" optional hint="Leave blank and TapKit will suggest one.">
        <Input value={title} onChangeText={setTitle} maxLength={140} />
      </Field>
      {(pillars.data?.length ?? 0) > 0 && (
        <Field label="Content pillar" optional hint="Leave blank and TapKit will suggest one.">
          <ChipGroup options={(pillars.data ?? []).map((p) => ({ id: p.id, label: p.name }))} value={pillarId ? [pillarId] : []} onChange={(v) => setPillarId(v[0] ?? null)} />
        </Field>
      )}
      <Field label="Tags" optional>
        <TagInput value={tags} onChange={setTags} max={12} />
      </Field>
      <Text variant="caption" color={colors.subtle} style={{ marginTop: space.sm }}>
        Tip: real details (what happened, what you learned) make the strongest content.
      </Text>
    </Screen>
  );
}
