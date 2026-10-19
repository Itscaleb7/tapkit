import * as WebBrowser from "expo-web-browser";
import { Linking } from "react-native";
import { Screen } from "@/components/Screen";
import { Button, Card, Stack, Text } from "@/components/ui";
import { config, legalUrls } from "@/lib/config";
import { colors } from "@/theme/tokens";

const FAQ = [
  ["I have zero followers. Is TapKit for me?", "Yes. TapKit is built for people starting from zero. Your blueprint focuses on what you can do now — learning in public, documenting progress and sharing real lessons."],
  ["Will TapKit post for me?", "No. You export images and post them yourself. TapKit only marks content as published when you confirm it."],
  ["Where do my analytics come from?", "You enter results from your platform's insights. TapKit never estimates or invents numbers."],
  ["Does the AI make things up about me?", "TapKit is instructed to use only what you've told it. Anything it can't know is left as a [placeholder] or labelled a hypothesis. Always review before publishing."],
  ["How do I cancel Pro?", "In iOS Settings → your name → Subscriptions → TapKit. You keep Pro until the end of the paid period."],
] as const;

export default function Help() {
  return (
    <Screen edges={["bottom"]}>
      {FAQ.map(([q, a]) => (
        <Card key={q}>
          <Stack gap={4}>
            <Text variant="bodyStrong">{q}</Text>
            <Text variant="small" color={colors.muted}>
              {a}
            </Text>
          </Stack>
        </Card>
      ))}
      <Button title="Email support" icon="mail-outline" variant="secondary" onPress={() => Linking.openURL(`mailto:${config.supportEmail}?subject=TapKit%20support`)} />
      <Button title="Support website" variant="ghost" onPress={() => WebBrowser.openBrowserAsync(legalUrls.support)} />
    </Screen>
  );
}
