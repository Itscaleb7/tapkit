import { CONTENT_FORMATS, type ContentFormat, contentGenerationRequestSchema, GENERATION_SOURCES, type GenerationSource, SLIDE_TEMPLATES } from "@tapkit/core";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { Field, Input, Stepper } from "@/components/forms";
import { Screen } from "@/components/Screen";
import { Notice } from "@/components/states";
import { Badge, Button, Card, Chip, ChipGroup, Row, Stack, Text } from "@/components/ui";
import { useEntitlement } from "@/lib/entitlement";
import type { AppError } from "@/lib/errors";
import { useContentList, useCreateContent, useExperiments, useGenerateContent, usePillars, useProofEntries } from "@/lib/queries";
import { colors, space } from "@/theme/tokens";

const SOURCES_NEEDING_TOPIC: GenerationSource[] = ["topic", "audience_problem", "experience", "lesson", "goal", "blank"];
const TOPIC_PLACEHOLDER: Partial<Record<GenerationSource, string>> = {
  topic: "e.g. How to price your first freelance project",
  audience_problem: "e.g. My audience doesn't know how to start posting",
  experience: "Describe the experience in your own words",
  lesson: "What did you learn?",
  goal: "Which goal should this post support?",
  blank: "Any idea, however rough",
};

export default function NewContent() {
  const params = useLocalSearchParams<{ entry?: string; experiment?: string; pillar?: string; previous?: string }>();
  const initialSource: GenerationSource = params.entry ? "proof" : params.experiment ? "experiment" : params.pillar ? "pillar" : params.previous ? "previous_post" : "proof";
  const [source, setSource] = useState<GenerationSource>(initialSource);
  const [format, setFormat] = useState<ContentFormat>("carousel");
  const [entryIds, setEntryIds] = useState<string[]>(params.entry ? [params.entry] : []);
  const [pillarId, setPillarId] = useState<string | null>(params.pillar ?? null);
  const [topic, setTopic] = useState("");
  const [previousId, setPreviousId] = useState<string | null>(params.previous ?? null);
  const [experimentId, setExperimentId] = useState<string | null>(params.experiment ?? null);
  const [slideCount, setSlideCount] = useState(7);
  const [extra, setExtra] = useState("");
  const [error, setError] = useState<AppError | null>(null);

  const proof = useProofEntries({});
  const pillars = usePillars();
  const previous = useContentList();
  const experiments = useExperiments();
  const ent = useEntitlement();
  const gen = useGenerateContent();
  const createBlank = useCreateContent();

  const fmt = CONTENT_FORMATS.find((f) => f.id === format)!;
  const remaining = ent.data ? Math.max(0, ent.data.limits.aiGenerationsPerMonth - ent.data.usage.aiGenerationsThisMonth) : null;
  const pickedEntries = useMemo(() => (proof.data ?? []).filter((e) => entryIds.includes(e.id)), [proof.data, entryIds]);

  const generate = () => {
    setError(null);
    const req = {
      format,
      source,
      proof_entry_ids: source === "proof" ? entryIds : undefined,
      pillar_id: pillarId,
      topic: topic.trim() || undefined,
      previous_content_id: source === "previous_post" ? previousId ?? undefined : undefined,
      experiment_id: experimentId ?? undefined,
      slide_count: fmt.slides && format !== "single_image" ? slideCount : undefined,
      extra_instructions: extra.trim() || undefined,
    };
    if (source === "proof" && entryIds.length === 0) return setError({ message: "Pick at least one Proof Bank entry." } as AppError);
    if (source === "pillar" && !pillarId) return setError({ message: "Pick a content pillar." } as AppError);
    if (source === "previous_post" && !previousId) return setError({ message: "Pick a previous post to build on." } as AppError);
    if (source === "experiment" && !experimentId) return setError({ message: "Pick an experiment." } as AppError);
    if (SOURCES_NEEDING_TOPIC.includes(source) && !req.topic) return setError({ message: "Add a few words to work from." } as AppError);
    const parsed = contentGenerationRequestSchema.safeParse(req);
    if (!parsed.success) return setError({ message: parsed.error.issues[0]?.message ?? "Check your inputs" } as AppError);
    gen.mutate(parsed.data, { onSuccess: (r) => router.replace(`/content/${r.content.id}`), onError: (e) => setError(e as AppError) });
  };

  const startBlank = () =>
    createBlank.mutate(
      {
        title: topic.trim() || "Untitled carousel",
        format,
        status: "draft",
        pillar_id: pillarId,
        generation_source: "blank",
        slides: (format === "single_image" ? [SLIDE_TEMPLATES[0]!.make()] : [SLIDE_TEMPLATES[0]!.make(), SLIDE_TEMPLATES[1]!.make(), SLIDE_TEMPLATES[2]!.make(), SLIDE_TEMPLATES[7]!.make()]) as never,
        experiment_id: experimentId,
      },
      { onSuccess: (c) => router.replace(`/content/${c.id}/editor`) },
    );

  return (
    <Screen
      edges={["bottom"]}
      footer={
        <Stack gap={space.sm}>
          <Button title={gen.isPending ? "Writing your post…" : "Generate with TapKit"} icon="sparkles" size="lg" loading={gen.isPending} onPress={generate} />
          {fmt.slides && <Button title="Start from a blank template instead" variant="ghost" loading={createBlank.isPending} onPress={startBlank} />}
        </Stack>
      }
    >
      {remaining !== null && (
        <Row style={{ justifyContent: "space-between" }}>
          <Text variant="small" color={colors.muted}>
            AI generations left this month
          </Text>
          <Badge label={String(remaining)} tone={remaining > 3 ? "neutral" : "warning"} />
        </Row>
      )}
      {error && <Notice tone="danger" title={error.message} action={error.upgrade ? "See TapKit Pro" : undefined} onAction={() => router.push("/paywall")} />}

      <Field label="Format">
        <ChipGroup options={CONTENT_FORMATS} value={[format]} onChange={(v) => v[0] && setFormat(v[0])} />
      </Field>

      <Field label="Start from">
        <ChipGroup options={GENERATION_SOURCES} value={[source]} onChange={(v) => v[0] && setSource(v[0])} />
      </Field>

      {source === "proof" && (
        <Field label="Proof Bank entries" hint="Pick up to 5. TapKit builds the post around your real details.">
          {(proof.data?.length ?? 0) === 0 ? (
            <Notice tone="info" title="Your Proof Bank is empty" body="Capture an experience first, or choose another starting point." action="Capture now" onAction={() => router.push("/proof/new")} />
          ) : (
            <View style={{ gap: space.sm }}>
              {(proof.data ?? []).slice(0, 30).map((e) => {
                const selected = entryIds.includes(e.id);
                return (
                  <Card
                    key={e.id}
                    tone={selected ? "brand" : "default"}
                    onPress={() => setEntryIds(selected ? entryIds.filter((x) => x !== e.id) : entryIds.length < 5 ? [...entryIds, e.id] : entryIds)}
                    accessibilityLabel={`${selected ? "Deselect" : "Select"} ${e.title ?? e.body ?? "entry"}`}
                    style={{ padding: space.md }}
                  >
                    <Text variant="smallStrong" numberOfLines={1}>
                      {selected ? "✓ " : ""}
                      {e.title || e.body?.slice(0, 60) || "Untitled"}
                    </Text>
                    {e.key_insight && (
                      <Text variant="caption" color={colors.muted} numberOfLines={1}>
                        {e.key_insight}
                      </Text>
                    )}
                  </Card>
                );
              })}
            </View>
          )}
          {pickedEntries.length > 0 && (
            <Text variant="caption" color={colors.muted}>
              {pickedEntries.length} selected
            </Text>
          )}
        </Field>
      )}

      {(source === "pillar" || (pillars.data?.length ?? 0) > 0) && (
        <Field label={source === "pillar" ? "Content pillar" : "Content pillar (optional)"}>
          <ChipGroup options={(pillars.data ?? []).map((p) => ({ id: p.id, label: p.name }))} value={pillarId ? [pillarId] : []} onChange={(v) => setPillarId(v[0] ?? null)} />
        </Field>
      )}

      {source === "previous_post" && (
        <Field label="Build on which post?">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
            {(previous.data ?? []).slice(0, 20).map((c) => (
              <Chip key={c.id} label={c.title} selected={previousId === c.id} onPress={() => setPreviousId(c.id)} />
            ))}
          </View>
        </Field>
      )}

      {(source === "experiment" || experimentId) && (
        <Field label="Growth experiment" hint="The post will be linked to this experiment.">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
            {(experiments.data ?? [])
              .filter((x) => x.status === "planned" || x.status === "running")
              .map((x) => (
                <Chip key={x.id} label={x.title} selected={experimentId === x.id} onPress={() => setExperimentId(experimentId === x.id ? null : x.id)} />
              ))}
          </View>
        </Field>
      )}

      {(SOURCES_NEEDING_TOPIC.includes(source) || source === "pillar") && (
        <Field label={source === "pillar" ? "Angle (optional)" : "Your starting point"}>
          <Input value={topic} onChangeText={setTopic} multiline multilineHeight={90} maxLength={500} placeholder={TOPIC_PLACEHOLDER[source] ?? "Optional angle"} />
        </Field>
      )}

      {fmt.slides && format !== "single_image" && (
        <Field label="Number of slides">
          <Stepper value={slideCount} onChange={setSlideCount} min={3} max={10} label="slides" />
        </Field>
      )}

      <Field label="Anything else?" optional>
        <Input value={extra} onChangeText={setExtra} maxLength={500} placeholder="e.g. keep it playful, mention I'm a beginner" />
      </Field>

      <Text variant="caption" color={colors.subtle}>
        TapKit only uses your real experiences and accepted brand. It won't invent results, credentials or stories — anything that needs a fact you haven't provided is left as a [placeholder] for you to fill in.
      </Text>
    </Screen>
  );
}
