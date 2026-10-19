import { Ionicons } from "@expo/vector-icons";
import { alert } from "@/lib/confirm";
import {
  addSlide,
  CAROUSEL_THEMES,
  changeLayout,
  deleteSlide,
  duplicateSlide,
  LAYOUT_INFO,
  layoutSlide,
  MAX_SLIDES,
  moveSlide,
  SLIDE_LAYOUTS,
  SLIDE_TEMPLATES,
  type Slide,
  type SlideLayout,
  updateSlide,
} from "@tapkit/core";
import { router, Stack as RouterStack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { Field, Input } from "@/components/forms";
import { Screen } from "@/components/Screen";
import { SlideView } from "@/components/SlideView";
import { ErrorState, Loading, Notice } from "@/components/states";
import { Badge, Button, Chip, IconButton, Row, Stack, Text, tap } from "@/components/ui";
import { useIsPro } from "@/lib/entitlement";
import { useContent, useProfile, useUpdateContent } from "@/lib/queries";
import { colors, radius, space } from "@/theme/tokens";

type SaveState = "saved" | "saving" | "unsaved" | "error";

export default function CarouselEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const content = useContent(id);
  const profile = useProfile();
  const update = useUpdateContent();
  const isPro = useIsPro();
  const { width } = useWindowDimensions();
  const [slides, setSlides] = useState<Slide[] | null>(null);
  const [themeId, setThemeId] = useState("tapkit");
  const [selected, setSelected] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [showTemplates, setShowTemplates] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<{ slides: Slide[]; themeId: string } | null>(null);

  useEffect(() => {
    if (content.data && slides === null) {
      setSlides(content.data.slides);
      setThemeId(content.data.theme_id);
    }
  }, [content.data, slides]);

  const { mutateAsync } = update;
  const flush = useCallback(async () => {
    if (!latest.current) return;
    const payload = latest.current;
    timer.current = null;
    setSaveState("saving");
    try {
      await mutateAsync({ id, patch: { slides: payload.slides, theme_id: payload.themeId, user_edited: true } });
      if (latest.current === payload) setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }, [id, mutateAsync]);
  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const commit = (next: Slide[], nextTheme = themeId) => {
    setSlides(next);
    setThemeId(nextTheme);
    latest.current = { slides: next, themeId: nextTheme };
    setSaveState("unsaved");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 800);
  };

  // Save immediately when leaving the editor (unmount only).
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        flushRef.current();
      }
    },
    [],
  );

  if (content.isLoading || slides === null) return <Loading />;
  if (content.error || !content.data) return <ErrorState error={content.error ?? "Not found"} onRetry={() => content.refetch()} />;

  const current = slides[Math.min(selected, slides.length - 1)];
  const previewWidth = Math.min(width - space.xl * 2, 380);
  const overflow = current ? layoutSlide(current, { index: selected, total: slides.length, themeId }).overflow : [];
  const uses = current ? LAYOUT_INFO[current.layout].uses : [];
  const patch = (p: Partial<Slide>) => current && commit(updateSlide(slides, current.id, p));

  const pickTheme = (tid: string) => {
    const theme = CAROUSEL_THEMES.find((t) => t.id === tid);
    if (theme?.premium && !isPro) return router.push("/paywall");
    commit(slides, tid);
  };

  const add = (make: () => Slide) => {
    if (slides.length >= MAX_SLIDES) return alert("Slide limit", `Carousels can have up to ${MAX_SLIDES} slides.`);
    const next = addSlide(slides, make(), selected + 1);
    commit(next);
    setSelected(selected + 1);
    setShowTemplates(false);
  };

  const remove = () => {
    if (!current) return;
    if (slides.length === 1) return alert("Keep at least one slide", "A carousel needs at least one slide.");
    commit(deleteSlide(slides, current.id));
    setSelected(Math.max(0, selected - 1));
  };

  const move = (dir: -1 | 1) => {
    const to = selected + dir;
    if (to < 0 || to >= slides.length) return;
    commit(moveSlide(slides, selected, to));
    setSelected(to);
  };

  const saveLabel = saveState === "saved" ? "Saved" : saveState === "saving" ? "Saving…" : saveState === "unsaved" ? "Unsaved" : "Not saved — tap to retry";

  return (
    <Screen edges={["bottom"]} contentStyle={{ gap: space.md }}>
      <RouterStack.Screen
        options={{
          headerRight: () => (
            <Pressable accessibilityRole="button" accessibilityLabel={saveLabel} onPress={saveState === "error" ? flush : undefined} hitSlop={10}>
              <Badge label={saveLabel} tone={saveState === "error" ? "danger" : saveState === "saved" ? "success" : "neutral"} icon={saveState === "saved" ? "cloud-done-outline" : saveState === "error" ? "cloud-offline-outline" : "cloud-upload-outline"} />
            </Pressable>
          ),
        }}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        {CAROUSEL_THEMES.map((t) => (
          <Pressable key={t.id} accessibilityRole="button" accessibilityLabel={`${t.name} theme${t.premium && !isPro ? ", Pro" : ""}`} accessibilityState={{ selected: themeId === t.id }} onPress={() => pickTheme(t.id)} style={[styles.theme, themeId === t.id && { borderColor: colors.brand }]}>
            <View style={[styles.swatch, { backgroundColor: t.background, borderColor: colors.border }]}>
              <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: t.accent }} />
            </View>
            <Text variant="caption">{t.name}</Text>
            {t.premium && !isPro && <Ionicons name="lock-closed" size={11} color={colors.muted} />}
          </Pressable>
        ))}
      </ScrollView>

      {current && (
        <View style={{ alignItems: "center" }}>
          <SlideView slide={current} index={selected} total={slides.length} themeId={themeId} handle={profile.data?.handle} width={previewWidth} />
        </View>
      )}
      {overflow.length > 0 && <Notice tone="warning" title="Some text doesn't fit" body={`Shorten the ${overflow.join(", ").replace(/_/g, " ")} — it's being cut off with “…”.`} />}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingVertical: 4 }}>
        {slides.map((s, i) => (
          <Pressable
            key={s.id}
            accessibilityRole="button"
            accessibilityLabel={`Slide ${i + 1}, ${LAYOUT_INFO[s.layout].label}`}
            accessibilityState={{ selected: i === selected }}
            onPress={() => {
              tap();
              setSelected(i);
            }}
            style={[styles.thumb, i === selected && styles.thumbSelected]}
          >
            <SlideView slide={s} index={i} total={slides.length} themeId={themeId} width={56} rounded={false} />
            <Text variant="caption" center color={i === selected ? colors.brandText : colors.muted}>
              {i + 1}
            </Text>
          </Pressable>
        ))}
        <Pressable accessibilityRole="button" accessibilityLabel="Add slide" onPress={() => setShowTemplates(!showTemplates)} style={[styles.thumb, styles.addThumb]}>
          <Ionicons name="add" size={24} color={colors.brand} />
        </Pressable>
      </ScrollView>

      {showTemplates && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
          {SLIDE_TEMPLATES.map((t) => (
            <Chip key={t.id} label={t.label} onPress={() => add(t.make)} />
          ))}
        </View>
      )}

      <Row style={{ justifyContent: "space-between" }}>
        <Row gap={0}>
          <IconButton icon="chevron-back" label="Move slide left" onPress={() => move(-1)} />
          <IconButton icon="chevron-forward" label="Move slide right" onPress={() => move(1)} />
          <IconButton icon="copy-outline" label="Duplicate slide" onPress={() => current && commit(duplicateSlide(slides, current.id))} />
        </Row>
        <IconButton icon="trash-outline" label="Delete slide" color={colors.danger} onPress={remove} />
      </Row>

      {current && (
        <Stack>
          <Field label="Layout">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
              {SLIDE_LAYOUTS.map((l: SlideLayout) => (
                <Chip key={l} label={LAYOUT_INFO[l].label} selected={current.layout === l} onPress={() => commit(changeLayout(slides, current.id, l))} />
              ))}
            </ScrollView>
          </Field>
          {uses.includes("kicker") && (
            <Field label={current.layout === "cta" ? "Button text" : "Label"} optional>
              <Input value={current.kicker} onChangeText={(t) => patch({ kicker: t })} maxLength={60} />
            </Field>
          )}
          {uses.includes("heading") && (
            <Field label={current.layout === "myth_fact" ? "Myth" : current.layout === "big_number" ? "Number or short phrase" : current.layout === "quote" ? "Label" : "Heading"}>
              <Input value={current.heading} onChangeText={(t) => patch({ heading: t })} multiline multilineHeight={70} maxLength={200} />
            </Field>
          )}
          {current.layout === "big_number" && <Text variant="caption" color={colors.muted}>Only use a number you can stand behind.</Text>}
          {uses.includes("body") && (
            <Field label={current.layout === "myth_fact" ? "Fact" : current.layout === "quote" ? "Story / quote" : "Text"}>
              <Input value={current.body} onChangeText={(t) => patch({ body: t })} multiline multilineHeight={110} maxLength={700} />
            </Field>
          )}
          {uses.includes("items") && <ListEditor label="Items" items={current.items} max={7} onChange={(items) => patch({ items })} />}
          {uses.includes("left_title") && (
            <Row align="flex-start" gap={space.sm}>
              <View style={{ flex: 1, gap: space.sm }}>
                <Field label="Left title">
                  <Input value={current.left_title} onChangeText={(t) => patch({ left_title: t })} maxLength={60} />
                </Field>
                <ListEditor label="Left items" items={current.left_items} max={5} onChange={(left_items) => patch({ left_items })} />
              </View>
              <View style={{ flex: 1, gap: space.sm }}>
                <Field label="Right title">
                  <Input value={current.right_title} onChangeText={(t) => patch({ right_title: t })} maxLength={60} />
                </Field>
                <ListEditor label="Right items" items={current.right_items} max={5} onChange={(right_items) => patch({ right_items })} />
              </View>
            </Row>
          )}
        </Stack>
      )}

      <Button title="Preview & export" icon="download-outline" onPress={async () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; await flush(); } router.push(`/content/${id}/export`); }} />
    </Screen>
  );
}

