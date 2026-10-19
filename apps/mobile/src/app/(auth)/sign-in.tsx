import { fieldErrors, signInSchema } from "@tapkit/core";
import { Link, router } from "expo-router";
import { useState } from "react";
import { Field, Input } from "@/components/forms";
import { Screen } from "@/components/Screen";
import { Notice } from "@/components/states";
import { Button, Text } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { colors } from "@/theme/tokens";

export default function SignIn() {
  const { signIn, sessionExpired } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setBusy(true);
    try {
      await signIn(parsed.data.email, parsed.data.password);
      router.replace("/(tabs)/home");
    } catch (e) {
      setErrors({ _form: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Welcome back" subtitle="Sign in to continue building your brand." edges={[]}>
      {sessionExpired && <Notice tone="warning" title="Your session expired" body="Please sign in again. Your work is saved." />}
      {errors._form && <Notice tone="danger" title={errors._form} />}
      <Field label="Email" error={errors.email}>
        <Input value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" placeholder="you@example.com" invalid={!!errors.email} accessibilityLabel="Email" />
      </Field>
      <Field label="Password" error={errors.password}>
        <Input value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" placeholder="Your password" onSubmitEditing={submit} invalid={!!errors.password} accessibilityLabel="Password" />
      </Field>
      <Button title="Sign in" size="lg" loading={busy} onPress={submit} />
      <Link href="/(auth)/forgot-password" style={{ alignSelf: "center" }}>
        <Text variant="smallStrong" color={colors.brandText}>
          Forgot your password?
        </Text>
      </Link>
      <Link href="/(auth)/sign-up" replace style={{ alignSelf: "center" }}>
        <Text variant="small" color={colors.muted}>
          New to TapKit? <Text variant="smallStrong" color={colors.brandText}>Create an account</Text>
        </Text>
      </Link>
    </Screen>
  );
}
