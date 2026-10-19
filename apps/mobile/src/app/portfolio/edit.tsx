import { DEFAULT_ACCENT, portfolioSettingsSchema, portfolioUrl, suggestSlug } from "@tapkit/core";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Field, Input, TagInput, ToggleRow } from "@/components/forms";
import { Screen } from "@/components/Screen";
import { ErrorState, Loading, Notice } from "@/components/states";
import { Badge, Button, Card, Chip, IconButton, Row, SectionHeader, Stack, Text } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { config } from "@/lib/config";
import { useEntitlement, useIsPro } from "@/lib/entitlement";
import { useBrand, useContentList, useDeletePortfolioItem, usePortfolio, usePortfolioItems, useProfile, useSavePortfolio, useSavePortfolioItem } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { colors, space } from "@/theme/tokens";
import { alert } from "@/lib/confirm";

const ACCENTS = ["#FF6A13", "#1A1410", "#2563EB", "#059669", "#7C3AED", "#DB2777"];

export default function EditPortfolio() {
  const { session } = useAuth();
  const portfolio = usePortfolio();
  const items = usePortfolioItems();
  const published = useContentList("published");
  const brand = useBrand();
  const profile = useProfile();
  const ent = useEntitlement();
  const isPro = useIsPro();
  const save = useSavePortfolio();
  const saveItem = useSavePortfolioItem();
  const delItem = useDeletePortfolioItem();
  const [f, setF] = useState({
    slug: "",
    display_name: "",
    headline: "",
    bio: "",
    positioning: "",
    skills: [] as string[],
    experience: "",
    contact_email: "",
    contact_url: "",
    accent_color: DEFAULT_ACCENT,
    enquiries_enabled: false,
    show_offers: true,
    show_content: true,
    is_published: false,
    avatar_path: null as string | null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slugOk, setSlugOk] = useState<boolean | null>(null);
  const [newLink, setNewLink] = useState({ title: "", url: "", description: "" });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated || portfolio.isLoading || brand.isLoading || profile.isLoading) return;
    const p = portfolio.data;
    const name = p?.display_name ?? profile.data?.display_name ?? "";
    setF({
      slug: p?.slug ?? suggestSlug(name || "me"),
      display_name: name,
      headline: p?.headline ?? "",
      bio: p?.bio ?? "",
      positioning: p?.positioning ?? brand.data?.positioning ?? "",
      skills: p?.skills ?? [],
      experience: p?.experience ?? "",
      contact_email: p?.contact_email ?? "",
      contact_url: p?.contact_url ?? "",
      accent_color: p?.accent_color ?? DEFAULT_ACCENT,
      enquiries_enabled: p?.enquiries_enabled ?? false,
      show_offers: p?.show_offers ?? true,
      show_content: p?.show_content ?? true,
      is_published: p?.is_published ?? false,
      avatar_path: p?.avatar_path ?? null,
    });
    setHydrated(true);
  }, [hydrated, portfolio.isLoading, portfolio.data, brand.isLoading, brand.data, profile.isLoading, profile.data]);

  useEffect(() => {
    if (!f.slug) return;
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc("is_slug_available", { p_slug: f.slug });
      setSlugOk(data ?? null);
    }, 400);
    return () => clearTimeout(t);
  }, [f.slug]);

  if (portfolio.isLoading) return <Loading />;
  if (portfolio.error) return <ErrorState error={portfolio.error} onRetry={() => portfolio.refetch()} />;

  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const url = portfolioUrl(config.webUrl, f.slug || "your-name");
  const avatarUrl = f.avatar_path ? supabase.storage.from("portfolio-media").getPublicUrl(f.avatar_path).data.publicUrl : null;
  const itemLimit = ent.data?.limits.portfolioItems ?? 6;

  const submit = (publish?: boolean) => {
    const next = { ...f, is_published: publish ?? f.is_published };
    const parsed = portfolioSettingsSchema.safeParse(next);
    if (!parsed.success) {
      const out: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (out[String(i.path[0])] ??= i.message));
      return setErrors(out);
    }
    if (slugOk === false) return setErrors({ slug: "That address is already taken." });
    setErrors({});
    save.mutate({ ...parsed.data, is_published: next.is_published, avatar_path: f.avatar_path }, { onSuccess: () => set({ is_published: next.is_published }), onError: (e) => setErrors({ _form: (e as Error).message }) });
  };

  const pickAvatar = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (res.canceled || !res.assets[0] || !session) return;
    const asset = res.assets[0];
    if ((asset.fileSize ?? 0) > 5 * 1024 * 1024) return alert("Image too large", "Choose an image under 5 MB.");
    const ext = asset.mimeType === "image/png" ? "png" : "jpg";
    const path = `${session.user.id}/avatar-${Date.now()}.${ext}`;
    const bytes = await new File(asset.uri).bytes();
    const { error } = await supabase.storage.from("portfolio-media").upload(path, bytes, { contentType: asset.mimeType ?? "image/jpeg", upsert: true });
    if (error) return alert("Upload failed", error.message);
    if (f.avatar_path) supabase.storage.from("portfolio-media").remove([f.avatar_path]);
    set({ avatar_path: path });
  };

  const addContent = (id: string, title: string) => saveItem.mutate({ kind: "content", content_id: id, title, position: items.data?.length ?? 0 }, { onError: (e) => alert("Couldn't add", (e as Error).message) });
  const addLink = () => {
    if (!newLink.title.trim() || !/^https?:\/\//i.test(newLink.url)) return alert("Add a title and a valid https:// link");
    saveItem.mutate({ kind: "link", title: newLink.title.trim(), url: newLink.url.trim(), description: newLink.description || null, position: items.data?.length ?? 0 }, { onSuccess: () => setNewLink({ title: "", url: "", description: "" }), onError: (e) => alert("Couldn't add", (e as Error).message) });
  };
  const usedContent = new Set((items.data ?? []).map((i) => i.content_id));

  return (
    <Screen
      edges={["bottom"]}
      footer={
        <Row gap={space.sm}>
          <Button title="Save" variant="secondary" style={{ flex: 1 }} loading={save.isPending} onPress={() => submit()} />
          <Button title={f.is_published ? "Unpublish" : "Publish"} icon={f.is_published ? "eye-off-outline" : "globe-outline"} style={{ flex: 1 }} onPress={() => submit(!f.is_published)} />
        </Row>
      }
    >
      <Notice tone="info" title="You control what's public" body="Only the fields and items on this page are shown. Your Proof Bank, drafts, analytics and account details are never public." />
      {errors._form && <Notice tone="danger" title={errors._form} action={/Pro/.test(errors._form) ? "See TapKit Pro" : undefined} onAction={() => router.push("/paywall")} />}
      {f.is_published && (
        <Card tone="brand" onPress={() => WebBrowser.openBrowserAsync(url)} accessibilityLabel="Open live portfolio">
          <Row>
            <Badge label="Live" tone="success" />
            <Text variant="smallStrong" color={colors.brandText} style={{ flex: 1 }} numberOfLines={1}>
              {url}
            </Text>
          </Row>
        </Card>
      )}

      <Row gap={space.lg}>
        <Pressable accessibilityRole="button" accessibilityLabel="Choose profile photo" onPress={pickAvatar}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={{ width: 72, height: 72, borderRadius: 36 }} accessibilityIgnoresInvertColors />
          ) : (
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
              <Text variant="title" color={colors.brandText}>
                {(f.display_name || "?").slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
        </Pressable>
        <Stack gap={2} style={{ flex: 1 }}>
          <Text variant="smallStrong">Profile photo</Text>
          <Text variant="caption" color={colors.muted}>
            Optional. Shown publicly on your portfolio.
          </Text>
          {f.avatar_path && <Button title="Remove photo" size="sm" variant="ghost" style={{ alignSelf: "flex-start" }} onPress={() => set({ avatar_path: null })} />}
        </Stack>
      </Row>

      <Field label="Address" error={errors.slug} hint={slugOk === false ? "Taken — try another" : url}>
        <Input value={f.slug} onChangeText={(t) => set({ slug: t.toLowerCase().replace(/[^a-z0-9-]/g, "") })} autoCapitalize="none" maxLength={40} invalid={slugOk === false} />
      </Field>
      <Field label="Name" error={errors.display_name}>
        <Input value={f.display_name} onChangeText={(t) => set({ display_name: t })} maxLength={80} />
      </Field>
      <Field label="Headline" optional>
        <Input value={f.headline} onChangeText={(t) => set({ headline: t })} maxLength={140} placeholder="e.g. Freelance brand designer for early-stage founders" />
      </Field>
      <Field label="Positioning" optional hint="Pre-filled from My Brand — edit freely.">
        <Input value={f.positioning} onChangeText={(t) => set({ positioning: t })} multiline multilineHeight={70} maxLength={400} />
      </Field>
      <Field label="Bio" optional>
        <Input value={f.bio} onChangeText={(t) => set({ bio: t })} multiline maxLength={1200} />
      </Field>
      <Field label="Skills" optional>
        <TagInput value={f.skills} onChange={(v) => set({ skills: v })} max={15} />
      </Field>
      <Field label="Experience" optional>
        <Input value={f.experience} onChangeText={(t) => set({ experience: t })} multiline maxLength={1500} />
      </Field>
      <Field label="Contact email" optional error={errors.contact_email} hint="Shown publicly if provided.">
        <Input value={f.contact_email} onChangeText={(t) => set({ contact_email: t })} autoCapitalize="none" keyboardType="email-address" />
      </Field>
      <Field label="Website / booking link" optional error={errors.contact_url}>
        <Input value={f.contact_url} onChangeText={(t) => set({ contact_url: t })} autoCapitalize="none" keyboardType="url" placeholder="https://" />
      </Field>
      <ToggleRow label="Accept enquiries" hint="Visitors can send you a message. It arrives in your pipeline — your email stays private." value={f.enquiries_enabled} onChange={(v) => set({ enquiries_enabled: v })} />
      <ToggleRow label="Show my public offers" value={f.show_offers} onChange={(v) => set({ show_offers: v })} />
      <ToggleRow label="Show my published content" value={f.show_content} onChange={(v) => set({ show_content: v })} />
      <Field label={`Accent colour${isPro ? "" : " · Pro"}`}>
        <Row gap={space.sm}>
          {ACCENTS.map((a) => (
            <Pressable
              key={a}
              accessibilityRole="button"
              accessibilityLabel={`Accent ${a}`}
              accessibilityState={{ selected: f.accent_color.toUpperCase() === a }}
              onPress={() => (a === DEFAULT_ACCENT || isPro ? set({ accent_color: a }) : router.push("/paywall"))}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: a, borderWidth: 3, borderColor: f.accent_color.toUpperCase() === a ? colors.borderStrong : "transparent" }}
            />
          ))}
        </Row>
      </Field>

      <SectionHeader title="Selected work" subtitle={`${items.data?.length ?? 0}/${itemLimit} items`} />
      {(items.data ?? []).map((i, idx) => (
        <Card key={i.id}>
          <Row>
            <Stack gap={2} style={{ flex: 1 }}>
              <Text variant="bodyStrong">{i.title}</Text>
              <Text variant="caption" color={colors.muted}>
                {i.kind === "content" ? "Published content" : i.url}
              </Text>
            </Stack>
            <IconButton icon="arrow-up" label="Move up" size={18} onPress={() => idx > 0 && (saveItem.mutate({ id: i.id, position: idx - 1 }), saveItem.mutate({ id: items.data![idx - 1]!.id, position: idx }))} />
            <IconButton icon={i.is_visible ? "eye-outline" : "eye-off-outline"} label={i.is_visible ? "Hide" : "Show"} size={18} onPress={() => saveItem.mutate({ id: i.id, is_visible: !i.is_visible })} />
            <IconButton icon="trash-outline" label="Remove" size={18} color={colors.danger} onPress={() => delItem.mutate(i.id)} />
          </Row>
        </Card>
      ))}
      {(published.data ?? []).filter((c) => !usedContent.has(c.id)).length > 0 && (
        <Field label="Add published content">
          <Row gap={space.sm} style={{ flexWrap: "wrap" }}>
            {(published.data ?? [])
              .filter((c) => !usedContent.has(c.id))
              .map((c) => (
                <Chip key={c.id} label={`+ ${c.title.slice(0, 32)}`} onPress={() => addContent(c.id, c.title)} />
              ))}
          </Row>
        </Field>
      )}
      <Card tone="muted">
        <Stack gap={space.sm}>
          <Text variant="smallStrong">Add a project or link</Text>
          <Input value={newLink.title} onChangeText={(t) => setNewLink({ ...newLink, title: t })} placeholder="Title" maxLength={120} />
          <Input value={newLink.url} onChangeText={(t) => setNewLink({ ...newLink, url: t })} placeholder="https://" autoCapitalize="none" keyboardType="url" />
          <Input value={newLink.description} onChangeText={(t) => setNewLink({ ...newLink, description: t })} placeholder="Short description (optional)" maxLength={600} />
          <Button title="Add" size="sm" variant="secondary" style={{ alignSelf: "flex-start" }} onPress={addLink} />
        </Stack>
      </Card>
    </Screen>
  );
}
