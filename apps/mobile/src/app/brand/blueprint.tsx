import { type BrandBlueprint, brandBlueprintSchema, CONTENT_FORMATS, labelOf } from "@tapkit/core";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { Field, Input } from "@/components/forms";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorState, Loading, Notice } from "@/components/states";
import { Badge, BasisTag, Button, Card, Divider, Row, SectionHeader, Stack, Text } from "@/components/ui";
import type { AppError } from "@/lib/errors";
import { type Blueprint, useAcceptBlueprint, useBlueprints, useGenerateBlueprint, useUpdateBlueprint } from "@/lib/queries";
import { colors, space } from "@/theme/tokens";
import { alert } from "@/lib/confirm";

export default function BlueprintScreen() {
  const params = useLocalSearchParams<{ id?: string; onboarding?: string }>();
  const fromOnboarding = params.onboarding === "1";
  const list = useBlueprints();
  const accept = useAcceptBlueprint();
  const update = useUpdateBlueprint();
  const regen = useGenerateBlueprint();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<BrandBlueprint | null>(null);
  const [feedback, setFeedback] = useState("");
  const [showRegen, setShowRegen] = useState(false);

  const bp: Blueprint | undefined = useMemo(() => {
    const rows = list.data ?? [];
    return (params.id && rows.find((b) => b.id === params.id)) || rows.find((b) => b.status === "generated") || rows.find((b) => b.status === "accepted") || rows[0];
  }, [list.data, params.id]);

  if (list.isLoading) return <Loading />;
  if (list.error) return <ErrorState error={list.error} onRetry={() => list.refetch()} />;
  if (!bp) return <EmptyState icon="compass-outline" title="No blueprint yet" body="Answer a few questions and TapKit will draft one for you." action="Start" onAction={() => router.replace("/onboarding")} />;

  const c = editing && draft ? draft : bp.content;
  const isPending = bp.status === "generated";

  const doAccept = () =>
    accept.mutate(
      { id: bp.id, replacePillars: true },
      { onSuccess: () => (fromOnboarding ? router.replace("/(tabs)/home") : router.back()), onError: (e) => alert("Couldn't accept", (e as Error).message) },
    );

  const saveEdits = () => {
    if (!draft) return;
    const parsed = brandBlueprintSchema.safeParse(draft);
    if (!parsed.success) return alert("Check your edits", parsed.error.issues[0]?.message ?? "Some fields are invalid");
    update.mutate({ id: bp.id, patch: { content: parsed.data } }, { onSuccess: () => setEditing(false) });
  };

  const regenerate = () =>
    regen.mutate(feedback.trim() || undefined, {
      onSuccess: (r) => {
        setShowRegen(false);
        setFeedback("");
        router.setParams({ id: r.blueprint.id });
      },
    });

  const reject = () =>
    alert("Reject this blueprint?", "It stays in your history. You can regenerate or edit your answers.", [
      { text: "Cancel", style: "cancel" },
      { text: "Reject", style: "destructive", onPress: () => update.mutate({ id: bp.id, patch: { status: "rejected" } }) },
    ]);

  const setField = <K extends keyof BrandBlueprint>(k: K, v: BrandBlueprint[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  return (
    <Screen
      edges={["bottom"]}
      footer={
        isPending && !editing ? (
          <Stack gap={space.sm}>
            <Button title="Accept & use this blueprint" icon="checkmark-circle" size="lg" loading={accept.isPending} onPress={doAccept} />
            <Row gap={space.sm}>
              <Button title="Edit" icon="create-outline" variant="secondary" style={{ flex: 1 }} onPress={() => { setDraft(bp.content); setEditing(true); }} />
              <Button title="Regenerate" icon="refresh" variant="secondary" style={{ flex: 1 }} onPress={() => setShowRegen(true)} />
            </Row>
          </Stack>
        ) : editing ? (
          <Row gap={space.sm}>
            <Button title="Cancel" variant="secondary" style={{ flex: 1 }} onPress={() => setEditing(false)} />
            <Button title="Save edits" style={{ flex: 2 }} loading={update.isPending} onPress={saveEdits} />
          </Row>
        ) : undefined
      }
    >
      <Row style={{ justifyContent: "space-between" }}>
        <Badge label={`Version ${bp.version}`} />
        <Badge label={bp.status === "accepted" ? "Accepted" : bp.status === "generated" ? "Awaiting your decision" : bp.status === "rejected" ? "Rejected" : "Superseded"} tone={bp.status === "accepted" ? "success" : bp.status === "generated" ? "brand" : "neutral"} />
      </Row>

      <Notice tone="info" title="How to read this" body="Items marked “From your answers” are based on what you told us. “Hypothesis to test” items are TapKit's suggestions — validate them with real results." />

      {showRegen && (
        <Card tone="brand">
          <Stack>
            <Text variant="subheading">What should change?</Text>
            <Input value={feedback} onChangeText={setFeedback} multiline multilineHeight={80} maxLength={1000} placeholder="e.g. Focus more on freelancing, less on fitness" />
            {regen.error && <Notice tone="danger" title={(regen.error as AppError).message} action={(regen.error as AppError).upgrade ? "See Pro" : undefined} onAction={() => router.push("/paywall")} />}
            <Row gap={space.sm}>
              <Button title="Cancel" variant="secondary" style={{ flex: 1 }} onPress={() => setShowRegen(false)} />
              <Button title="Regenerate" style={{ flex: 2 }} loading={regen.isPending} onPress={regenerate} />
            </Row>
          </Stack>
        </Card>
      )}

      <Section title="Positioning">
        {editing ? (
          <Input value={c.positioning_statement} onChangeText={(t) => setField("positioning_statement", t)} multiline maxLength={400} accessibilityLabel="Positioning statement" />
        ) : (
          <Text variant="heading">{c.positioning_statement}</Text>
        )}
        <Why text={c.positioning_rationale} />
      </Section>

      <Section title="Target audience" right={<BasisTag basis={c.target_audience.basis} />}>
        {editing ? (
          <Input value={c.target_audience.description} onChangeText={(t) => setField("target_audience", { ...c.target_audience, description: t })} multiline maxLength={400} accessibilityLabel="Audience" />
        ) : (
          <Text>{c.target_audience.description}</Text>
        )}
        <Bullets label="They need" items={c.target_audience.needs} />
        <Bullets label="They're interested in" items={c.target_audience.interests} />
      </Section>

      <Section title="What makes you different">
        {c.differentiators.map((d, i) => (
          <Row key={i} align="flex-start">
            <Text style={{ flex: 1 }}>• {d.point}</Text>
            <BasisTag basis={d.basis} />
          </Row>
        ))}
      </Section>

      <Section title="Brand promise">
        {editing ? <Input value={c.brand_promise} onChangeText={(t) => setField("brand_promise", t)} multiline multilineHeight={70} maxLength={300} accessibilityLabel="Brand promise" /> : <Text variant="bodyStrong">{c.brand_promise}</Text>}
      </Section>

      <Section title="Voice">
        <Text>{c.brand_voice.summary}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {c.brand_voice.traits.map((t) => (
            <Badge key={t} label={t} tone="brand" />
          ))}
        </View>
        <Bullets label="Do" items={c.brand_voice.do} />
        <Bullets label="Avoid" items={c.brand_voice.avoid} />
      </Section>

      <Section title="Core values">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {c.core_values.map((v) => (
            <Badge key={v} label={v} tone="dark" />
          ))}
        </View>
      </Section>

      <SectionHeader title="Content pillars" subtitle="The 3–5 themes you'll be known for." />
      {c.content_pillars.map((p, i) => (
        <Card key={i}>
          <Stack gap={space.sm}>
            <Row style={{ justifyContent: "space-between" }} align="flex-start">
              {editing ? (
                <Input style={{ flex: 1 }} value={p.name} maxLength={60} onChangeText={(t) => setField("content_pillars", c.content_pillars.map((x, j) => (j === i ? { ...x, name: t } : x)))} accessibilityLabel={`Pillar ${i + 1} name`} />
              ) : (
                <Text variant="subheading" style={{ flex: 1 }}>
                  {p.name}
                </Text>
              )}
              <BasisTag basis={p.basis} />
            </Row>
            <Text color={colors.inkSoft}>{p.description}</Text>
            <Bullets label="Example topics" items={p.example_topics} />
            <Why text={p.rationale} />
          </Stack>
        </Card>
      ))}

      <Section title="Recommended formats">
        {c.recommended_formats.map((f, i) => (
          <View key={i}>
            <Text variant="bodyStrong">{f.format}</Text>
            <Text variant="small" color={colors.muted}>
              {f.why}
            </Text>
          </View>
        ))}
      </Section>

      <Section title="First content ideas">
        {c.initial_content_ideas.map((idea, i) => (
          <View key={i} style={{ gap: 2 }}>
            <Row>
              <Text variant="bodyStrong" style={{ flex: 1 }}>
                {idea.title}
              </Text>
              {idea.uses_user_experience && <Badge label="Uses your story" tone="success" />}
            </Row>
            <Text variant="small" color={colors.muted}>
              {labelOf(CONTENT_FORMATS, idea.format)} · {idea.pillar} — {idea.angle}
            </Text>
          </View>
        ))}
      </Section>

      <Section title="Cadence">
        <Text variant="bodyStrong">{c.publishing_cadence.posts_per_week} posts per week</Text>
        <Why text={c.publishing_cadence.rationale} />
      </Section>

      <Section title="Your first week">
        {c.first_week_plan.map((d, i) => (
          <Row key={i} align="flex-start">
            <Badge label={`Day ${d.day}`} tone="brand" />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{d.task}</Text>
              <Text variant="small" color={colors.muted}>
                {d.why}
              </Text>
            </View>
          </Row>
        ))}
      </Section>

      <Section title="Ways this could pay off">
        {c.monetisation_paths.map((m, i) => (
          <View key={i} style={{ gap: 2 }}>
            <Row>
              <Text variant="bodyStrong" style={{ flex: 1 }}>
                {m.path}
              </Text>
              <Badge label={m.readiness === "now" ? "Ready now" : m.readiness === "soon" ? "Soon" : "Later"} tone={m.readiness === "now" ? "success" : m.readiness === "soon" ? "warning" : "neutral"} />
            </Row>
            <Text variant="small" color={colors.inkSoft}>
              {m.description}
            </Text>
            <Why text={m.rationale} />
          </View>
        ))}
      </Section>

      <Section title="Facts vs. hypotheses">
        <Bullets label="Facts from your answers" items={c.facts_used} />
        <Bullets label="Assumptions to validate" items={c.hypotheses} />
      </Section>

      {isPending && !editing && <Button title="Reject this version" variant="danger" onPress={reject} />}
    </Screen>
  );
}

function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <Card>
      <Stack gap={space.sm}>
        <Row style={{ justifyContent: "space-between" }}>
          <Text variant="overline" color={colors.brandText}>
            {title}
          </Text>
          {right}
        </Row>
        {children}
      </Stack>
    </Card>
  );
}

function Why({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <>
      <Divider />
      <Text variant="small" color={colors.muted}>
        <Text variant="smallStrong" color={colors.muted}>
          Why:{" "}
        </Text>
        {text}
      </Text>
    </>
  );
}

function Bullets({ label, items }: { label: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <Field label={label}>
      <View style={{ gap: 2 }}>
        {items.map((it, i) => (
          <Text key={i} variant="small">
            • {it}
          </Text>
        ))}
      </View>
    </Field>
  );
}
