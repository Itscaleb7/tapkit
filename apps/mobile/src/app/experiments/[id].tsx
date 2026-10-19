import { computeExperimentStats, EVIDENCE_COPY, type ExperimentAnalysis, formatLift, formatPercent, METRIC_DEFINITIONS, type MetricKey, type MetricRecord } from "@tapkit/core";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { alert } from "@/lib/confirm";

import { Field, Input } from "@/components/forms";
import { Screen } from "@/components/Screen";
import { ErrorState, Loading, Notice } from "@/components/states";
import { Badge, Button, Card, Row, SectionHeader, Stack, StatTile, Text } from "@/components/ui";
import type { AppError } from "@/lib/errors";
import { useAnalyzeExperiment, useContentList, useDeleteExperiment, useExperiment, useMetrics, useSaveExperiment } from "@/lib/queries";
import { colors, space } from "@/theme/tokens";

const EVIDENCE_TONE = { none: "neutral", anecdotal: "warning", early: "info", moderate: "success" } as const;

export default function ExperimentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const exp = useExperiment(id);
  const allContent = useContentList();
  const allMetrics = useMetrics({ all: true });
  const save = useSaveExperiment();
  const del = useDeleteExperiment();
  const analyse = useAnalyzeExperiment();
  const [conclusion, setConclusion] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [since] = useState(() => new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10));
  const [today] = useState(() => new Date().toISOString().slice(0, 10));

  const e = exp.data;
  useEffect(() => {
    if (e) {
      setConclusion(e.conclusion ?? "");
      setNextAction(e.next_action ?? "");
    }
  }, [e]);

  const posts = useMemo(() => (allContent.data ?? []).filter((c) => c.experiment_id === id), [allContent.data, id]);
  const stats = useMemo(() => {
    if (!e) return null;
    const postIds = new Set(posts.map((p) => p.id));
    const rows = (allMetrics.data ?? []) as (MetricRecord & { experiment_id: string | null; content_id: string | null })[];
    const test = rows.filter((m) => m.experiment_id === id || (m.content_id && postIds.has(m.content_id)));
    const base = rows.filter((m) => !m.experiment_id && !(m.content_id && postIds.has(m.content_id)) && (m.captured_on ?? "") >= since);
    return computeExperimentStats(test, base, { plannedPosts: e.planned_posts, successMetrics: e.success_metrics });
  }, [e, posts, allMetrics.data, id, since]);

  if (exp.isLoading) return <Loading />;
  if (exp.error || !e || !stats) return <ErrorState error={exp.error ?? "Not found"} onRetry={() => exp.refetch()} />;

  const analysis = e.analysis as ExperimentAnalysis | null;
  const err = analyse.error as AppError | null;
  const ended = e.end_date < today;
  const open = e.status === "planned" || e.status === "running";
  const pm = stats.primaryMetric as MetricKey | null;

  const finish = (status: "completed" | "abandoned") =>
    save.mutate({ id: e.id, status, conclusion: conclusion || null, next_action: nextAction || null }, { onError: (x) => alert("Couldn't save", (x as Error).message) });

  return (
    <Screen edges={["bottom"]}>
      <Row style={{ justifyContent: "space-between" }}>
        <Badge label={e.status} tone={e.status === "running" ? "brand" : e.status === "completed" ? "success" : "neutral"} />
        <Text variant="caption" color={colors.muted}>
          {e.start_date} → {e.end_date}
        </Text>
      </Row>
      <Text variant="title">{e.title}</Text>
      <Card tone="muted">
        <Text variant="overline" color={colors.brandText}>
          Hypothesis
        </Text>
        <Text variant="bodyStrong">{e.hypothesis}</Text>
        {e.objective && (
          <Text variant="small" color={colors.muted} style={{ marginTop: 4 }}>
            Objective: {e.objective}
          </Text>
        )}
        <Text variant="caption" color={colors.muted} style={{ marginTop: 6 }}>
          Success metrics: {e.success_metrics.map((m) => METRIC_DEFINITIONS[m as MetricKey]?.label ?? m).join(", ")}
        </Text>
      </Card>

      {open && ended && <Notice tone="brand" title="Your test period has ended" body="Analyse the results and record what you learned." />}

      <SectionHeader title={`Posts (${posts.length}/${e.planned_posts})`} action={open ? "Create post" : undefined} onAction={() => router.push({ pathname: "/content/new", params: { experiment: e.id } })} />
      {posts.length === 0 ? (
        <Text color={colors.muted}>No posts linked yet. Create posts from here so results are tracked against this experiment.</Text>
      ) : (
        posts.map((p) => (
          <Card key={p.id} onPress={() => router.push(`/content/${p.id}`)} accessibilityLabel={p.title}>
            <Row style={{ justifyContent: "space-between" }}>
              <Text variant="smallStrong" style={{ flex: 1 }} numberOfLines={1}>
                {p.title}
              </Text>
              <Badge label={p.status} tone={p.status === "published" ? "success" : "neutral"} />
            </Row>
          </Card>
        ))
      )}

      <SectionHeader title="What the numbers say" subtitle="Calculated directly from your recorded results." />
      <Row gap={space.sm}>
        <StatTile label="Posts with data" value={String(stats.postsWithData)} />
        <StatTile label="Engagement" value={formatPercent(stats.meanEngagementRate)} hint={`Baseline ${formatPercent(stats.baselineEngagementRate)}`} />
      </Row>
      {pm && (
        <Row gap={space.sm}>
          <StatTile label={`Avg ${METRIC_DEFINITIONS[pm].label.toLowerCase()}`} value={stats.primaryMean === null ? "—" : String(Math.round(stats.primaryMean))} hint={`Baseline ${stats.baselinePrimaryMean === null ? "—" : Math.round(stats.baselinePrimaryMean)}`} />
          <StatTile label="vs your other posts" value={formatLift(stats.primaryRelativeLift)} hint={`${stats.baselinePosts} comparison posts`} />
        </Row>
      )}
      <Notice tone={EVIDENCE_TONE[stats.evidence] === "warning" ? "warning" : EVIDENCE_TONE[stats.evidence] === "success" ? "success" : "info"} title={`Evidence: ${stats.evidence}`} body={EVIDENCE_COPY[stats.evidence]} />

      {err && <Notice tone="danger" title={err.message} action={err.upgrade ? "See TapKit Pro" : undefined} onAction={() => router.push("/paywall")} />}
      <Button title={analysis ? "Re-analyse with TapKit" : "Analyse with TapKit"} icon="sparkles" variant={analysis ? "secondary" : "primary"} disabled={stats.postsWithData === 0} loading={analyse.isPending} onPress={() => analyse.mutate(e.id)} />
      {stats.postsWithData === 0 && <Text variant="caption" color={colors.muted}>Record results on at least one post to analyse.</Text>}

      {analysis && (
        <Card>
          <Stack gap={space.sm}>
            <Text variant="overline" color={colors.brandText}>
              Analysis{e.analysed_at ? ` · ${new Date(e.analysed_at).toLocaleDateString()}` : ""}
            </Text>
            <Text>{analysis.what_happened}</Text>
            <List title="Metric changes" items={analysis.metric_changes} />
            <List title="Reasonable inferences" items={analysis.reasonable_inferences} />
            <List title="Still uncertain" items={analysis.uncertainties} />
            <Text variant="small">
              <Text variant="smallStrong">Next test: </Text>
              {analysis.next_test}
            </Text>
            <Button title="Use suggested conclusion" size="sm" variant="ghost" style={{ alignSelf: "flex-start" }} onPress={() => { setConclusion(analysis.suggested_conclusion); setNextAction(analysis.next_test); }} />
          </Stack>
        </Card>
      )}

      <SectionHeader title="Your conclusion" />
      <Field label="What did you learn?">
        <Input value={conclusion} onChangeText={setConclusion} multiline multilineHeight={90} maxLength={1000} />
      </Field>
      <Field label="Next action">
        <Input value={nextAction} onChangeText={setNextAction} maxLength={500} />
      </Field>
      {open ? (
        <Row gap={space.sm}>
          <Button title="Abandon" variant="secondary" style={{ flex: 1 }} onPress={() => finish("abandoned")} />
          <Button title="Complete" style={{ flex: 2 }} loading={save.isPending} onPress={() => finish("completed")} />
        </Row>
      ) : (
        <Button title="Save conclusion" variant="secondary" loading={save.isPending} onPress={() => save.mutate({ id: e.id, conclusion, next_action: nextAction })} />
      )}
      <Button
        title="Delete experiment"
        variant="danger"
        onPress={() => alert("Delete experiment?", "Linked posts and their results are kept.", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => del.mutate(e.id, { onSuccess: () => router.back() }) }])}
      />
    </Screen>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <Stack gap={2}>
      <Text variant="smallStrong">{title}</Text>
      {items.map((t, i) => (
        <Text key={i} variant="small">
          • {t}
        </Text>
      ))}
    </Stack>
  );
}
