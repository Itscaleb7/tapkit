import { pillarInputSchema } from "@tapkit/core";
import { useState } from "react";
import { View } from "react-native";
import { Field, Input, TagInput } from "@/components/forms";
import { Screen } from "@/components/Screen";
import { ErrorState, Loading, Notice } from "@/components/states";
import { Badge, Button, Card, IconButton, Row, Stack, Text } from "@/components/ui";
import { type Pillar, usePillars, useSavePillar } from "@/lib/queries";
import { colors, space } from "@/theme/tokens";
import { alert } from "@/lib/confirm";

export default function Pillars() {
  const pillars = usePillars();
  const save = useSavePillar();
  const [editing, setEditing] = useState<Partial<Pillar> | null>(null);
  const [error, setError] = useState<string>();

  if (pillars.isLoading) return <Loading />;
  if (pillars.error) return <ErrorState error={pillars.error} onRetry={() => pillars.refetch()} />;
  const list = pillars.data ?? [];

  const submit = () => {
    if (!editing) return;
    const parsed = pillarInputSchema.safeParse(editing);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message);
    save.mutate({ id: editing.id, ...parsed.data, position: editing.position ?? list.length }, { onSuccess: () => { setEditing(null); setError(undefined); }, onError: (e) => setError((e as Error).message) });
  };

  const move = (i: number, dir: -1 | 1) => {
    const a = list[i];
    const b = list[i + dir];
    if (!a || !b) return;
    save.mutate({ id: a.id, name: a.name, position: b.position });
    save.mutate({ id: b.id, name: b.name, position: a.position });
  };

  const remove = (p: Pillar) =>
    alert("Remove this pillar?", "Existing content keeps its link to it. You can add it back anytime.", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => save.mutate({ id: p.id, name: p.name, is_active: false }) },
    ]);

  return (
    <Screen edges={["bottom"]}>
      <Text color={colors.muted}>Pillars are the 3–5 themes you want to be known for. TapKit uses them to classify your Proof Bank and plan content.</Text>
      {list.length > 5 && <Notice tone="warning" title="That's a lot of pillars" body="Most strong personal brands focus on 3–5. Consider removing some." />}
      {list.map((p, i) => (
        <Card key={p.id}>
          <Row align="flex-start">
            <Badge label={String(i + 1)} tone="brand" />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="bodyStrong">{p.name}</Text>
              {p.description && (
                <Text variant="small" color={colors.muted}>
                  {p.description}
                </Text>
              )}
              {p.example_topics.length > 0 && (
                <Text variant="caption" color={colors.subtle}>
                  {p.example_topics.join(" · ")}
                </Text>
              )}
            </View>
            <View>
              <IconButton icon="chevron-up" label={`Move ${p.name} up`} onPress={() => move(i, -1)} size={18} />
              <IconButton icon="chevron-down" label={`Move ${p.name} down`} onPress={() => move(i, 1)} size={18} />
            </View>
          </Row>
          <Row style={{ marginTop: space.sm }}>
            <Button title="Edit" size="sm" variant="secondary" onPress={() => setEditing(p)} />
            <Button title="Remove" size="sm" variant="ghost" onPress={() => remove(p)} />
          </Row>
        </Card>
      ))}
      {editing ? (
        <Card tone="brand">
          <Stack>
            <Text variant="subheading">{editing.id ? "Edit pillar" : "New pillar"}</Text>
            {error && <Notice tone="danger" title={error} />}
            <Field label="Name">
              <Input value={editing.name ?? ""} onChangeText={(t) => setEditing({ ...editing, name: t })} maxLength={60} placeholder="e.g. Lessons from freelancing" />
            </Field>
            <Field label="Description" optional>
              <Input value={editing.description ?? ""} onChangeText={(t) => setEditing({ ...editing, description: t })} multiline multilineHeight={70} maxLength={300} />
            </Field>
            <Field label="Example topics" optional>
              <TagInput value={editing.example_topics ?? []} onChange={(v) => setEditing({ ...editing, example_topics: v })} max={8} />
            </Field>
            <Row gap={space.sm}>
              <Button title="Cancel" variant="secondary" style={{ flex: 1 }} onPress={() => setEditing(null)} />
              <Button title="Save" style={{ flex: 2 }} loading={save.isPending} onPress={submit} />
            </Row>
          </Stack>
        </Card>
      ) : (
        <Button title="Add a pillar" icon="add" variant="secondary" onPress={() => setEditing({ name: "", example_topics: [] })} />
      )}
    </Screen>
  );
}
