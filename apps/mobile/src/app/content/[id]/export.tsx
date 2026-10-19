import { getTheme, SLIDE_HEIGHT, SLIDE_WIDTH } from "@tapkit/core";
import { router, useLocalSearchParams } from "expo-router";
import { type ComponentRef, createRef, useMemo, useRef, useState } from "react";
import { PixelRatio, Platform, View } from "react-native";
import { captureRef } from "react-native-view-shot";
import { Screen } from "@/components/Screen";
import { SlideView } from "@/components/SlideView";
import { ErrorState, Loading, Notice } from "@/components/states";
import { Badge, Button, Row, Stack, Text } from "@/components/ui";
import { useEntitlement } from "@/lib/entitlement";
import type { AppError } from "@/lib/errors";
import { buildZip, type ExportedSlide, persistSlide, saveToPhotos, shareFile } from "@/lib/exportCarousel";
import { useContent, useProfile, useRecordExport } from "@/lib/queries";
import { colors, space } from "@/theme/tokens";

type Action = "photos" | "zip" | "single";

export default function ExportCarousel() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const content = useContent(id);
  const profile = useProfile();
  const ent = useEntitlement();
  const record = useRecordExport();
  const [busy, setBusy] = useState<Action | null>(null);
  const [progress, setProgress] = useState("");
  const [done, setDone] = useState<string>();
  const [error, setError] = useState<AppError | null>(null);
  const cache = useRef<{ key: string; files: ExportedSlide[] } | null>(null);

  const slides = content.data?.slides ?? [];
  const refs = useMemo(() => slides.map(() => createRef<ComponentRef<typeof View>>()), [slides]);

  if (content.isLoading) return <Loading />;
  if (content.error || !content.data) return <ErrorState error={content.error ?? "Not found"} onRetry={() => content.refetch()} />;
  const c = content.data;
  const theme = getTheme(c.theme_id);
  // Render offscreen at exactly 1080×1350 physical pixels.
  const exportWidthPts = SLIDE_WIDTH / PixelRatio.get();
  const remaining = ent.data ? Math.max(0, ent.data.limits.exportsPerMonth - ent.data.usage.exportsThisMonth) : null;
  const cacheKey = JSON.stringify([c.slides, c.theme_id, c.title, profile.data?.handle]);

  const render = async (): Promise<ExportedSlide[]> => {
    if (cache.current?.key === cacheKey) return cache.current.files;
    const files: ExportedSlide[] = [];
    for (let i = 0; i < slides.length; i++) {
      setProgress(`Rendering slide ${i + 1} of ${slides.length}…`);
      const tmp = await captureRef(refs[i]!, { format: "png", quality: 1, result: "tmpfile", width: SLIDE_WIDTH, height: SLIDE_HEIGHT });
      files.push(persistSlide(tmp, i, slides.length, c.title));
    }
    cache.current = { key: cacheKey, files };
    return files;
  };

  const run = async (action: Action, index?: number) => {
    setError(null);
    setDone(undefined);
    setBusy(action);
    try {
      // Server-side check + metering (export limits and premium themes) before any file is produced.
      if (!cache.current || cache.current.key !== cacheKey) await record.mutateAsync({ contentId: c.id, slideCount: slides.length, themeId: c.theme_id, kind: action === "zip" ? "zip" : "images" });
      const files = await render();
      if (action === "photos") {
        setProgress("Saving to Photos…");
        await saveToPhotos(files);
        setDone(`Saved ${files.length} slide${files.length > 1 ? "s" : ""} to your photo library, in order.`);
      } else if (action === "zip") {
        setProgress("Creating ZIP…");
        const zip = await buildZip(files, c.title);
        await shareFile(zip, "application/zip", "public.zip-archive");
        setDone("ZIP ready.");
      } else if (index !== undefined) {
        await shareFile(files[index]!.uri, "image/png", "public.png");
      }
    } catch (e) {
      setError(e as AppError);
    } finally {
      setBusy(null);
      setProgress("");
    }
  };

  if (Platform.OS === "web") {
    return (
      <Screen edges={["bottom"]}>
        <Notice tone="info" title="Export is available in the iOS app" body="Image and ZIP export use the device's renderer and share sheet." />
      </Screen>
    );
  }

  return (
    <Screen edges={["bottom"]}>
      <Text color={colors.muted}>
        {slides.length} slide{slides.length > 1 ? "s" : ""} · 1080 × 1350 PNG (4:5) · {theme.name} theme
      </Text>
      {remaining !== null && (
        <Row style={{ justifyContent: "space-between" }}>
          <Text variant="small" color={colors.muted}>
            Exports left this month
          </Text>
          <Badge label={String(remaining)} tone={remaining > 1 ? "neutral" : "warning"} />
        </Row>
      )}
      {error && <Notice tone={error.code === "cancelled" ? "info" : "danger"} title={error.message} action={error.upgrade ? "See TapKit Pro" : undefined} onAction={() => router.push("/paywall")} />}
      {done && <Notice tone="success" title={done} />}
      {busy && progress ? <Notice tone="info" title={progress} /> : null}

      <Stack gap={space.sm}>
        <Button title="Save all to Photos" icon="images-outline" size="lg" loading={busy === "photos"} disabled={!!busy} onPress={() => run("photos")} />
        <Button title="Export ZIP" icon="archive-outline" variant="secondary" loading={busy === "zip"} disabled={!!busy} onPress={() => run("zip")} />
      </Stack>
      <Text variant="small" color={colors.muted}>
        Or share a single slide:
      </Text>
      <Row gap={space.sm} style={{ flexWrap: "wrap" }}>
        {slides.map((_, i) => (
          <Button key={i} title={`Slide ${i + 1}`} size="sm" variant="secondary" disabled={!!busy} onPress={() => run("single", i)} />
        ))}
      </Row>

      {/* Offscreen render targets (not visible, not announced). */}
      <View pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ position: "absolute", left: -10000, top: 0, opacity: 1 }}>
        {slides.map((s, i) => (
          <SlideView key={s.id} ref={refs[i]} slide={s} index={i} total={slides.length} themeId={c.theme_id} handle={profile.data?.handle} width={exportWidthPts} rounded={false} />
        ))}
      </View>
    </Screen>
  );
}