function ListEditor({ label, items, max, onChange }: { label: string; items: string[]; max: number; onChange: (v: string[]) => void }) {
  return (
    <Field label={label}>
      <View style={{ gap: space.sm }}>
        {items.map((it, i) => (
          <Row key={i} gap={space.xs}>
            <Input style={{ flex: 1 }} value={it} onChangeText={(t) => onChange(items.map((x, j) => (j === i ? t : x)))} maxLength={160} accessibilityLabel={`${label} ${i + 1}`} />
            <IconButton icon="close" label={`Remove item ${i + 1}`} size={18} onPress={() => onChange(items.filter((_, j) => j !== i))} />
          </Row>
        ))}
        {items.length < max && <Button title="Add item" icon="add" size="sm" variant="ghost" style={{ alignSelf: "flex-start" }} onPress={() => onChange([...items, ""])} />}
      </View>
    </Field>
  );
}

const styles = StyleSheet.create({
  theme: { alignItems: "center", gap: 4, padding: 6, borderRadius: radius.md, borderWidth: 2, borderColor: "transparent", flexDirection: "column" },
  swatch: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, alignItems: "flex-end", justifyContent: "flex-start", padding: 4 },
  thumb: { alignItems: "center", gap: 2, padding: 3, borderRadius: 10, borderWidth: 2, borderColor: "transparent" },
  thumbSelected: { borderColor: colors.brand },
  addThumb: { width: 62, height: 74, justifyContent: "center", backgroundColor: colors.brandSoft, borderColor: colors.brandSoft },
});
