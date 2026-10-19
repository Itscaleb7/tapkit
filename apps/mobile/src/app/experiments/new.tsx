import { CONTENT_FORMATS, experimentInputSchema, METRIC_DEFINITIONS, type MetricKey, metricsForPlatform, PLATFORMS } from "@tapkit/core";
import { router } from "expo-router";
import { useState } from "react";
import { Field, Input, Stepper } from "@/components/forms";
import { Screen } from "@/components/Screen";
import { Notice } from "@/components/states";
import { Button, Card, Chip, ChipGroup, Stack, Text } from "@/components/ui";
import { usePillars, useSaveExperiment } from "@/lib/queries";
import { colors, space } from "@/theme/tokens";

const IDEAS = [
  { title: "Stories vs tips", hypothesis: "My audience may respond better to personal lessons than general educational advice.", metric: "saves" },
  { title: "Hook style", hypothesis: "Question hooks may get more reach than statement hooks.", metric: "reach" },
  { title: "Carousel length", hypothesis: "Shorter 5-slide carousels may be shared more than 10-slide ones.", metric: "shares" },
];
const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function NewExperiment() {
  const pillars = usePillars();
  const save = useSaveExperiment();
  const [title, setTitle] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [objective, setObjective] = useState("");
  const [pillarId, setPillarId] = useState<string | null>(null);
  const [format, setFormat] = useState<string>("carousel");
  const [platform, setPlatform] = useState("instagram");
  const [planned, setPlanned] = useState(3);
  const [metrics, setMetrics] = useState<MetricKey[]>(["saves"]);
  const [start, setStart] = useState(() => iso(new Date()));
  const [end, setEnd] = useState(() => iso(new Date(Date.now() + 14 * 86_400_000)));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = () => {
    const parsed = experimentInputSchema.safeParse({ title, hypothesis, objective: objective || undefined, pillar_id: pillarId, format, platform, planned_posts: planned, success_metrics: metrics, start_date: start, end_date: end });
    if (!parsed.success) {
      const out: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (out[String(i.path[0] ?? "_form")] ??= i.message));
      return setErrors(out);
    }
    const status = parsed.data.start_date <= iso(new Date()) ? "running" : "planned";
    save.mutate({ ...parsed.data, status }, { onSuccess: (e) => router.replace(`/experiments/${e.id}`), onError: (e) => setErrors({ _form: (e as Error).message }) });
  };

  return (
    <Screen edges={["bottom"]} footer={<Button title="Start experiment" size="lg" loading={save.isPending} onPress={submit} />}>
      <Text color={colors.muted}>Test one idea at a time over a few posts. Small, honest experiments beat random posting.</Text>
      {errors._form && <Notice tone="danger" title={errors._form} action={/limit/i.test(errors._form) ? "See TapKit Pro" : undefined} onAction={() => router.push("/paywall")} />}
      {!hypothesis && (
        <Card tone="muted">
          <Stack gap={space.sm}>
            <Text variant="smallStrong">Need an idea?</Text>
            {IDEAS.map((i) => (
              <Chip key={i.title} label={i.title} onPress={() => { setTitle(i.title); setHypothesis(i.hypothesis); setMetrics([i.metric as MetricKey]); }} />
            ))}
          </Stack>
        </Card>
      )}
      <Field label="Name" error={errors.title}>
        <Input value={title} onChangeText={setTitle} maxLength={120} placeholder="e.g. Stories vs tips" />
      </Field>
      <Field label="Hypothesis" error={errors.hypothesis} hint="“My audience may respond better to … than …”">
        <Input value={hypothesis} onChangeText={setHypothesis} multiline multilineHeight={80} maxLength={500} />
      </Field>
      <Field label="Objective" optional>
        <Input value={objective} onChangeText={setObjective} maxLength={300} placeholder="What will you do differently if it works?" />
      </Field>
      <Field label="Platform">
        <ChipGroup options={PLATFORMS} value={[platform as never]} onChange={(v) => { if (!v[0]) return; setPlatform(v[0]); setMetrics((m) => m.filter((k) => metricsForPlatform(v[0]).includes(k))); }} />
      </Field>
      <Field label="Format">
        <ChipGroup options={CONTENT_FORMATS.filter((f) => f.slides)} value={[format as never]} onChange={(v) => v[0] && setFormat(v[0])} />
      </Field>
      {(pillars.data?.length ?? 0) > 0 && (
        <Field label="Content pillar" optional>
          <ChipGroup options={(pillars.data ?? []).map((p) => ({ id: p.id, label: p.name }))} value={pillarId ? [pillarId] : []} onChange={(v) => setPillarId(v[0] ?? null)} />
        </Field>
      )}
      <Field label="Success metrics" error={errors.success_metrics} hint="Only metrics your platform reports are shown.">
        <ChipGroup options={metricsForPlatform(platform).map((k) => ({ id: k, label: METRIC_DEFINITIONS[k].label }))} value={metrics} onChange={(v) => setMetrics(v as MetricKey[])} multiple max={5} />
      </Field>
      <Field label="Planned posts" hint="3+ posts give a more reliable signal than 1.">
        <Stepper value={planned} onChange={setPlanned} min={1} max={30} label="planned posts" />
      </Field>
      <Field label="Start date" error={errors.start_date}>
        <Input value={start} onChangeText={setStart} maxLength={10} keyboardType="numbers-and-punctuation" />
      </Field>
      <Field label="End date" error={errors.end_date}>
        <Input value={end} onChangeText={setEnd} maxLength={10} keyboardType="numbers-and-punctuation" />
      </Field>
    </Screen>
  );
}
