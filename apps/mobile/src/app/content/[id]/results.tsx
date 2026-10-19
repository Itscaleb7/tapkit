import { engagementRate, formatPercent, METRIC_DEFINITIONS, type MetricKey, metricSnapshotInputSchema, metricsForPlatform, PLATFORMS } from "@tapkit/core";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { Field, Input } from "@/components/forms";
import { Screen } from "@/components/Screen";
import { ErrorState, Loading, Notice } from "@/components/states";
import { Badge, Button, Card, ChipGroup, IconButton, Row, SectionHeader, Stack, Text } from "@/components/ui";
import { useAddMetric, useContent, useDeleteMetric, useMetrics } from "@/lib/queries";
import { colors, space } from "@/theme/tokens";
import { alert } from "@/lib/confirm";

const today = () => new Date().toISOString().slice(0, 10);

export default function RecordResults() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const content = useContent(id);
  const metrics = useMetrics({ contentId: id });
  const add = useAddMetric();
  const del = useDeleteMetric();
  const [platform, setPlatform] = useState("instagram");
  const [date, setDate] = useState(today());
  const [values, setValues] = useState<Partial<Record<MetricKey, string>>>({});
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (content.data?.platform) setPlatform(content.data.platform);
  }, [content.data?.platform]);

  if (content.isLoading) return <Loading />;
  if (content.error || !content.data) return <ErrorState error={content.error} onRetry={() => content.refetch()} />;
  const c = content.data;
  const available = metricsForPlatform(platform);

  const submit = () => {
    setSaved(false);
    const toNum = (v?: string) => (v === undefined || v.trim() === "" ? null : Number(v.replace(/[, ]/g, "")));
    const input = {
      content_id: c.id,
      experiment_id: c.experiment_id,
      platform,
      captured_on: date,
      notes: notes || undefined,
      ...Object.fromEntries(available.map((k) => [k, toNum(values[k])])),
    };
    for (const k of available) {
      const n = (input as Record<string, unknown>)[k];
      if (n !== null && (typeof n !== "number" || !Number.isFinite(n) || !Number.isInteger(n))) return setError(`${METRIC_DEFINITIONS[k].label} must be a whole number.`);
    }
    const parsed = metricSnapshotInputSchema.safeParse(input);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message);
    add.mutate(parsed.data as never, {
      onSuccess: () => {
        setValues({});
        setNotes("");
        setError(undefined);
        setSaved(true);
      },
      onError: (e) => setError((e as Error).message),
    });
  };

  return (
    <Screen edges={["bottom"]} footer={<Button title="Save results" size="lg" loading={add.isPending} onPress={submit} />}>
      <Text variant="heading">{c.title}</Text>
      <Text variant="small" color={colors.muted}>
        Copy the numbers from your platform's insights. Leave anything you don't have blank — TapKit never estimates missing metrics.
      </Text>
      {error && <Notice tone="danger" title={error} />}
      {saved && <Notice tone="success" title="Results saved" body="Add another snapshot later to track how the post performs over time." />}
      <Field label="Platform">
        <ChipGroup options={PLATFORMS} value={[platform as never]} onChange={(v) => v[0] && setPlatform(v[0])} />
      </Field>
      <Field label="Date captured" hint="YYYY-MM-DD">
        <Input value={date} onChangeText={setDate} maxLength={10} keyboardType="numbers-and-punctuation" />
      </Field>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.md }}>
        {available.map((k) => (
          <View key={k} style={{ width: "47%" }}>
            <Field label={METRIC_DEFINITIONS[k].label}>
              <Input
                value={values[k] ?? ""}
                onChangeText={(t) => setValues({ ...values, [k]: t })}
                keyboardType={k === "follower_change" ? "numbers-and-punctuation" : "number-pad"}
                placeholder="—"
                accessibilityLabel={`${METRIC_DEFINITIONS[k].label}: ${METRIC_DEFINITIONS[k].definition}`}
              />
            </Field>
          </View>
        ))}
      </View>
      <Field label="Notes" optional>
        <Input value={notes} onChangeText={setNotes} maxLength={500} placeholder="Anything unusual? e.g. posted late, shared by a big account" />
      </Field>

      <SectionHeader title="Recorded snapshots" />
      {metrics.data?.length ? (
        metrics.data.map((m) => (
          <Card key={m.id}>
            <Row style={{ justifyContent: "space-between" }}>
              <Stack gap={2}>
                <Text variant="bodyStrong">
                  {m.captured_on} · {PLATFORMS.find((p) => p.id === m.platform)?.label ?? m.platform}
                </Text>
                <Text variant="small" color={colors.muted}>
                  {(Object.keys(METRIC_DEFINITIONS) as MetricKey[])
                    .filter((k) => m[k] !== null)
                    .map((k) => `${METRIC_DEFINITIONS[k].label} ${m[k]}`)
                    .join(" · ")}
                </Text>
                <Badge label={`Engagement ${formatPercent(engagementRate(m))}`} tone="info" />
              </Stack>
              <IconButton
                icon="trash-outline"
                label="Delete snapshot"
                color={colors.danger}
                onPress={() => alert("Delete this snapshot?", undefined, [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => del.mutate(m.id) }])}
              />
            </Row>
          </Card>
        ))
      ) : (
        <Text color={colors.muted}>No results recorded yet.</Text>
      )}
    </Screen>
  );
}
