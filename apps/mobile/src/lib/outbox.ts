// Offline capture queue: Proof Bank entries written while offline are stored on
// the device and synced when connectivity returns, so a capture is never lost.
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { TablesInsert } from "@tapkit/core";
import { supabase } from "./supabase";

const KEY = "tapkit.outbox.v1";

interface Pending {
  localId: string;
  userId: string;
  createdAt: string;
  input: Omit<TablesInsert<"proof_entries">, "user_id">;
}

async function read(): Promise<Pending[]> {
  try {
    return JSON.parse((await AsyncStorage.getItem(KEY)) ?? "[]");
  } catch {
    return [];
  }
}

const write = (items: Pending[]) => AsyncStorage.setItem(KEY, JSON.stringify(items));

export async function enqueueCapture(userId: string, input: Pending["input"]) {
  const items = await read();
  items.push({ localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, userId, createdAt: new Date().toISOString(), input });
  await write(items);
}

export async function pendingCount(userId: string) {
  return (await read()).filter((i) => i.userId === userId).length;
}

/** Push queued captures for this user. Returns ids of entries created. */
export async function flushOutbox(userId: string): Promise<string[]> {
  const items = await read();
  const mine = items.filter((i) => i.userId === userId);
  if (!mine.length) return [];
  const created: string[] = [];
  const remaining = items.filter((i) => i.userId !== userId);
  for (const item of mine) {
    const { data, error } = await supabase
      .from("proof_entries")
      .insert({ tags: [], content_angles: [], ...item.input, user_id: userId, created_at: item.createdAt } as TablesInsert<"proof_entries">)
      .select("id")
      .single();
    if (error) {
      // Keep it for the next attempt unless the server rejected it permanently (validation / limit).
      if (/fetch|network/i.test(error.message)) remaining.push(item);
      continue;
    }
    created.push(data.id);
  }
  await write(remaining);
  return created;
}
