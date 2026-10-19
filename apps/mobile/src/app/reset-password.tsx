import { passwordSchema } from "@tapkit/core";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Field, Input } from "@/components/forms";
import { Screen } from "@/components/Screen";
import { Notice } from "@/components/states";
import { Button } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

/** Opened from the password-reset email (tapkit://reset-password#access_token=…). */
export default function ResetPassword() {
  const { updatePassword, session } = useAuth();
  const url = Linking.useLinkingURL();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!url) return;
    const fragment = url.split("#")[1] ?? url.split("?")[1] ?? "";
    const params = new URLSearchParams(fragment);
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    const code = params.get("code");
    if (access_token && refresh_token) supabase.auth.setSession({ access_token, refresh_token }).catch((e) => setError(e.message));
    else if (code) supabase.auth.exchangeCodeForSession(code).catch((e) => setError(e.message));
  }, [url]);

  const submit = async () => {
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message);
    setBusy(true);
    try {
      await updatePassword(parsed.data);
      router.replace("/(tabs)/home");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Choose a new password" edges={[]}>
      {!session && <Notice tone="info" title="Open the reset link from your email on this device to continue." />}
      <Field label="New password" hint="At least 8 characters, with a letter and a number." error={error}>
        <Input value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" accessibilityLabel="New password" />
      </Field>
      <Button title="Update password" size="lg" disabled={!session} loading={busy} onPress={submit} />
    </Screen>
  );
}
