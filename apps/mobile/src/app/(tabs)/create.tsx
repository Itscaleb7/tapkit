import { Ionicons } from "@expo/vector-icons";
import { CONTENT_FORMATS, CONTENT_STATUSES, labelOf, PROOF_KINDS } from "@tapkit/core";
import { router } from "expo-router";
import { useState } from "react";
import { FlatList, View } from "react-native";
import { Input, SegmentedControl } from "@/components/forms";
import { Screen } from "@/components/Screen";
import { SlideView } from "@/components/SlideView";
import { EmptyState, ErrorState, Loading } from "@/components/states";
import { Badge, Button, Card, Chip, Row, Stack, Text } from "@/components/ui";
import { type Content, type ProofEntry, useContentList, usePillars, useProofEntries } from "@/lib/queries";
import { useDebounced } from "@/lib/useDebounced";
import { colors, space } from "@/theme/tokens";

type Tab = "content" | "proof";

export default function Create() {
  const [tab, setTab] = useState<Tab>("content");
  return (
    <Screen
      title="Create"
      scroll={false}
      contentStyle={{ paddingBottom: 0 }}
      headerRight={<Button title={tab === "content" ? "New" : "Capture"} icon="add" size="sm" onPress={() => router.push(tab === "content" ? "/content/new" : "/proof/new")} />}
    >
      <SegmentedControl options={[{ id: "content", label: "Content" }, { id: "proof", label: "Proof Bank" }]} value={tab} onChange={setTab} />
      {tab === "content" ? <ContentLibrary /> : <ProofBank />}
    </Screen>
  );
}

function ContentLibrary() {
  const [status, setStatus] = useState<string | null>(null);
  const list = useContentList(status);
  return (
    <View style={{ flex: 1, gap: space.md }}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[{ id: null as string | null, label: "All" }, ...CONTENT_STATUSES.map((s) => ({ id: s.id as string | null, label: s.label }))]}
        keyExtractor={(i) => i.id ?? "all"}
        contentContainerStyle={{ gap: space.sm }}
        style={{ flexGrow: 0 }}
        renderItem={({ item }) => <Chip label={item.label} selected={status === item.id} onPress={() => setStatus(item.id)} />}
      />
      {list.isLoading ? (
        <Loading />
      ) : list.error ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : (
        <FlatList
          data={list.data}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ gap: space.md, paddingBottom: space.huge }}
          refreshing={list.isRefetching}
          onRefresh={() => list.refetch()}
          ListEmptyComponent={
            <EmptyState icon="albums-outline" title={status ? "Nothing here yet" : "Your content library is empty"} body="Turn a Proof Bank entry, a pillar or a blank idea into your first carousel." action="Create content" onAction={() => router.push("/content/new")} />
          }
          renderItem={({ item }) => <ContentCard c={item} />}
        />
      )}
    </View>
  );
}

function ContentCard({ c }: { c: Content }) {
  const first = c.slides[0];
  return (
    <Card onPress={() => router.push(`/content/${c.id}`)} accessibilityLabel={`${c.title}, ${labelOf(CONTENT_STATUSES, c.status)}`}>
      <Row align="flex-start" gap={space.md}>
        {first ? (
          <SlideView slide={first} index={0} total={c.slides.length} themeId={c.theme_id} width={64} />
        ) : (
          <View style={{ width: 64, height: 80, borderRadius: 10, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="text-outline" size={22} color={colors.subtle} />
          </View>
        )}
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="bodyStrong" numberOfLines={2}>
            {c.title}
          </Text>
          <Text variant="caption" color={colors.muted}>
            {labelOf(CONTENT_FORMATS, c.format)}
            {c.slides.length ? ` · ${c.slides.length} slides` : ""} · {new Date(c.updated_at).toLocaleDateString()}
          </Text>
          <Badge label={labelOf(CONTENT_STATUSES, c.status)} tone={c.status === "published" ? "success" : c.status === "ready" ? "brand" : "neutral"} />
        </View>
      </Row>
    </Card>
  );
}

function ProofBank() {
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<string | null>(null);
  const [pillarId, setPillarId] = useState<string | null>(null);
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const pillars = usePillars();
  const debounced = useDebounced(search, 350);
  const list = useProofEntries({ search: debounced, kind, pillarId, pinnedOnly });
  return (
    <View style={{ flex: 1, gap: space.md }}>
      <Input value={search} onChangeText={setSearch} placeholder="Search your experiences, lessons, ideas…" returnKeyType="search" clearButtonMode="while-editing" accessibilityLabel="Search Proof Bank" />
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ gap: space.sm }}
        data={[
          { key: "pinned", label: "Pinned", selected: pinnedOnly, onPress: () => setPinnedOnly(!pinnedOnly) },
          ...PROOF_KINDS.map((k) => ({ key: k.id, label: k.label, selected: kind === k.id, onPress: () => setKind(kind === k.id ? null : k.id) })),
          ...(pillars.data ?? []).map((p) => ({ key: p.id, label: `# ${p.name}`, selected: pillarId === p.id, onPress: () => setPillarId(pillarId === p.id ? null : p.id) })),
        ]}
        keyExtractor={(i) => i.key}
        renderItem={({ item }) => <Chip label={item.label} selected={item.selected} onPress={item.onPress} />}
      />
      {list.isLoading ? (
        <Loading />
      ) : list.error ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : (
        <FlatList
          data={list.data}
          keyExtractor={(e) => e.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: space.md, paddingBottom: space.huge }}
          refreshing={list.isRefetching}
          onRefresh={() => list.refetch()}
          ListEmptyComponent={
            search || kind || pillarId || pinnedOnly ? (
              <EmptyState icon="search-outline" title="No matches" body="Try a different word or clear your filters." />
            ) : (
              <EmptyState icon="archive-outline" title="Your Proof Bank is empty" body="Capture a lesson, story, opinion or win. It stays private and becomes raw material for authentic content." action="Capture something" onAction={() => router.push("/proof/new")} />
            )
          }
          renderItem={({ item }) => <ProofCard e={item} pillarName={pillars.data?.find((p) => p.id === item.pillar_id)?.name} />}
        />
      )}
    </View>
  );
}

function ProofCard({ e, pillarName }: { e: ProofEntry; pillarName?: string }) {
  const kind = PROOF_KINDS.find((k) => k.id === e.kind);
  return (
    <Card onPress={() => router.push(`/proof/${e.id}`)} accessibilityLabel={`${kind?.label}: ${e.title ?? e.body ?? ""}`}>
      <Stack gap={6}>
        <Row>
          <Ionicons name={(kind?.icon ?? "document-text-outline") as never} size={16} color={colors.brandText} />
          <Text variant="caption" color={colors.muted} style={{ flex: 1 }}>
            {kind?.label} · {new Date(e.created_at).toLocaleDateString()}
          </Text>
          {e.pinned && <Ionicons name="pin" size={14} color={colors.brand} accessibilityLabel="Pinned" />}
        </Row>
        {e.title && <Text variant="bodyStrong">{e.title}</Text>}
        {(e.body || e.transcript) && (
          <Text variant="small" color={colors.inkSoft} numberOfLines={3}>
            {e.body || e.transcript}
          </Text>
        )}
        <Row gap={6} style={{ flexWrap: "wrap" }}>
          {pillarName && <Badge label={pillarName} tone="brand" />}
          {e.used_count > 0 && <Badge label={`Used in ${e.used_count} post${e.used_count > 1 ? "s" : ""}`} tone="success" />}
          {e.classification_status === "pending" && <Badge label="Organising…" />}
        </Row>
      </Stack>
    </Card>
  );
}
