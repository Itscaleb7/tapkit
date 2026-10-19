import { CONTENT_FORMATS, CONTENT_STATUSES, type ContentStatus, httpUrl, labelOf, PLATFORMS } from "@tapkit/core";
import * as Clipboard from "expo-clipboard";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, FlatList, useWindowDimensions, View } from "react-native";
import { Field, Input, TagInput } from "@/components/forms";
import { Screen } from "@/components/Screen";
import { SlideView } from "@/components/SlideView";
import { ErrorState, Loading, Notice } from "@/components/states";
import { Badge, Button, Card, Chip, ChipGroup, Row, SectionHeader, Stack, Text } from "@/components/ui";
import { useContent, useContentSources, useDeleteContent, useExperiments, useMetrics, useProfile, useUpdateContent } from "@/lib/queries";
import { colors, space } from "@/theme/tokens";

export default function ContentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const content = useContent(id);
  const sources = useContentSources(id);
  const metrics = useMetrics({ contentId: id });
  const experiments = useExperiments();
  const profile = useProfile();
  const update = useUpdateContent();
  const del = useDeleteContent();
  const { width } = useWindowDimensions();
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [pub, setPub] = useState({ platform: "instagram", url: "", confirmed: false });
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState(false);

  const c = content.data;
  useEffect(() => {
    if (c && !dirty) {
      setTitle(c.title);
      setCaption(c.caption ?? "");
      setHashtags(c.hashtags);
    }
  }, [c, dirty]);

  if (content.isLoading) return <Loading />;
  if (content.error || !c) return <ErrorState error={content.error ?? "Not found"} onRetry={() => content.refetch()} />;

  const slideWidth = Math.min(width - 80, 320);
  const hasSlides = c.slides.length > 0;

  const saveText = () =>
    update.mutate(
      { id: c.id, patch: { title: title.trim() || c.title, caption, hashtags, user_edited: true } },
      { onSuccess: () => setDirty(false), onError: (e) => setError((e as Error).message) },
    );

  const setStatus = (status: ContentStatus) => {
    if (status === "published") return setPublishing(true);
    update.mutate({ id: c.id, patch: c.status === "published" ? { status, published_confirmed: false, published_at: null } : { status } }, { onError: (e) => setError((e as Error).message) });
  };

  const confirmPublished = () => {
    if (!pub.confirmed) return setError("Please confirm the post is live.");
    if (pub.url && !httpUrl.safeParse(pub.url).success) return setError("That link doesn't look right.");
    update.mutate(
      { id: c.id, patch: { status: "published", published_confirmed: true, published_at: new Date().toISOString(), platform: pub.platform, published_url: pub.url || null } },
      { onSuccess: () => { setPublishing(false); setError(undefined); }, onError: (e) => setError((e as Error).message) },
    );
  };

  const copyCaption = async () => {
    await Clipboard.setStringAsync([caption, hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" ")].filter(Boolean).join("\n\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const remove = () =>
    Alert.alert("Delete this content?", "This can't be undone. Its recorded results are deleted too.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => del.mutate(c.id, { onSuccess: () => router.back() }) },
    ]);

  const experiment = experiments.data?.find((x) => x.id === c.experiment_id);

  return (
    <Screen edges={["bottom"]}>
      <Row style={{ justifyContent: "space-between" }}>
        <Badge label={labelOf(CONTENT_FORMATS, c.format)} />
        <Badge label={labelOf(CONTENT_STATUSES, c.status)} tone={c.status === "published" ? "success" : c.status === "ready" ? "brand" : "neutral"} />
      </Row>
      {error && <Notice tone="danger" title={error} />}

      {hasSlides ? (
        <View style={{ marginHorizontal: -space.xl }}>
          <FlatList
            horizontal
            data={c.slides}
            keyExtractor={(s) => s.id}
            showsHorizontalScrollIndicator={false}
            snapToInterval={slideWidth + space.md}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: space.xl, gap: space.md }}
            renderItem={({ item, index }) => <SlideView slide={item} index={index} total={c.slides.length} themeId={c.theme_id} handle={profile.data?.handle} width={slideWidth} />}
          />
        </View>
      ) : (
        <Notice tone="info" title="Caption-only post" body="This format has no slides. Edit the caption below." />
      )}

      {hasSlides && (
        <Row gap={space.sm}>
          <Button title="Edit slides" icon="create-outline" variant="secondary" style={{ flex: 1 }} onPress={() => router.push(`/content/${c.id}/editor`)} />
          <Button title="Export" icon="download-outline" style={{ flex: 1 }} onPress={() => router.push(`/content/${c.id}/export`)} />
        </Row>
      )}

      <Field label="Title">
        <Input value={title} onChangeText={(t) => { setTitle(t); setDirty(true); }} maxLength={120} />
      </Field>
      <Field label="Caption" hint={`${caption.length}/2200`}>
        <Input value={caption} onChangeText={(t) => { setCaption(t); setDirty(true); }} multiline multilineHeight={160} maxLength={2200} />
      </Field>
      <Field label="Hashtags" optional>
        <TagInput value={hashtags} onChange={(v) => { setHashtags(v); setDirty(true); }} max={30} />
      </Field>
      <Row gap={space.sm}>
        <Button title={copied ? "Copied!" : "Copy caption"} icon={copied ? "checkmark" : "copy-outline"} variant="secondary" style={{ flex: 1 }} onPress={copyCaption} />
        {dirty && <Button title="Save" style={{ flex: 1 }} loading={update.isPending} onPress={saveText} />}
      </Row>

      {c.alternative_hooks.length > 0 && (
        <Card tone="muted">
          <Stack gap={space.sm}>
            <Text variant="overline" color={colors.brandText}>
              Alternative hooks
            </Text>
            {c.alternative_hooks.map((h, i) => (
              <Row key={i} align="flex-start">
                <Text variant="small" style={{ flex: 1 }}>
                  {h}
                </Text>
                {hasSlides && (
                  <Button
                    title="Use"
                    size="sm"
                    variant="ghost"
                    onPress={() => update.mutate({ id: c.id, patch: { hook: h, slides: c.slides.map((s, si) => (si === 0 ? { ...s, heading: h } : s)), user_edited: true } })}
                  />
                )}
              </Row>
            ))}
          </Stack>
        </Card>
      )}

      <SectionHeader title="Status" subtitle="TapKit never marks content as published for you." />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
        {CONTENT_STATUSES.map((s) => (
          <Chip key={s.id} label={s.label} selected={c.status === s.id} onPress={() => setStatus(s.id)} />
        ))}
      </View>

      {publishing && (
        <Card tone="brand">
          <Stack>
            <Text variant="subheading">Mark as published</Text>
            <Field label="Where did you post it?">
              <ChipGroup options={PLATFORMS} value={[pub.platform as never]} onChange={(v) => v[0] && setPub({ ...pub, platform: v[0] })} />
            </Field>
            <Field label="Link to the post" optional>
              <Input value={pub.url} onChangeText={(t) => setPub({ ...pub, url: t })} autoCapitalize="none" keyboardType="url" placeholder="https://" />
            </Field>
            <Chip label="I confirm this post is live" selected={pub.confirmed} onPress={() => setPub({ ...pub, confirmed: !pub.confirmed })} />
            <Row gap={space.sm}>
              <Button title="Cancel" variant="secondary" style={{ flex: 1 }} onPress={() => setPublishing(false)} />
              <Button title="Confirm" style={{ flex: 2 }} disabled={!pub.confirmed} loading={update.isPending} onPress={confirmPublished} />
            </Row>
          </Stack>
        </Card>
      )}

      {c.status === "published" && (
        <Card>
          <Stack gap={space.sm}>
            <Text variant="subheading">Results</Text>
            <Text variant="small" color={colors.muted}>
              {metrics.data?.length ? `${metrics.data.length} snapshot${metrics.data.length > 1 ? "s" : ""} recorded. Latest: ${metrics.data[0]!.captured_on}` : "No results yet. Add the numbers from your platform's insights."}
            </Text>
            <Button title="Record results" icon="stats-chart-outline" variant="secondary" onPress={() => router.push(`/content/${c.id}/results`)} />
          </Stack>
        </Card>
      )}

      <Card tone="muted">
        <Stack gap={space.sm}>
          <Text variant="overline" color={colors.brandText}>
            Where this came from
          </Text>
          {sources.data?.length ? (
            sources.data.map((s) => {
              const entry = s.proof_entries as unknown as { id: string; title: string | null; kind: string } | null;
              return entry ? <Button key={s.proof_entry_id} title={entry.title ?? "Proof Bank entry"} icon="archive-outline" variant="ghost" size="sm" style={{ alignSelf: "flex-start" }} onPress={() => router.push(`/proof/${entry.id}`)} /> : null;
            })
          ) : (
            <Text variant="small" color={colors.muted}>
              No Proof Bank entries linked.
            </Text>
          )}
          {c.grounding_notes && (
            <Text variant="small" color={colors.inkSoft}>
              {c.grounding_notes}
            </Text>
          )}
          {experiment && <Badge label={`Experiment: ${experiment.title}`} tone="info" icon="flask" />}
        </Stack>
      </Card>

      {c.series_ideas.length > 0 && (
        <Card>
          <Stack gap={space.sm}>
            <Text variant="overline" color={colors.brandText}>
              Turn it into a series
            </Text>
            {c.series_ideas.map((s, i) => (
              <Text key={i} variant="small">
                • {s}
              </Text>
            ))}
            <Button title="Create the next part" icon="add" variant="secondary" size="sm" style={{ alignSelf: "flex-start" }} onPress={() => router.push({ pathname: "/content/new", params: { previous: c.id } })} />
          </Stack>
        </Card>
      )}

      <Button title="Delete" icon="trash-outline" variant="danger" onPress={remove} />
    </Screen>
  );
}
