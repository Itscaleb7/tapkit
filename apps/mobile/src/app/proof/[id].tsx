import { Ionicons } from "@expo/vector-icons";
import { PROOF_KINDS, type ProofClassification, proofEntryInputSchema } from "@tapkit/core";
import { router, Stack as RouterStack, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { Field, Input, TagInput } from "@/components/forms";
import { Screen } from "@/components/Screen";
import { ErrorState, Loading, Notice } from "@/components/states";
import { Badge, Button, Card, ChipGroup, IconButton, Row, Stack, Text } from "@/components/ui";
import type { AppError } from "@/lib/errors";
import { useClassifyProof, useDeleteProof, usePillars, useProofEntry, useTranscribe, useUpdateProof } from "@/lib/queries";
import { colors, space } from "@/theme/tokens";
import { alert } from "@/lib/confirm";

export default function ProofDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const entry = useProofEntry(id);
  const pillars = usePillars();
  const update = useUpdateProof();
  const del = useDeleteProof();
  const classify = useClassifyProof();
  const transcribe = useTranscribe();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: "", body: "", tags: [] as string[], pillar_id: null as string | null });
  const [error, setError] = useState<string>();

  const e = entry.data;
  useEffect(() => {
    if (e) setDraft({ title: e.title ?? "", body: e.body ?? "", tags: e.tags, pillar_id: e.pillar_id });
  }, [e]);

  // Poll briefly while background transcription/classification is running.
  useEffect(() => {
    if (!e || (e.classification_status !== "pending" && e.transcription_status !== "pending")) return;
    const t = setTimeout(() => entry.refetch(), 3000);
    return () => clearTimeout(t);
  }, [e, entry]);

  if (entry.isLoading) return <Loading />;
  if (entry.error || !e) return <ErrorState error={entry.error ?? "Entry not found"} onRetry={() => entry.refetch()} />;

  const kind = PROOF_KINDS.find((k) => k.id === e.kind);
  const suggestion = e.ai_suggestion as ProofClassification | null;
  const pillar = pillars.data?.find((p) => p.id === e.pillar_id);

  const save = () => {
    const parsed = proofEntryInputSchema.safeParse({ kind: e.kind, title: draft.title || undefined, body: draft.body || undefined, link_url: e.link_url ?? undefined, tags: draft.tags, pillar_id: draft.pillar_id });
    if (!parsed.success && !(e.kind === "voice" && e.audio_path)) return setError(parsed.error.issues[0]?.message);
    update.mutate(
      { id: e.id, patch: { title: draft.title || null, body: draft.body || null, tags: draft.tags, pillar_id: draft.pillar_id, classification_status: e.classification_status === "pending" ? "manual" : e.classification_status } },
      { onSuccess: () => { setEditing(false); setError(undefined); }, onError: (x) => setError((x as Error).message) },
    );
  };

  const remove = () =>
    alert("Delete this entry?", "This permanently removes it (and any recording) from your Proof Bank. Content already created from it is kept.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => del.mutate(e, { onSuccess: () => router.back() }) },
    ]);

  const applySuggestion = (patch: Record<string, unknown>) => update.mutate({ id: e.id, patch });

  return (
    <Screen
      edges={["bottom"]}
      footer={
        editing ? (
          <Row gap={space.sm}>
            <Button title="Cancel" variant="secondary" style={{ flex: 1 }} onPress={() => setEditing(false)} />
            <Button title="Save" style={{ flex: 2 }} loading={update.isPending} onPress={save} />
          </Row>
        ) : (
          <Button title="Turn into content" icon="sparkles" size="lg" onPress={() => router.push({ pathname: "/content/new", params: { entry: e.id } })} />
        )
      }
    >
      <RouterStack.Screen
        options={{
          headerRight: () => (
            <Row gap={0}>
              <IconButton icon={e.pinned ? "pin" : "pin-outline"} label={e.pinned ? "Unpin" : "Pin"} color={e.pinned ? colors.brand : colors.ink} onPress={() => update.mutate({ id: e.id, patch: { pinned: !e.pinned } })} />
              {!editing && <IconButton icon="create-outline" label="Edit entry" onPress={() => setEditing(true)} />}
            </Row>
          ),
        }}
      />
      <Row>
        <Ionicons name={(kind?.icon ?? "document-text-outline") as never} size={18} color={colors.brandText} />
        <Text variant="smallStrong" color={colors.brandText}>
          {kind?.label}
        </Text>
        <Text variant="small" color={colors.muted}>
          · {new Date(e.created_at).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
        </Text>
      </Row>
      {error && <Notice tone="danger" title={error} />}

      {editing ? (
        <Stack>
          <Field label="Title">
            <Input value={draft.title} onChangeText={(t) => setDraft({ ...draft, title: t })} maxLength={140} />
          </Field>
          <Field label="Your words">
            <Input value={draft.body} onChangeText={(t) => setDraft({ ...draft, body: t })} multiline multilineHeight={180} maxLength={8000} />
          </Field>
          <Field label="Content pillar">
            <ChipGroup options={(pillars.data ?? []).map((p) => ({ id: p.id, label: p.name }))} value={draft.pillar_id ? [draft.pillar_id] : []} onChange={(v) => setDraft({ ...draft, pillar_id: v[0] ?? null })} />
          </Field>
          <Field label="Tags">
            <TagInput value={draft.tags} onChange={(v) => setDraft({ ...draft, tags: v })} />
          </Field>
        </Stack>
      ) : (
        <Stack>
          {e.title && <Text variant="title">{e.title}</Text>}
          {e.body && <Text>{e.body}</Text>}
          {e.link_url && (
            <Card tone="muted" onPress={() => WebBrowser.openBrowserAsync(e.link_url!)} accessibilityLabel={`Open link ${e.link_url}`}>
              <Row>
                <Ionicons name="link" size={18} color={colors.brandText} />
                <Text variant="small" color={colors.brandText} numberOfLines={1} style={{ flex: 1 }}>
                  {e.link_url}
                </Text>
              </Row>
            </Card>
          )}
          {e.audio_path && (
            <Card tone="muted">
              <Stack gap={space.sm}>
                <Row>
                  <Ionicons name="mic" size={18} color={colors.brandText} />
                  <Text variant="smallStrong">Voice note{e.audio_duration_ms ? ` · ${Math.round(e.audio_duration_ms / 1000)}s` : ""}</Text>
                </Row>
                {e.transcript ? (
                  <Text variant="small">{e.transcript}</Text>
                ) : e.transcription_status === "pending" ? (
                  <Text variant="small" color={colors.muted}>
                    Transcribing…
                  </Text>
                ) : (
                  <>
                    <Text variant="small" color={colors.muted}>
                      {e.transcription_status === "unavailable" ? "Transcription isn't enabled yet — add a summary in your own words by tapping Edit." : "No transcript yet."}
                    </Text>
                    <Button title="Try transcription" size="sm" variant="secondary" style={{ alignSelf: "flex-start" }} loading={transcribe.isPending} onPress={() => transcribe.mutate(e.id)} />
                  </>
                )}
              </Stack>
            </Card>
          )}
          <Row gap={6} style={{ flexWrap: "wrap" }}>
            {pillar && <Badge label={pillar.name} tone="brand" icon="pricetag" />}
            {e.tags.map((t) => (
              <Badge key={t} label={`#${t}`} />
            ))}
            {e.used_count > 0 && <Badge label={`Used in ${e.used_count} post${e.used_count > 1 ? "s" : ""}`} tone="success" />}
          </Row>
        </Stack>
      )}

      <Card tone="brand">
        <Stack gap={space.sm}>
          <Row style={{ justifyContent: "space-between" }}>
            <Text variant="overline" color={colors.brandText}>
              TapKit's take
            </Text>
            <Badge label="AI suggestion" tone="brand" icon="sparkles" />
          </Row>
          {e.classification_status === "pending" || classify.isPending ? (
            <Text variant="small" color={colors.muted}>
              Organising this entry…
            </Text>
          ) : e.classification_status === "failed" || (!suggestion && e.classification_status !== "manual") ? (
            <>
              <Text variant="small" color={colors.muted}>
                {classify.error ? (classify.error as AppError).message : "Couldn't organise this entry automatically. It's saved — you can retry anytime."}
              </Text>
              <Button title="Retry" size="sm" variant="secondary" style={{ alignSelf: "flex-start" }} onPress={() => classify.mutate(e.id)} />
            </>
          ) : suggestion ? (
            <>
              <View>
                <Text variant="caption" color={colors.muted}>
                  Key insight
                </Text>
                <Text variant="bodyStrong">{e.key_insight ?? suggestion.key_insight}</Text>
              </View>
              <View>
                <Text variant="caption" color={colors.muted}>
                  Why your audience might care
                </Text>
                <Text variant="small">{e.audience_relevance ?? suggestion.audience_relevance}</Text>
              </View>
              <View style={{ gap: 4 }}>
                <Text variant="caption" color={colors.muted}>
                  Content angles
                </Text>
                {(e.content_angles.length ? e.content_angles : suggestion.content_angles).map((a, i) => (
                  <Text key={i} variant="small">
                    • {a}
                  </Text>
                ))}
              </View>
              {suggestion.kind !== e.kind && suggestion.kind !== "voice" && e.kind !== "voice" && e.kind !== "link" && (
                <Button title={`Mark as ${PROOF_KINDS.find((k) => k.id === suggestion.kind)?.label}`} size="sm" variant="ghost" style={{ alignSelf: "flex-start" }} onPress={() => applySuggestion({ kind: suggestion.kind })} />
              )}
              <Button title="Re-analyse" size="sm" variant="ghost" style={{ alignSelf: "flex-start" }} loading={classify.isPending} onPress={() => classify.mutate(e.id)} />
            </>
          ) : (
            <Button title="Analyse with TapKit" size="sm" variant="secondary" style={{ alignSelf: "flex-start" }} onPress={() => classify.mutate(e.id)} />
          )}
        </Stack>
      </Card>

      {!editing && <Button title="Delete entry" variant="danger" icon="trash-outline" onPress={remove} />}
    </Screen>
  );
}
