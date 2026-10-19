import { passwordSchema } from "@tapkit/core";
import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { Field, Input } from "@/components/forms";
import { Screen } from "@/components/Screen";
import { Notice } from "@/components/states";
import { Button, Card, SectionHeader, Stack, Text } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useProfile, useUpdateProfile } from "@/lib/queries";
import { colors, space } from "@/theme/tokens";

export default function Account() {
  const { updatePassword, deleteAccount } = useAuth();
  const profile = useProfile();
  const update = useUpdateProfile();
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string }>();
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (profile.data) {
      setName(profile.data.display_name ?? "");
      setHandle(profile.data.handle ?? "");
    }
  }, [profile.data]);

  const saveProfile = () =>
    update.mutate(
      { display_name: name.trim().slice(0, 80), handle: handle.trim() ? (handle.trim().startsWith("@") ? handle.trim() : `@${handle.trim()}`).slice(0, 40) : null },
      { onSuccess: () => setMsg({ tone: "success", text: "Profile saved." }), onError: (e) => setMsg({ tone: "danger", text: (e as Error).message }) },
    );

  const changePassword = async () => {
    const p = passwordSchema.safeParse(password);
    if (!p.success) return setMsg({ tone: "danger", text: p.error.issues[0]!.message });
    try {
      await updatePassword(password);
      setPassword("");
      setMsg({ tone: "success", text: "Password updated." });
    } catch (e) {
      setMsg({ tone: "danger", text: (e as Error).message });
    }
  };

  const doDelete = () => {
    if (confirm !== "DELETE") return setMsg({ tone: "danger", text: 'Type DELETE to confirm.' });
    Alert.alert("Delete your account permanently?", "This deletes your brand, Proof Bank, content, results, portfolio and recordings. It can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete forever",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteAccount();
          } catch (e) {
            setMsg({ tone: "danger", text: (e as Error).message });
            setDeleting(false);
          }
        },
      },
    ]);
  };

  return (
    <Screen edges={["bottom"]}>
      {msg && <Notice tone={msg.tone} title={msg.text} />}
      <SectionHeader title="Profile" />
      <Field label="Name">
        <Input value={name} onChangeText={setName} maxLength={80} />
      </Field>
      <Field label="Social handle" optional hint="Shown in the footer of your exported slides.">
        <Input value={handle} onChangeText={setHandle} autoCapitalize="none" maxLength={40} placeholder="@yourname" />
      </Field>
      <Button title="Save profile" variant="secondary" loading={update.isPending} onPress={saveProfile} />

      <SectionHeader title="Password" />
      <Field label="New password" hint="At least 8 characters, with a letter and a number.">
        <Input value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
      </Field>
      <Button title="Update password" variant="secondary" onPress={changePassword} />

      <SectionHeader title="Delete account" />
      <Card tone="muted">
        <Stack gap={space.sm}>
          <Text variant="small" color={colors.inkSoft}>
            Permanently deletes your account and all associated data. If you have an App Store subscription, cancel it in iOS Settings → Apple ID → Subscriptions — Apple doesn't let apps cancel it for you.
          </Text>
          <Input value={confirm} onChangeText={setConfirm} autoCapitalize="characters" placeholder="Type DELETE" accessibilityLabel="Type DELETE to confirm" />
          <Button title="Delete my account" variant="danger" loading={deleting} onPress={doDelete} />
        </Stack>
      </Card>
    </Screen>
  );
}
