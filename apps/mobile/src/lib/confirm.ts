import { Alert, Platform } from "react-native";

/** Cross-platform confirmation dialog (native Alert on iOS, window.confirm on web). */
export function confirm(opts: { title: string; message?: string; confirmText: string; destructive?: boolean }): Promise<boolean> {
  if (Platform.OS === "web") {
    return Promise.resolve(typeof window !== "undefined" && window.confirm([opts.title, opts.message].filter(Boolean).join("\n\n")));
  }
  return new Promise((resolve) =>
    Alert.alert(opts.title, opts.message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: opts.confirmText, style: opts.destructive ? "destructive" : "default", onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) }),
  );
}

/** Cross-platform simple message. */
export function notify(title: string, message?: string) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.alert([title, message].filter(Boolean).join("\n\n"));
    return;
  }
  Alert.alert(title, message);
}

type AlertButton = { text?: string; style?: "default" | "cancel" | "destructive"; onPress?: () => void };

/** Drop-in for Alert.alert that also works on web (confirm/alert dialogs). */
export function alert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== "web") return Alert.alert(title, message, buttons);
  const action = buttons?.find((b) => b.style !== "cancel");
  if (!buttons || buttons.length <= 1 || !action) {
    notify(title, message);
    action?.onPress?.();
    return;
  }
  if (typeof window !== "undefined" && window.confirm([title, message].filter(Boolean).join("\n\n"))) action.onPress?.();
}
