import { fieldErrors, signUpSchema } from "@tapkit/core";
import * as WebBrowser from "expo-web-browser";
import { Link, router } from "expo-router";
import { useState } from "react";
import { Field, Input } from "@/components/forms";
import { Screen } from "@/components/Screen";
import { Notice } from "@/components/states";
import { Button, Text } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { legalUrls } from "@/lib/config";
import { colors } from "@/theme/tokens";

export default function SignUp() {
  const { signUp } = useAuth();
  const [displayName, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  const submit = async () => {
    const parsed = signUpSchema.safeParse({ email, password, displayName });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setBusy(true);
    try {
      const { needsConfirmation } = await signUp(parsed.data.email, parsed.data.password, parsed.data.displayName);
      if (needsConfirmation) setConfirmSent(true);
      else router.replace("/onboarding");
    } catch (e) {
      setErrors({ _form: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  if (confirmSent) {
    return (
      <Screen title="Check your email" subtitle={`We sent a confirmation link to ${email}. Open it on this device to finish creating your account.`} edges={[]}>
        <Button title="Back to sign in" variant="secondary" onPress={() => router.replace("/(auth)/sign-in")} />
      </Screen>
    );
  }

  return (
    <Screen title="Create your account" subtitle="Free to start. No followers or experience needed." edges={[]}>
      {errors._form && <Notice tone="danger" title={errors._form} />}
      <Field label="Your name" error={errors.displayName}>
        <Input value={displayName} onChangeText={setName} autoComplete="name" textContentType="name" placeholder="Alex Rivera" invalid={!!errors.displayName} accessibilityLabel="Your name" />
      </Field>
      <Field label="Email" error={errors.email}>
        <Input value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" placeholder="you@example.com" invalid={!!errors.email} accessibilityLabel="Email" />
      </Field>
      <Field label="Password" hint="At least 8 characters, with a letter and a number." error={errors.password}>
        <Input value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" placeholder="Create a password" onSubmitEditing={submit} invalid={!!errors.password} accessibilityLabel="Password" />
      </Field>
      <Button title="Create account" size="lg" loading={busy} onPress={submit} />
      <Text variant="caption" color={colors.muted} center>
        By continuing you agree to the{" "}
        <Text variant="caption" color={colors.brandText} onPress={() => WebBrowser.openBrowserAsync(legalUrls.terms)}>
          Terms
        </Text>{" "}
        and{" "}
        <Text variant="caption" color={colors.brandText} onPress={() => WebBrowser.openBrowserAsync(legalUrls.privacy)}>
          Privacy Policy
        </Text>
        .
      </Text>
      <Link href="/(auth)/sign-in" replace style={{ alignSelf: "center" }}>
        <Text variant="small" color={colors.muted}>
          Already have an account? <Text variant="smallStrong" color={colors.brandText}>Sign in</Text>
        </Text>
      </Link>
    </Screen>
  );
}
