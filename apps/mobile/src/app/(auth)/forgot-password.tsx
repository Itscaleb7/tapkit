import { emailSchema } from "@tapkit/core";
import { useState } from "react";
import { Field, Input } from "@/components/forms";
import { Screen } from "@/components/Screen";
import { Notice } from "@/components/states";
import { Button } from "@/components/ui";
import { useAuth } from "@/lib/auth";

export default function ForgotPassword() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) return setError("Enter a valid email address");
    setBusy(true);
    setError(undefined);
    try {
      await sendPasswordReset(parsed.data);
      setSent(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen title="Reset your password" subtitle="We'll email you a link to choose a new one." edges={[]}>
      {sent ? (
        <Notice tone="success" title="Check your inbox" body="If an account exists for that email, a reset link is on its way. Open it on this device." />
      ) : (
        <>
          <Field label="Email" error={error}>
            <Input value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="you@example.com" onSubmitEditing={submit} accessibilityLabel="Email" />
          </Field>
          <Button title="Send reset link" size="lg" loading={busy} onPress={submit} />
        </>
      )}
    </Screen>
  );
}
