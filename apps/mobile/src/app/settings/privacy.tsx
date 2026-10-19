import { File, Paths } from "expo-file-system";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Screen } from "@/components/Screen";
import { Notice } from "@/components/states";
import { Button, Card, Stack, Text } from "@/components/ui";
import { invoke } from "@/lib/api";
import { legalUrls } from "@/lib/config";
import { shareFile } from "@/lib/exportCarousel";
import { colors, space } from "@/theme/tokens";

const POINTS = [
  ["Private by default", "Your Proof Bank, drafts, results, experiments and pipeline are visible only to you."],
  ["Public only when you choose", "Your portfolio shows only the fields and items you publish. You can unpublish anytime."],
  ["AI processing", "To generate suggestions, the relevant parts of your brand and selected entries are sent to our AI provider. This happens under the provider's commercial API terms (see our Privacy Policy). TapKit sends only what each request needs — never your full history."],
  ["No selling of data", "TapKit doesn't sell your data or use third-party advertising trackers."],
] as const;

export default function Privacy() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const exportData = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const data = await invoke<unknown>("account-export", {});
      const file = new File(Paths.cache, `tapkit-export-${new Date().toISOString().slice(0, 10)}.json`);
      if (file.exists) file.delete();
      file.create();
      await file.write(JSON.stringify(data, null, 2));
      await shareFile(file.uri, "application/json", "public.json");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen edges={["bottom"]}>
      {POINTS.map(([title, body]) => (
        <Card key={title}>
          <Stack gap={4}>
            <Text variant="bodyStrong">{title}</Text>
            <Text variant="small" color={colors.muted}>
              {body}
            </Text>
          </Stack>
        </Card>
      ))}
      {error && <Notice tone="danger" title={error} />}
      <Button title="Export my data (JSON)" icon="download-outline" variant="secondary" loading={busy} onPress={exportData} />
      <Button title="Read the Privacy Policy" variant="ghost" onPress={() => WebBrowser.openBrowserAsync(legalUrls.privacy)} />
      <Text variant="caption" color={colors.subtle} style={{ marginTop: space.sm }}>
        To delete everything, go to Settings → Account → Delete account.
      </Text>
    </Screen>
  );
}
