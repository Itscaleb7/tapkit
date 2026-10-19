import NetInfo from "@react-native-community/netinfo";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppState } from "react-native";
import { ai } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { flushOutbox } from "@/lib/outbox";

/** Syncs offline Proof Bank captures when the app is active and online. */
export function OutboxSync() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const uid = session?.user.id;
  useEffect(() => {
    if (!uid) return;
    let running = false;
    const run = async () => {
      if (running) return;
      running = true;
      try {
        const ids = await flushOutbox(uid);
        if (ids.length) {
          qc.invalidateQueries({ queryKey: ["proof"] });
          qc.invalidateQueries({ queryKey: ["home"] });
          for (const id of ids) ai("classify_proof", { entry_id: id }).catch(() => undefined);
        }
      } finally {
        running = false;
      }
    };
    run();
    const net = NetInfo.addEventListener((s) => s.isConnected && run());
    const app = AppState.addEventListener("change", (s) => s === "active" && run());
    return () => {
      net();
      app.remove();
    };
  }, [uid, qc]);
  return null;
}
